-- ============================================
-- TENCHECK FULL SCHEMA MIGRATION
-- Run this in your new Supabase project's SQL Editor
-- Project: rrcxzksvwqxfzjtnojmz
-- ============================================

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- CORE TABLES
-- ============================================

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'landlord', 'service_worker')),
  avatar_url TEXT,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  deletion_requested_at TIMESTAMPTZ,
  deletion_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table (for admin roles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  national_id TEXT UNIQUE,
  phone TEXT,
  full_name TEXT,
  date_of_birth DATE,
  profile_photo_url TEXT,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verified_at TIMESTAMPTZ,
  identity_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Landlords table
CREATE TABLE public.landlords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  property_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  rent_amount INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  images TEXT[] DEFAULT '{}',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inquiries table
CREATE TABLE public.inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental records table
CREATE TABLE public.rental_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  rent_amount INTEGER NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'late', 'missed', 'pending')),
  payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment evidence table
CREATE TABLE public.payment_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_code TEXT,
  amount INTEGER,
  receiver_name TEXT,
  payment_date DATE,
  evidence_type TEXT NOT NULL DEFAULT 'sms' CHECK (evidence_type IN ('sms', 'screenshot')),
  raw_text TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tenant scores table
CREATE TABLE public.tenant_scores (
  tenant_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 100 CHECK (score >= 0 AND score <= 100),
  total_payments INTEGER NOT NULL DEFAULT 0,
  late_payments INTEGER NOT NULL DEFAULT 0,
  missed_payments INTEGER NOT NULL DEFAULT 0,
  verified_sms_payments INTEGER NOT NULL DEFAULT 0,
  data_sources_count INTEGER NOT NULL DEFAULT 0,
  confidence_level TEXT NOT NULL DEFAULT 'low',
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- SERVICE WORKERS TABLES
-- ============================================

CREATE TABLE public.service_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  service_category TEXT NOT NULL,
  experience_years INTEGER DEFAULT 0,
  landlord_endorser_id UUID,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  is_available BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(2,1) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  service_category TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  worker_id UUID,
  scheduled_date DATE,
  rating INTEGER,
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.worker_endorsements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES public.service_workers(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  endorsement_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.service_worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  service_category TEXT NOT NULL,
  description TEXT,
  years_experience INTEGER DEFAULT 0,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  identity_document_url TEXT,
  phone_verified BOOLEAN DEFAULT false,
  landlord_endorsements_count INTEGER DEFAULT 0,
  rating_score NUMERIC DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  visibility_status TEXT NOT NULL DEFAULT 'hidden',
  availability_status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.worker_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- DISPUTES & RISK TABLES
-- ============================================

CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  rental_record_id UUID REFERENCES public.rental_records(id) ON DELETE CASCADE,
  dispute_reason TEXT NOT NULL,
  evidence_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  landlord_id UUID,
  property_id UUID,
  dispute_type TEXT NOT NULL DEFAULT 'payment',
  resolution_status TEXT NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 50,
  risk_category TEXT NOT NULL DEFAULT 'medium',
  late_payments_count INTEGER NOT NULL DEFAULT 0,
  missed_payments_count INTEGER NOT NULL DEFAULT 0,
  verified_payments_count INTEGER NOT NULL DEFAULT 0,
  disputes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tenant_risk_tenant_id_idx ON public.tenant_risk(tenant_id);

CREATE TABLE public.property_demand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_county TEXT NOT NULL,
  location_city TEXT NOT NULL,
  total_searches INTEGER NOT NULL DEFAULT 0,
  average_rent INTEGER NOT NULL DEFAULT 0,
  vacancy_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX property_demand_location_idx ON public.property_demand(location_county, location_city);

CREATE TABLE public.trust_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  relation_type TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- FINANCIAL TABLES
-- ============================================

CREATE TABLE public.rent_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id),
  landlord_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  mpesa_transaction_code TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_credit_passport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  credit_score INTEGER NOT NULL DEFAULT 50,
  confidence_level TEXT NOT NULL DEFAULT 'low',
  total_verified_rent_payments INTEGER NOT NULL DEFAULT 0,
  late_payments_count INTEGER NOT NULL DEFAULT 0,
  missed_payments_count INTEGER NOT NULL DEFAULT 0,
  total_service_requests_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.financial_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  requested_amount INTEGER NOT NULL,
  max_allowed_amount INTEGER DEFAULT 0,
  purpose TEXT NOT NULL DEFAULT 'deposit',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- MESSAGING TABLES
-- ============================================

CREATE TABLE public.threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  landlord_id UUID,
  service_worker_id UUID,
  property_id UUID REFERENCES public.properties(id),
  subject TEXT DEFAULT '',
  thread_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.thread_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'tenant',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID,
  related_entity_type TEXT DEFAULT 'general',
  related_entity_id UUID,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.message_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID REFERENCES public.messages(id),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  notification_type TEXT NOT NULL DEFAULT 'new_message',
  related_entity_type TEXT,
  related_entity_id UUID,
  read_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- TENANCY & REVIEWS TABLES
-- ============================================

CREATE TABLE public.tenancy_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id),
  lease_start_date DATE,
  lease_end_date DATE,
  monthly_rent INTEGER NOT NULL DEFAULT 0,
  tenancy_status TEXT NOT NULL DEFAULT 'pending_verification',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.tenancy_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenancy_id UUID NOT NULL REFERENCES public.tenancy_records(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'tenant_reviewing_landlord',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.review_disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.tenancy_reviews(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL,
  reason TEXT NOT NULL,
  dispute_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.worker_complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  complaint_type TEXT NOT NULL DEFAULT 'quality',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- SERVICE CREDITS TABLES
-- ============================================

CREATE TABLE public.service_request_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  transaction_code TEXT,
  deposit_status TEXT NOT NULL DEFAULT 'held',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_service_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  credits_remaining INTEGER NOT NULL DEFAULT 3,
  last_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.service_credit_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits_purchased INTEGER NOT NULL DEFAULT 1,
  payment_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  transaction_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- LANDLORD PROFILES & VERIFICATION
-- ============================================

CREATE TABLE public.landlord_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  average_tenant_rating NUMERIC DEFAULT 0,
  verified_properties INTEGER DEFAULT 0,
  tenant_satisfaction_score NUMERIC DEFAULT 0,
  maintenance_responsiveness_score NUMERIC DEFAULT 0,
  complaint_count INTEGER DEFAULT 0,
  profile_visibility TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.landlord_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL,
  document_url TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'property_ownership',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ADMIN TABLES
-- ============================================

CREATE TABLE public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  related_user_id UUID,
  related_entity_id UUID,
  related_entity_type TEXT,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- APPLICATION LINKS & PROPERTY APPLICATIONS
-- ============================================

CREATE TABLE public.application_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  unique_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_application_links_token ON public.application_links(unique_token);

CREATE TABLE public.property_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  application_status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_demand ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_credit_passport ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancy_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_service_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_applications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- tenants
CREATE POLICY "Owner can view own tenant record" ON public.tenants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can view all tenants" ON public.tenants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own tenant record" ON public.tenants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tenant record" ON public.tenants FOR UPDATE USING (auth.uid() = user_id);

-- landlords
CREATE POLICY "Landlords viewable by authenticated users" ON public.landlords FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own landlord record" ON public.landlords FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own landlord record" ON public.landlords FOR UPDATE USING (auth.uid() = user_id);

-- properties
CREATE POLICY "Properties are viewable by everyone" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Landlords can create properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Landlords can update their own properties" ON public.properties FOR UPDATE USING (auth.uid() = landlord_id);
CREATE POLICY "Landlords can delete their own properties" ON public.properties FOR DELETE USING (auth.uid() = landlord_id);
CREATE POLICY "Admins can delete properties" ON public.properties FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- inquiries
CREATE POLICY "Tenants can view their own inquiries" ON public.inquiries FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Landlords can view inquiries for their properties" ON public.inquiries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.properties WHERE properties.id = inquiries.property_id AND properties.landlord_id = auth.uid())
);
CREATE POLICY "Tenants can create inquiries" ON public.inquiries FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Landlords can update inquiry status" ON public.inquiries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.properties WHERE properties.id = inquiries.property_id AND properties.landlord_id = auth.uid())
);

