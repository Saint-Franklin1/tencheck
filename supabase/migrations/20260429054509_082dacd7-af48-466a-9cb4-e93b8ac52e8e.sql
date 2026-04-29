-- 1. Idempotent profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role text;
BEGIN
  _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'tenant');
  IF _role NOT IN ('tenant', 'landlord', 'service_worker') THEN
    _role := 'tenant';
  END IF;

  INSERT INTO public.profiles (user_id, name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    _role
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        name  = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name);

  RETURN NEW;
END;
$$;

-- 2. Drop duplicate triggers
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
DROP TRIGGER IF EXISTS trigger_notify_on_message ON public.messages;
-- keep trg_notify_on_new_message

DROP TRIGGER IF EXISTS trg_handle_application_approval ON public.property_applications;
-- keep trg_application_approval

-- 3. Application link access: restrict broad public SELECT, expose a safe RPC
DROP POLICY IF EXISTS "Anyone can view links by token" ON public.application_links;

CREATE OR REPLACE FUNCTION public.get_application_link_by_token(_token text)
RETURNS TABLE (
  id uuid,
  property_id uuid,
  landlord_id uuid,
  unique_token text,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, property_id, landlord_id, unique_token, expires_at, created_at
  FROM public.application_links
  WHERE unique_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_application_link_by_token(text) TO anon, authenticated;

-- 4. Worker endorsements: require auth to read
DROP POLICY IF EXISTS "Anyone can view endorsements" ON public.worker_endorsements;
CREATE POLICY "Authenticated can view endorsements"
  ON public.worker_endorsements
  FOR SELECT
  TO authenticated
  USING (true);
