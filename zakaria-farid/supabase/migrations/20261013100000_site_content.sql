-- Review only. Do not apply to production automatically.
CREATE TABLE IF NOT EXISTS public.site_content (
  key text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users ON DELETE SET NULL
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;

DROP POLICY IF EXISTS site_content_public_select ON public.site_content;
CREATE POLICY site_content_public_select ON public.site_content
  FOR SELECT TO anon, authenticated
  USING (true);

-- Same administrator check as properties_auth_manage/leads_auth_manage in 014.
DROP POLICY IF EXISTS site_content_admin_insert ON public.site_content;
CREATE POLICY site_content_admin_insert ON public.site_content
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS site_content_admin_update ON public.site_content;
CREATE POLICY site_content_admin_update ON public.site_content
  FOR UPDATE TO authenticated
  USING ((SELECT auth.role()) = 'authenticated')
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS site_content_admin_delete ON public.site_content;
CREATE POLICY site_content_admin_delete ON public.site_content
  FOR DELETE TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

CREATE OR REPLACE FUNCTION public.touch_site_content_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS site_content_updated_at ON public.site_content;
CREATE TRIGGER site_content_updated_at BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.touch_site_content_updated_at();