-- rental_records
CREATE POLICY "Tenants can view their own rental records" ON public.rental_records FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Landlords can view their rental records" ON public.rental_records FOR SELECT USING (auth.uid() = landlord_id);
CREATE POLICY "Landlords can create rental records" ON public.rental_records FOR INSERT WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Landlords can update rental records" ON public.rental_records FOR UPDATE USING (auth.uid() = landlord_id);

-- payment_evidence
CREATE POLICY "Tenants can view their own evidence" ON public.payment_evidence FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Tenants can submit evidence" ON public.payment_evidence FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Admins can view all evidence" ON public.payment_evidence FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update evidence" ON public.payment_evidence FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- tenant_scores
CREATE POLICY "Owner can view own scores" ON public.tenant_scores FOR SELECT TO authenticated USING (tenant_id = auth.uid());
CREATE POLICY "Admin can view all scores" ON public.tenant_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can upsert scores" ON public.tenant_scores FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "System can update scores" ON public.tenant_scores FOR UPDATE USING (auth.uid() = tenant_id);

-- service_workers
CREATE POLICY "Anyone can view verified workers" ON public.service_workers FOR SELECT USING (verification_status = 'verified');
CREATE POLICY "Authenticated users can create worker profiles" ON public.service_workers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Workers can update own profile" ON public.service_workers FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- service_requests
CREATE POLICY "Authenticated users can create requests" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can view their own requests" ON public.service_requests FOR SELECT TO authenticated USING (auth.uid() = requester_id);
CREATE POLICY "Anyone can view open requests" ON public.service_requests FOR SELECT USING (status = 'open');
CREATE POLICY "Workers can update assigned requests" ON public.service_requests FOR UPDATE TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "Workers can view assigned requests" ON public.service_requests FOR SELECT TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "Admins can view all service requests" ON public.service_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- worker_endorsements
CREATE POLICY "Anyone can view endorsements" ON public.worker_endorsements FOR SELECT USING (true);
CREATE POLICY "Landlords can create endorsements" ON public.worker_endorsements FOR INSERT TO authenticated WITH CHECK (auth.uid() = landlord_id);

