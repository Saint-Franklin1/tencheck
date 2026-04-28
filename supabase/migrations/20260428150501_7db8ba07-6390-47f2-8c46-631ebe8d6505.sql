
-- ========== 1. Schema additions ==========

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS total_units integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS occupied_units integer NOT NULL DEFAULT 0;

ALTER TABLE public.property_applications
  ADD COLUMN IF NOT EXISTS apply_source text NOT NULL DEFAULT 'direct';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

-- Backfill account_status from existing flags
UPDATE public.profiles
SET account_status = CASE
  WHEN deletion_status = 'deleted' THEN 'deleted'
  WHEN is_suspended = true THEN 'suspended'
  ELSE 'active'
END
WHERE account_status = 'active';

ALTER TABLE public.rent_transactions
  ADD COLUMN IF NOT EXISTS tenancy_id uuid;

ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS tenancy_id uuid,
  ADD COLUMN IF NOT EXISTS application_id uuid;

-- ========== 2. Verification queue ==========

CREATE TABLE IF NOT EXISTS public.verification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.verification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own queue row" ON public.verification_queue;
CREATE POLICY "Users can view own queue row" ON public.verification_queue
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can submit own queue row" ON public.verification_queue;
CREATE POLICY "Users can submit own queue row" ON public.verification_queue
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view queue" ON public.verification_queue;
CREATE POLICY "Admins can view queue" ON public.verification_queue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update queue" ON public.verification_queue;
CREATE POLICY "Admins can update queue" ON public.verification_queue
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== 3. Helper: find or create thread ==========

