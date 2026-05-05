-- User auth management extension for Supabase.
-- Run in Supabase SQL Editor after enabling Google and Kakao providers in Auth settings.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS notification_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles (id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

CREATE TABLE IF NOT EXISTS public.provider_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

ALTER TABLE public.provider_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_accounts_owner_select" ON public.provider_accounts;
CREATE POLICY "provider_accounts_owner_select"
ON public.provider_accounts
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "provider_accounts_owner_insert" ON public.provider_accounts;
CREATE POLICY "provider_accounts_owner_insert"
ON public.provider_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "provider_accounts_owner_update" ON public.provider_accounts;
CREATE POLICY "provider_accounts_owner_update"
ON public.provider_accounts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.live_status
ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '/',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  dedupe_key TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_owner_select" ON public.notifications;
CREATE POLICY "notifications_owner_select"
ON public.notifications
FOR SELECT
USING (auth.uid()::TEXT = user_id OR user_id LIKE 'u-%');

DROP POLICY IF EXISTS "notifications_owner_update" ON public.notifications;
CREATE POLICY "notifications_owner_update"
ON public.notifications
FOR UPDATE
USING (auth.uid()::TEXT = user_id OR user_id LIKE 'u-%')
WITH CHECK (auth.uid()::TEXT = user_id OR user_id LIKE 'u-%');