-- service_worker_profiles
CREATE POLICY "Workers can view own profile" ON public.service_worker_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Workers can insert own profile" ON public.service_worker_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Workers can update own profile" ON public.service_worker_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public can view visible workers" ON public.service_worker_profiles FOR SELECT USING (visibility_status IN ('public', 'limited'));
CREATE POLICY "Admins can manage worker profiles" ON public.service_worker_profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- worker_reviews
CREATE POLICY "Anyone can view reviews" ON public.worker_reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated can create reviews" ON public.worker_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);

-- disputes
CREATE POLICY "Tenants can create disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Tenants can view own disputes" ON public.disputes FOR SELECT TO authenticated USING (auth.uid() = tenant_id);
CREATE POLICY "Admins can view all disputes" ON public.disputes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update disputes" ON public.disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- tenant_risk
CREATE POLICY "Owner can view own risk" ON public.tenant_risk FOR SELECT TO authenticated USING (tenant_id = auth.uid());
CREATE POLICY "Admin can view all risk" ON public.tenant_risk FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can upsert risk" ON public.tenant_risk FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "System can update risk" ON public.tenant_risk FOR UPDATE USING (auth.uid() = tenant_id);

-- property_demand
CREATE POLICY "Anyone can view demand" ON public.property_demand FOR SELECT USING (true);
CREATE POLICY "Admins can manage demand" ON public.property_demand FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- trust_network
CREATE POLICY "Users can view own trust edges" ON public.trust_network FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Authenticated can view trust" ON public.trust_network FOR SELECT USING (true);
CREATE POLICY "Users can insert trust edges" ON public.trust_network FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update own trust edges" ON public.trust_network FOR UPDATE USING (auth.uid() = from_user_id);