CREATE OR REPLACE FUNCTION public.find_or_create_property_thread(
  _tenant_id uuid, _landlord_id uuid, _property_id uuid, _application_id uuid DEFAULT NULL, _tenancy_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _thread_id uuid;
BEGIN
  SELECT id INTO _thread_id FROM public.threads
  WHERE tenant_id = _tenant_id AND landlord_id = _landlord_id AND property_id = _property_id
  ORDER BY created_at LIMIT 1;

  IF _thread_id IS NULL THEN
    INSERT INTO public.threads (tenant_id, landlord_id, property_id, application_id, tenancy_id, thread_type, subject)
    VALUES (_tenant_id, _landlord_id, _property_id, _application_id, _tenancy_id, 'application', 'Property Inquiry')
    RETURNING id INTO _thread_id;

    INSERT INTO public.thread_participants (thread_id, user_id, role) VALUES
      (_thread_id, _tenant_id, 'tenant'),
      (_thread_id, _landlord_id, 'landlord')
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.threads
    SET application_id = COALESCE(application_id, _application_id),
        tenancy_id = COALESCE(tenancy_id, _tenancy_id)
    WHERE id = _thread_id;
  END IF;

  RETURN _thread_id;
END;
$$;

-- ========== 4. Auto-apply RPC ==========

CREATE OR REPLACE FUNCTION public.auto_apply_property(
  _property_id uuid, _message text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid := auth.uid();
  _landlord_id uuid;
  _total int; _occ int; _rent int;
  _app_id uuid; _ten_id uuid; _thread_id uuid;
  _status text;
  _account text;
BEGIN
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT account_status INTO _account FROM public.profiles WHERE user_id = _tenant_id;
  IF _account != 'active' THEN RAISE EXCEPTION 'Account not active'; END IF;

  SELECT landlord_id, COALESCE(total_units,1), COALESCE(occupied_units,0), rent_amount
    INTO _landlord_id, _total, _occ, _rent
  FROM public.properties WHERE id = _property_id;

  IF _landlord_id IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;

  -- Prevent duplicate active application
  SELECT id, application_status INTO _app_id, _status
  FROM public.property_applications
  WHERE property_id = _property_id AND tenant_id = _tenant_id
    AND application_status IN ('pending','approved','auto_approved')
  LIMIT 1;

  IF _app_id IS NOT NULL THEN
    _thread_id := public.find_or_create_property_thread(_tenant_id, _landlord_id, _property_id, _app_id);
    RETURN jsonb_build_object('status', _status, 'application_id', _app_id, 'thread_id', _thread_id, 'duplicate', true);
  END IF;

  IF _occ < _total THEN
    INSERT INTO public.property_applications (property_id, tenant_id, landlord_id, application_status, message, apply_source)
    VALUES (_property_id, _tenant_id, _landlord_id, 'auto_approved', _message, 'direct')
    RETURNING id INTO _app_id;

    INSERT INTO public.tenancy_records (tenant_id, landlord_id, property_id, monthly_rent, tenancy_status, verification_status, lease_start_date)
    VALUES (_tenant_id, _landlord_id, _property_id, COALESCE(_rent,0), 'active', 'verified', CURRENT_DATE)
    RETURNING id INTO _ten_id;

    UPDATE public.properties
    SET occupied_units = COALESCE(occupied_units,0) + 1,
        is_available = (COALESCE(occupied_units,0) + 1) < COALESCE(total_units,1)
    WHERE id = _property_id;

    UPDATE public.profiles
    SET tenant_verification_status = 'landlord_verified'
    WHERE user_id = _tenant_id AND tenant_verification_status = 'unverified';

    _status := 'auto_approved';
  ELSE
    INSERT INTO public.property_applications (property_id, tenant_id, landlord_id, application_status, message, apply_source)
    VALUES (_property_id, _tenant_id, _landlord_id, 'pending', _message, 'direct')
    RETURNING id INTO _app_id;
    _status := 'pending';
  END IF;

  _thread_id := public.find_or_create_property_thread(_tenant_id, _landlord_id, _property_id, _app_id, _ten_id);

  INSERT INTO public.messages (thread_id, sender_id, receiver_id, content, message_type, related_entity_type, related_entity_id)
  VALUES (_thread_id, _landlord_id, _tenant_id,
    CASE WHEN _status = 'auto_approved'
      THEN 'Welcome! Your application was auto-approved — you''re now an active tenant.'
      ELSE 'Welcome, your application has been received. The landlord will review it shortly.'
    END,
    'system', 'property_application', _app_id);

  INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
  VALUES (_landlord_id,
    CASE WHEN _status = 'auto_approved' THEN 'New Tenant (Auto-approved)' ELSE 'New Tenant Application' END,
    'A tenant has applied to your property.', 'application', 'property_application', _app_id);

  RETURN jsonb_build_object('status', _status, 'application_id', _app_id, 'tenancy_id', _ten_id, 'thread_id', _thread_id);
END;
$$;

-- ========== 5. Update approval trigger ==========

CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rent integer; _ten_id uuid; _thread_id uuid;
BEGIN
  IF NEW.application_status = 'approved' AND OLD.application_status = 'pending' THEN
    SELECT rent_amount INTO _rent FROM public.properties WHERE id = NEW.property_id;

    INSERT INTO public.tenancy_records (tenant_id, landlord_id, property_id, monthly_rent, tenancy_status, verification_status, lease_start_date)
    VALUES (NEW.tenant_id, NEW.landlord_id, NEW.property_id, COALESCE(_rent,0), 'active', 'verified', CURRENT_DATE)
    RETURNING id INTO _ten_id;

    UPDATE public.properties
    SET occupied_units = COALESCE(occupied_units,0) + 1,
        is_available = (COALESCE(occupied_units,0) + 1) < COALESCE(total_units,1)
    WHERE id = NEW.property_id;

    UPDATE public.profiles
    SET tenant_verification_status = 'landlord_verified'
    WHERE user_id = NEW.tenant_id AND tenant_verification_status = 'unverified';

    _thread_id := public.find_or_create_property_thread(NEW.tenant_id, NEW.landlord_id, NEW.property_id, NEW.id, _ten_id);

    INSERT INTO public.messages (thread_id, sender_id, receiver_id, content, message_type, related_entity_type, related_entity_id)
    VALUES (_thread_id, NEW.landlord_id, NEW.tenant_id,
      'Your application has been approved. Welcome!', 'system', 'property_application', NEW.id);

    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (NEW.tenant_id, 'Application Approved!',
      'Your application has been approved. A tenancy record has been created.',
      'application', 'property_application', NEW.id);
  ELSIF NEW.application_status = 'rejected' AND OLD.application_status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (NEW.tenant_id, 'Application Update',
      'Your property application was not approved at this time.',
      'application', 'property_application', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_application_approval ON public.property_applications;
CREATE TRIGGER trg_application_approval
AFTER UPDATE ON public.property_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_application_approval();

-- ========== 6. Tenancy payment RPCs ==========

CREATE OR REPLACE FUNCTION public.record_tenancy_payment(
  _tenancy_id uuid, _amount integer, _method text DEFAULT 'mpesa', _code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tenant uuid; _landlord uuid; _property uuid;
  _txn_id uuid; _thread_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  SELECT tenant_id, landlord_id, property_id INTO _tenant, _landlord, _property
  FROM public.tenancy_records WHERE id = _tenancy_id;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'Tenancy not found'; END IF;
  IF _tenant != _uid THEN RAISE EXCEPTION 'Not your tenancy'; END IF;

  INSERT INTO public.rent_transactions
    (tenant_id, landlord_id, property_id, tenancy_id, amount, payment_method, mpesa_transaction_code, verification_status, payment_date)
  VALUES (_tenant, _landlord, _property, _tenancy_id, _amount, _method, _code, 'pending', CURRENT_DATE)
  RETURNING id INTO _txn_id;

  _thread_id := public.find_or_create_property_thread(_tenant, _landlord, _property, NULL, _tenancy_id);

  INSERT INTO public.messages (thread_id, sender_id, receiver_id, content, message_type, related_entity_type, related_entity_id)
  VALUES (_thread_id, _tenant, _landlord,
    'Tenant reported payment of KES ' || _amount || COALESCE(' (Code: ' || _code || ')', ''),
    'system', 'rent_transaction', _txn_id);

  INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
  VALUES (_landlord, 'Payment Reported', 'Tenant reported a rent payment awaiting your confirmation.',
    'payment', 'rent_transaction', _txn_id);

  RETURN jsonb_build_object('transaction_id', _txn_id, 'thread_id', _thread_id, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_tenancy_payment(_txn_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tenant uuid; _landlord uuid; _property uuid; _thread_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT tenant_id, landlord_id, property_id INTO _tenant, _landlord, _property
  FROM public.rent_transactions WHERE id = _txn_id;
  IF _landlord IS NULL THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF _landlord != _uid AND NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Only landlord can confirm';
  END IF;

  UPDATE public.rent_transactions SET verification_status = 'confirmed' WHERE id = _txn_id;

  _thread_id := public.find_or_create_property_thread(_tenant, _landlord, _property);
  INSERT INTO public.messages (thread_id, sender_id, receiver_id, content, message_type, related_entity_type, related_entity_id)
  VALUES (_thread_id, _landlord, _tenant, 'Payment confirmed. Thank you!', 'system', 'rent_transaction', _txn_id);

  INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
  VALUES (_tenant, 'Payment Confirmed', 'Your landlord confirmed your rent payment.',
    'payment', 'rent_transaction', _txn_id);

  PERFORM public.calculate_tenant_score(_tenant);
  RETURN jsonb_build_object('status','confirmed');
END;
$$;

-- ========== 7. Simplified credit score ==========

CREATE OR REPLACE FUNCTION public.calculate_tenant_score(_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _total int; _confirmed int; _on_time int; _score int; _conf text; _sources int;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != _tenant_id AND NOT public.has_role(auth.uid(),'admin') THEN
    -- Allow landlords with active tenancy to read indirectly (no error here, this is write path)
    NULL;
  END IF;

  SELECT COUNT(*) INTO _total FROM public.rent_transactions WHERE tenant_id = _tenant_id;
  SELECT COUNT(*) INTO _confirmed FROM public.rent_transactions
    WHERE tenant_id = _tenant_id AND verification_status = 'confirmed';
  SELECT COUNT(*) INTO _on_time FROM public.rent_transactions
    WHERE tenant_id = _tenant_id AND verification_status = 'confirmed'
      AND EXTRACT(DAY FROM payment_date) <= 5;
  SELECT COUNT(DISTINCT landlord_id) INTO _sources FROM public.rent_transactions WHERE tenant_id = _tenant_id;

  IF _confirmed = 0 THEN _score := 50;
  ELSE _score := ROUND((_on_time::numeric / _confirmed) * 100); END IF;

  IF _sources >= 3 THEN _conf := 'high';
  ELSIF _sources >= 1 THEN _conf := 'medium';
  ELSE _conf := 'low'; END IF;

  INSERT INTO public.tenant_scores (tenant_id, score, total_payments, late_payments, missed_payments, verified_sms_payments, data_sources_count, confidence_level, last_updated)
  VALUES (_tenant_id, _score, _total, GREATEST(_confirmed - _on_time, 0), GREATEST(_total - _confirmed, 0), _confirmed, _sources, _conf, now())
  ON CONFLICT (tenant_id) DO UPDATE SET
    score = EXCLUDED.score, total_payments = EXCLUDED.total_payments,
    late_payments = EXCLUDED.late_payments, missed_payments = EXCLUDED.missed_payments,
    verified_sms_payments = EXCLUDED.verified_sms_payments,
    data_sources_count = EXCLUDED.data_sources_count, confidence_level = EXCLUDED.confidence_level,
    last_updated = now();

  RETURN _score;
END;
$$;

-- ========== 8. Account-status sync trigger ==========

CREATE OR REPLACE FUNCTION public.sync_account_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.account_status = 'deleted' THEN
    NEW.deletion_status := 'deleted';
    NEW.is_suspended := true;
    UPDATE public.properties SET is_available = false WHERE landlord_id = NEW.user_id;
  ELSIF NEW.account_status = 'suspended' THEN
    NEW.is_suspended := true;
  ELSIF NEW.account_status = 'active' THEN
    NEW.is_suspended := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_account_status ON public.profiles;
CREATE TRIGGER trg_sync_account_status
BEFORE UPDATE OF account_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_account_status();

-- ========== 9. Indexes ==========

CREATE INDEX IF NOT EXISTS idx_threads_property ON public.threads(property_id);
CREATE INDEX IF NOT EXISTS idx_threads_tenancy ON public.threads(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_rent_txn_tenancy ON public.rent_transactions(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_apps_property_tenant ON public.property_applications(property_id, tenant_id);