-- rent_transactions
CREATE POLICY "Tenants can view own transactions" ON public.rent_transactions FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Landlords can view their transactions" ON public.rent_transactions FOR SELECT USING (auth.uid() = landlord_id);
CREATE POLICY "Authenticated users can insert transactions" ON public.rent_transactions FOR INSERT WITH CHECK (auth.uid() = tenant_id OR auth.uid() = landlord_id);
CREATE POLICY "Landlords can update transaction status" ON public.rent_transactions FOR UPDATE USING (auth.uid() = landlord_id);
CREATE POLICY "Admins can view all rent transactions" ON public.rent_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- tenant_wallets
CREATE POLICY "Tenants can view own wallet" ON public.tenant_wallets FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Tenants can insert own wallet" ON public.tenant_wallets FOR INSERT WITH CHECK (auth.uid() = tenant_id);

-- tenant_credit_passport
CREATE POLICY "Owner can view own passport" ON public.tenant_credit_passport FOR SELECT TO authenticated USING (tenant_id = auth.uid());
CREATE POLICY "Admin can view all passports" ON public.tenant_credit_passport FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can upsert passport" ON public.tenant_credit_passport FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "System can update passport" ON public.tenant_credit_passport FOR UPDATE USING (auth.uid() = tenant_id);

-- financial_requests
CREATE POLICY "Tenants can view own requests" ON public.financial_requests FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Tenants can create requests" ON public.financial_requests FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Admins can view all requests" ON public.financial_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update requests" ON public.financial_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- threads
CREATE POLICY "Users can view threads they participate in" ON public.threads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = threads.id AND user_id = auth.uid()));
CREATE POLICY "Users can create threads" ON public.threads FOR INSERT TO authenticated 
  WITH CHECK (tenant_id = auth.uid() OR landlord_id = auth.uid() OR service_worker_id = auth.uid());
CREATE POLICY "Users can update own threads" ON public.threads FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = threads.id AND user_id = auth.uid()));

-- is_thread_participant function
CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thread_participants
    WHERE thread_id = _thread_id AND user_id = _user_id
  )
$$;

-- thread_participants
CREATE POLICY "Users can view participants of their threads" ON public.thread_participants FOR SELECT TO authenticated
  USING (public.is_thread_participant(thread_id, auth.uid()));
CREATE POLICY "Users can add participants" ON public.thread_participants FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.threads t WHERE t.id = thread_participants.thread_id AND (t.tenant_id = auth.uid() OR t.landlord_id = auth.uid() OR t.service_worker_id = auth.uid())));

-- messages
CREATE POLICY "Users can view messages in their threads" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));
CREATE POLICY "Users can send messages to their threads" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));

-- message_attachments
CREATE POLICY "Users can view attachments in their threads" ON public.message_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m JOIN public.thread_participants tp ON tp.thread_id = m.thread_id WHERE m.id = message_attachments.message_id AND tp.user_id = auth.uid()));
CREATE POLICY "Users can upload attachments" ON public.message_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());

-- notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.thread_participants tp JOIN public.messages m ON m.thread_id = tp.thread_id WHERE m.id = notifications.message_id AND tp.user_id = auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- tenancy_records
CREATE POLICY "Tenants can view own tenancies" ON public.tenancy_records FOR SELECT TO authenticated USING (tenant_id = auth.uid());
CREATE POLICY "Landlords can view own tenancies" ON public.tenancy_records FOR SELECT TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY "Landlords can create tenancies" ON public.tenancy_records FOR INSERT TO authenticated WITH CHECK (landlord_id = auth.uid());
CREATE POLICY "Parties can update tenancies" ON public.tenancy_records FOR UPDATE TO authenticated USING (tenant_id = auth.uid() OR landlord_id = auth.uid());

-- tenancy_reviews
CREATE POLICY "Anyone can view tenancy reviews" ON public.tenancy_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Participants can create reviews" ON public.tenancy_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());

-- review_disputes
CREATE POLICY "Users can view own review disputes" ON public.review_disputes FOR SELECT TO authenticated USING (reported_by = auth.uid());
CREATE POLICY "Users can create review disputes" ON public.review_disputes FOR INSERT TO authenticated WITH CHECK (reported_by = auth.uid());
CREATE POLICY "Admins can view all review disputes" ON public.review_disputes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update review disputes" ON public.review_disputes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- worker_complaints
CREATE POLICY "Requester can view own complaints" ON public.worker_complaints FOR SELECT TO authenticated USING (requester_id = auth.uid());
CREATE POLICY "Workers can view complaints about them" ON public.worker_complaints FOR SELECT TO authenticated USING (worker_id = auth.uid());
CREATE POLICY "Admins can view all worker complaints" ON public.worker_complaints FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can file complaints" ON public.worker_complaints FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Admins can update worker complaints" ON public.worker_complaints FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- service_request_deposits
CREATE POLICY "Requester can view own deposits" ON public.service_request_deposits FOR SELECT TO authenticated USING (requester_id = auth.uid());
CREATE POLICY "Requester can create deposits" ON public.service_request_deposits FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "System can update deposits" ON public.service_request_deposits FOR UPDATE TO authenticated USING (requester_id = auth.uid());

-- user_service_credits
CREATE POLICY "Users can view own credits" ON public.user_service_credits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own credits" ON public.user_service_credits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- service_credit_purchases
CREATE POLICY "Users can view own purchases" ON public.service_credit_purchases FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create purchases" ON public.service_credit_purchases FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- landlord_profiles
CREATE POLICY "Public fields for authenticated" ON public.landlord_profiles FOR SELECT TO authenticated
  USING (
    profile_visibility = 'public'
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tenancy_records tr
      WHERE tr.landlord_id = landlord_profiles.user_id AND tr.tenant_id = auth.uid()
    )
  );
CREATE POLICY "Landlords can insert own profile" ON public.landlord_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Landlords can update own profile" ON public.landlord_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- landlord_verification
CREATE POLICY "Landlords can insert own verification" ON public.landlord_verification FOR INSERT TO authenticated WITH CHECK (landlord_id = auth.uid());
CREATE POLICY "Landlords can view own verification" ON public.landlord_verification FOR SELECT TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY "Admins can manage verification" ON public.landlord_verification FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- admin_alerts
CREATE POLICY "Admins can view alerts" ON public.admin_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update alerts" ON public.admin_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- moderation_log
CREATE POLICY "Admins can view moderation log" ON public.moderation_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert moderation log" ON public.moderation_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- application_links
CREATE POLICY "Landlords can create links for own properties" ON public.application_links FOR INSERT TO authenticated
  WITH CHECK (landlord_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.properties WHERE id = property_id AND landlord_id = auth.uid()
  ));
CREATE POLICY "Landlords can view own links" ON public.application_links FOR SELECT TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY "Anyone can view links by token" ON public.application_links FOR SELECT TO public USING (true);
CREATE POLICY "Admins can view all links" ON public.application_links FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- property_applications
CREATE POLICY "Tenants can create applications" ON public.property_applications FOR INSERT TO authenticated WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Tenants can view own applications" ON public.property_applications FOR SELECT TO authenticated USING (tenant_id = auth.uid());
CREATE POLICY "Landlords can view applications for their properties" ON public.property_applications FOR SELECT TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY "Landlords can update application status" ON public.property_applications FOR UPDATE TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY "Admins can view all applications" ON public.property_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_properties_landlord ON public.properties(landlord_id);
CREATE INDEX idx_properties_location ON public.properties(location);
CREATE INDEX idx_inquiries_tenant ON public.inquiries(tenant_id);
CREATE INDEX idx_inquiries_property ON public.inquiries(property_id);
CREATE INDEX idx_rental_records_tenant ON public.rental_records(tenant_id);
CREATE INDEX idx_rental_records_landlord ON public.rental_records(landlord_id);
CREATE INDEX idx_payment_evidence_tenant ON public.payment_evidence(tenant_id);
CREATE INDEX idx_tenants_national_id ON public.tenants(national_id);
CREATE INDEX idx_tenants_phone ON public.tenants(phone);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rent_transactions_updated_at BEFORE UPDATE ON public.rent_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenant_wallets_updated_at BEFORE UPDATE ON public.tenant_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON public.threads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenancy_records_updated_at BEFORE UPDATE ON public.tenancy_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_landlord_profiles_updated_at BEFORE UPDATE ON public.landlord_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_request_deposits_updated_at BEFORE UPDATE ON public.service_request_deposits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_service_credits_updated_at BEFORE UPDATE ON public.user_service_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_applications_updated_at BEFORE UPDATE ON public.property_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- NOTIFICATION & ALERT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message_id, title, body, notification_type, related_entity_type, related_entity_id)
  SELECT tp.user_id, NEW.id, 'New Message', LEFT(NEW.content, 100), 'new_message', 'thread', NEW.thread_id
  FROM public.thread_participants tp
  WHERE tp.thread_id = NEW.thread_id AND tp.user_id != NEW.sender_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION notify_on_new_message();

CREATE OR REPLACE FUNCTION public.notify_on_job_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF OLD.status = 'open' AND NEW.status = 'accepted' AND NEW.worker_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (
      NEW.requester_id,
      'Job Accepted!',
      'A service worker has accepted your ' || NEW.service_category || ' request at ' || NEW.location,
      'service_request',
      'service_request',
      NEW.id
    );
  END IF;
  
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (
      NEW.requester_id,
      'Job Completed',
      'Your ' || NEW.service_category || ' request has been marked as completed',
      'service_request',
      'service_request',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_job_status_change AFTER UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.notify_on_job_accepted();

CREATE OR REPLACE FUNCTION public.notify_on_new_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
  VALUES (
    NEW.landlord_id,
    'New Tenant Application',
    'A tenant has applied for your property listing.',
    'application',
    'property_application',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_application AFTER INSERT ON public.property_applications FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_application();

CREATE OR REPLACE FUNCTION public.handle_application_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _rent integer;
BEGIN
  IF NEW.application_status = 'approved' AND OLD.application_status = 'pending' THEN
    SELECT rent_amount INTO _rent FROM public.properties WHERE id = NEW.property_id;
    
    INSERT INTO public.tenancy_records (tenant_id, landlord_id, property_id, monthly_rent, tenancy_status, verification_status, lease_start_date)
    VALUES (NEW.tenant_id, NEW.landlord_id, NEW.property_id, COALESCE(_rent, 0), 'active', 'verified', CURRENT_DATE);

    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (
      NEW.tenant_id,
      'Application Approved!',
      'Your property application has been approved. A tenancy record has been created.',
      'application',
      'property_application',
      NEW.id
    );
  ELSIF NEW.application_status = 'rejected' AND OLD.application_status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, body, notification_type, related_entity_type, related_entity_id)
    VALUES (
      NEW.tenant_id,
      'Application Update',
      'Your property application was not approved at this time.',
      'application',
      'property_application',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_application_approval AFTER UPDATE ON public.property_applications FOR EACH ROW EXECUTE FUNCTION public.handle_application_approval();

-- Worker rating trigger
CREATE OR REPLACE FUNCTION public.update_worker_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.service_worker_profiles
  SET rating_score = (
    SELECT COALESCE(AVG(rating), 0)
    FROM public.worker_reviews
    WHERE worker_id = NEW.worker_id
  ),
  updated_at = now()
  WHERE user_id = NEW.worker_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_worker_rating_on_review AFTER INSERT ON public.worker_reviews FOR EACH ROW EXECUTE FUNCTION public.update_worker_rating();

-- Worker visibility trigger
CREATE OR REPLACE FUNCTION public.update_worker_visibility()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.verification_status IN ('pending', 'suspended') THEN
    NEW.visibility_status := 'hidden';
  ELSIF NEW.verification_status = 'verified' AND NEW.rating_score IS NOT NULL AND NEW.rating_score > 0 AND NEW.rating_score < 3.5 THEN
    NEW.visibility_status := 'limited';
  ELSIF NEW.verification_status = 'verified' AND COALESCE(NEW.jobs_completed, 0) < 3 THEN
    NEW.visibility_status := 'limited';
  ELSIF NEW.verification_status = 'verified' AND COALESCE(NEW.jobs_completed, 0) >= 3 THEN
    NEW.visibility_status := 'public';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_update_worker_visibility BEFORE INSERT OR UPDATE ON public.service_worker_profiles FOR EACH ROW EXECUTE FUNCTION public.update_worker_visibility();

-- Admin alert triggers
CREATE OR REPLACE FUNCTION public.alert_on_new_worker()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type, related_entity_id)
  VALUES ('new_worker', 'New service worker registered: ' || NEW.service_category, NEW.user_id, 'service_worker_profile', NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alert_new_worker AFTER INSERT ON public.service_worker_profiles FOR EACH ROW EXECUTE FUNCTION public.alert_on_new_worker();

CREATE OR REPLACE FUNCTION public.alert_on_new_dispute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type, related_entity_id)
  VALUES ('new_dispute', 'Dispute filed: ' || LEFT(NEW.dispute_reason, 100), NEW.tenant_id, 'dispute', NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alert_new_dispute AFTER INSERT ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.alert_on_new_dispute();

CREATE OR REPLACE FUNCTION public.alert_on_landlord_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type, related_entity_id)
  VALUES ('landlord_verification', 'Landlord submitted verification document: ' || NEW.document_type, NEW.landlord_id, 'landlord_verification', NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alert_landlord_verification AFTER INSERT ON public.landlord_verification FOR EACH ROW EXECUTE FUNCTION public.alert_on_landlord_verification();

CREATE OR REPLACE FUNCTION public.handle_worker_complaint_threshold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c_count integer;
BEGIN
  SELECT COUNT(*) INTO c_count FROM public.worker_complaints WHERE worker_id = NEW.worker_id;
  IF c_count >= 3 THEN
    UPDATE public.service_worker_profiles SET verification_status = 'suspended' WHERE user_id = NEW.worker_id;
    INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type)
    VALUES ('worker_auto_suspended', 'Auto-suspended after ' || c_count || ' complaints', NEW.worker_id, 'service_worker_profile');
  ELSIF c_count >= 1 THEN
    UPDATE public.service_worker_profiles SET visibility_status = 'limited' WHERE user_id = NEW.worker_id AND visibility_status = 'public';
    INSERT INTO public.admin_alerts (alert_type, description, related_user_id, related_entity_type, related_entity_id)
    VALUES ('worker_complaint', 'Complaint #' || c_count || ' filed against worker', NEW.worker_id, 'worker_complaint', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_worker_complaint_threshold AFTER INSERT ON public.worker_complaints FOR EACH ROW EXECUTE FUNCTION public.handle_worker_complaint_threshold();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('worker-documents', 'worker-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('message-attachments', 'message-attachments', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view property images" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
CREATE POLICY "Authenticated users can upload property images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-images');
CREATE POLICY "Users can delete their own property images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Workers can upload own docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'worker-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Workers can view own docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'worker-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can view all worker docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'worker-documents' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Thread participants can upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Thread participants can read attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.service_workers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_applications;

-- ============================================
-- DONE!
-- ============================================
