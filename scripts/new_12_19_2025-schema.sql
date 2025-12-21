-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['admin'::character varying, 'developer'::character varying, 'tester'::character varying, 'viewer'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT app_permissions_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id),
  CONSTRAINT app_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.app_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL,
  version_name character varying NOT NULL,
  platform character varying NOT NULL CHECK (platform::text = ANY (ARRAY['ios'::character varying, 'android'::character varying, 'web'::character varying]::text[])),
  storage_provider character varying NOT NULL DEFAULT 'r2'::character varying CHECK (storage_provider::text = ANY (ARRAY['r2'::character varying, 'external'::character varying, 's3'::character varying]::text[])),
  external_url text,
  r2_path character varying,
  checksum character varying,
  session_key character varying,
  manifest jsonb,
  min_update_version character varying,
  required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_versions_pkey PRIMARY KEY (id),
  CONSTRAINT app_versions_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id),
  CONSTRAINT app_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.apps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  icon_url text,
  organization_id uuid NOT NULL,
  team_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT apps_pkey PRIMARY KEY (id),
  CONSTRAINT apps_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT apps_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL,
  name character varying NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  allow_device_self_set boolean NOT NULL DEFAULT false,
  allow_dev boolean NOT NULL DEFAULT true,
  allow_emulator boolean NOT NULL DEFAULT true,
  ios_enabled boolean NOT NULL DEFAULT true,
  android_enabled boolean NOT NULL DEFAULT true,
  disable_auto_update character varying NOT NULL DEFAULT 'none'::character varying CHECK (disable_auto_update::text = ANY (ARRAY['none'::character varying, 'major'::character varying, 'minor'::character varying, 'patch'::character varying]::text[])),
  disable_auto_update_under_native boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  current_version_id uuid,
  CONSTRAINT channels_pkey PRIMARY KEY (id),
  CONSTRAINT channels_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id),
  CONSTRAINT channels_current_version_id_fkey FOREIGN KEY (current_version_id) REFERENCES public.app_versions(id)
);
CREATE TABLE public.device_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  channel_id uuid NOT NULL,
  platform character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_channels_pkey PRIMARY KEY (id),
  CONSTRAINT device_channels_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id),
  CONSTRAINT device_channels_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id)
);
CREATE TABLE public.device_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  app_id uuid NOT NULL,
  action character varying NOT NULL,
  version_name character varying,
  platform character varying,
  is_emulator boolean,
  is_prod boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_stats_pkey PRIMARY KEY (id),
  CONSTRAINT device_stats_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id),
  CONSTRAINT device_stats_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id)
);
CREATE TABLE public.devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id character varying NOT NULL,
  app_id uuid NOT NULL,
  custom_id character varying,
  platform character varying NOT NULL CHECK (platform::text = ANY (ARRAY['ios'::character varying, 'android'::character varying, 'web'::character varying]::text[])),
  is_prod boolean NOT NULL DEFAULT true,
  is_emulator boolean NOT NULL DEFAULT false,
  version_name character varying,
  version_build character varying,
  version_os character varying,
  plugin_version character varying,
  channel_id uuid,
  channel_override character varying,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT devices_pkey PRIMARY KEY (id),
  CONSTRAINT devices_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id),
  CONSTRAINT devices_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES public.channels(id)
);
CREATE TABLE public.native_update_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL,
  device_id uuid,
  event character varying NOT NULL CHECK (event::text = ANY (ARRAY['check'::character varying, 'download'::character varying, 'install'::character varying, 'fail'::character varying, 'skip'::character varying]::text[])),
  platform character varying NOT NULL,
  current_version_code integer,
  new_version character varying,
  new_version_code integer,
  channel character varying,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT native_update_logs_pkey PRIMARY KEY (id),
  CONSTRAINT native_update_logs_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id),
  CONSTRAINT native_update_logs_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id)
);
CREATE TABLE public.native_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL,
  platform character varying NOT NULL CHECK (platform::text = ANY (ARRAY['ios'::character varying, 'android'::character varying]::text[])),
  version_name character varying NOT NULL,
  version_code integer NOT NULL,
  download_url text NOT NULL,
  checksum character varying,
  file_size_bytes bigint,
  min_sdk_version integer,
  required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  channel character varying NOT NULL DEFAULT 'production'::character varying,
  release_notes text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT native_updates_pkey PRIMARY KEY (id),
  CONSTRAINT native_updates_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id),
  CONSTRAINT native_updates_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_pkey PRIMARY KEY (id),
  CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
  CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name character varying NOT NULL,
  slug character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.update_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  device_id uuid,
  app_id uuid NOT NULL,
  current_version character varying,
  new_version character varying,
  platform character varying,
  action character varying NOT NULL DEFAULT 'get'::character varying CHECK (action::text = ANY (ARRAY['get'::character varying, 'download'::character varying, 'install'::character varying, 'fail'::character varying, 'rollback'::character varying]::text[])),
  status character varying CHECK (status::text = ANY (ARRAY['success'::character varying, 'failed'::character varying, 'pending'::character varying]::text[])),
  error_message text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT update_logs_pkey PRIMARY KEY (id),
  CONSTRAINT update_logs_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id),
  CONSTRAINT update_logs_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email character varying NOT NULL UNIQUE,
  full_name character varying,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.version_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL,
  version_id uuid NOT NULL,
  get_count integer NOT NULL DEFAULT 0,
  download_count integer NOT NULL DEFAULT 0,
  install_count integer NOT NULL DEFAULT 0,
  fail_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT version_stats_pkey PRIMARY KEY (id),
  CONSTRAINT version_stats_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id),
  CONSTRAINT version_stats_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.app_versions(id)
);














-- auth--

-- ============================================================================
-- SUPABASE AUTH INTEGRATION
-- ============================================================================

-- STEP 1: Link your users table to Supabase auth.users
-- ============================================================================

-- Your users.id should match auth.users.id
-- This trigger automatically creates a user profile when someone signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table (runs when new user signs up)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also sync updates from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET 
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
    avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- ============================================================================
-- STEP 2: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE native_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE native_update_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Check if user is org owner/admin
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is org member (any role)
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is team member
CREATE OR REPLACE FUNCTION is_team_member(team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_uuid
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check user's app permission level
CREATE OR REPLACE FUNCTION get_app_role(app_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM app_permissions
    WHERE app_id = app_uuid
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access app (through permissions or org admin)
CREATE OR REPLACE FUNCTION can_access_app(app_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- Direct app permission
    SELECT 1 FROM app_permissions
    WHERE app_id = app_uuid AND user_id = auth.uid()
  ) OR EXISTS (
    -- Or org admin
    SELECT 1 FROM apps a
    JOIN organization_members om ON a.organization_id = om.organization_id
    WHERE a.id = app_uuid 
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES: USERS
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (id = auth.uid());

-- Users can view profiles of people in their orgs
CREATE POLICY "Users can view org members" ON users
  FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT om2.user_id
      FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES: ORGANIZATIONS
-- ============================================================================

-- Users can view orgs they're members of
CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT
  USING (is_org_member(id));

-- Only org owners can create organizations (handled in app logic)
-- Owners/admins can update their org
CREATE POLICY "Admins can update organization" ON organizations
  FOR UPDATE
  USING (is_org_admin(id));

-- Only owners can delete (handled via app logic to prevent accidents)
CREATE POLICY "Owners can delete organization" ON organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ============================================================================
-- RLS POLICIES: ORGANIZATION MEMBERS
-- ============================================================================

-- Members can view members in their org
CREATE POLICY "View org members" ON organization_members
  FOR SELECT
  USING (is_org_member(organization_id));

-- Admins can add members
CREATE POLICY "Admins can add members" ON organization_members
  FOR INSERT
  WITH CHECK (is_org_admin(organization_id));

-- Admins can update member roles (except owner)
CREATE POLICY "Admins can update members" ON organization_members
  FOR UPDATE
  USING (
    is_org_admin(organization_id) 
    AND role != 'owner' -- Can't modify owners
  );

-- Admins can remove members (except owners)
CREATE POLICY "Admins can remove members" ON organization_members
  FOR DELETE
  USING (
    is_org_admin(organization_id)
    AND role != 'owner'
  );

-- ============================================================================
-- RLS POLICIES: TEAMS
-- ============================================================================

-- Members can view teams in their org
CREATE POLICY "View org teams" ON teams
  FOR SELECT
  USING (is_org_member(organization_id));

-- Admins can create teams
CREATE POLICY "Admins can create teams" ON teams
  FOR INSERT
  WITH CHECK (is_org_admin(organization_id));

-- Admins can update teams
CREATE POLICY "Admins can update teams" ON teams
  FOR UPDATE
  USING (is_org_admin(organization_id));

-- Admins can delete teams
CREATE POLICY "Admins can delete teams" ON teams
  FOR DELETE
  USING (is_org_admin(organization_id));

-- ============================================================================
-- RLS POLICIES: TEAM MEMBERS
-- ============================================================================

-- Users can view team members if they're in the org
CREATE POLICY "View team members" ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
        AND is_org_member(t.organization_id)
    )
  );

-- Admins can add team members
CREATE POLICY "Admins can add team members" ON team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
        AND is_org_admin(t.organization_id)
    )
  );

-- Admins can remove team members
CREATE POLICY "Admins can remove team members" ON team_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
        AND is_org_admin(t.organization_id)
    )
  );

-- ============================================================================
-- RLS POLICIES: APPS
-- ============================================================================

-- Users can view apps they have access to
CREATE POLICY "View accessible apps" ON apps
  FOR SELECT
  USING (can_access_app(id));

-- Admins can create apps
CREATE POLICY "Admins can create apps" ON apps
  FOR INSERT
  WITH CHECK (is_org_admin(organization_id));

-- Admins or app admins can update apps
CREATE POLICY "Admins can update apps" ON apps
  FOR UPDATE
  USING (
    is_org_admin(organization_id)
    OR get_app_role(id) = 'admin'
  );

-- Only org admins can delete apps
CREATE POLICY "Org admins can delete apps" ON apps
  FOR DELETE
  USING (is_org_admin(organization_id));

-- ============================================================================
-- RLS POLICIES: APP PERMISSIONS
-- ============================================================================

-- Users can view permissions for apps they can access
CREATE POLICY "View app permissions" ON app_permissions
  FOR SELECT
  USING (can_access_app(app_id));

-- App admins can manage permissions
CREATE POLICY "App admins can add permissions" ON app_permissions
  FOR INSERT
  WITH CHECK (
    get_app_role(app_id) = 'admin'
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

CREATE POLICY "App admins can update permissions" ON app_permissions
  FOR UPDATE
  USING (
    get_app_role(app_id) = 'admin'
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

CREATE POLICY "App admins can remove permissions" ON app_permissions
  FOR DELETE
  USING (
    get_app_role(app_id) = 'admin'
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

-- ============================================================================
-- RLS POLICIES: CHANNELS
-- ============================================================================

-- Users can view channels for accessible apps
CREATE POLICY "View app channels" ON channels
  FOR SELECT
  USING (can_access_app(app_id));

-- Developers and above can manage channels
CREATE POLICY "Developers can manage channels" ON channels
  FOR ALL
  USING (
    get_app_role(app_id) IN ('admin', 'developer')
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

-- ============================================================================
-- RLS POLICIES: APP VERSIONS (OTA)
-- ============================================================================

-- Users can view versions for accessible apps
CREATE POLICY "View app versions" ON app_versions
  FOR SELECT
  USING (can_access_app(app_id));

-- Developers can upload versions
CREATE POLICY "Developers can upload versions" ON app_versions
  FOR INSERT
  WITH CHECK (
    get_app_role(app_id) IN ('admin', 'developer')
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

-- Developers can update/delete versions
CREATE POLICY "Developers can manage versions" ON app_versions
  FOR UPDATE
  USING (
    get_app_role(app_id) IN ('admin', 'developer')
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

CREATE POLICY "Developers can delete versions" ON app_versions
  FOR DELETE
  USING (
    get_app_role(app_id) IN ('admin', 'developer')
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

-- ============================================================================
-- RLS POLICIES: NATIVE UPDATES
-- ============================================================================

-- Same as app_versions
CREATE POLICY "View native updates" ON native_updates
  FOR SELECT
  USING (can_access_app(app_id));

CREATE POLICY "Developers can upload native updates" ON native_updates
  FOR INSERT
  WITH CHECK (
    get_app_role(app_id) IN ('admin', 'developer')
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

CREATE POLICY "Developers can manage native updates" ON native_updates
  FOR UPDATE
  USING (
    get_app_role(app_id) IN ('admin', 'developer')
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

CREATE POLICY "Developers can delete native updates" ON native_updates
  FOR DELETE
  USING (
    get_app_role(app_id) IN ('admin', 'developer')
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

-- ============================================================================
-- RLS POLICIES: DEVICES
-- ============================================================================

-- All team members can view devices (including testers)
CREATE POLICY "Team can view devices" ON devices
  FOR SELECT
  USING (can_access_app(app_id));

-- Developers can manage devices (testers cannot)
CREATE POLICY "Developers can manage devices" ON devices
  FOR ALL
  USING (
    get_app_role(app_id) IN ('admin', 'developer')
    OR EXISTS (
      SELECT 1 FROM apps a
      WHERE a.id = app_id AND is_org_admin(a.organization_id)
    )
  );

-- ============================================================================
-- RLS POLICIES: ANALYTICS (Logs & Stats)
-- ============================================================================

-- All users with app access can view analytics
CREATE POLICY "View device stats" ON device_stats
  FOR SELECT
  USING (can_access_app(app_id));

CREATE POLICY "View update logs" ON update_logs
  FOR SELECT
  USING (can_access_app(app_id));

CREATE POLICY "View native update logs" ON native_update_logs
  FOR SELECT
  USING (can_access_app(app_id));

CREATE POLICY "View version stats" ON version_stats
  FOR SELECT
  USING (can_access_app(app_id));

-- Device channels - users can view
CREATE POLICY "View device channels" ON device_channels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM devices d
      WHERE d.id = device_id
        AND can_access_app(d.app_id)
    )
  );

-- ============================================================================
-- ADDITIONAL HELPER FUNCTIONS
-- ============================================================================

-- Get all apps user has access to
CREATE OR REPLACE FUNCTION get_user_apps()
RETURNS TABLE (
  app_id UUID,
  app_name VARCHAR,
  role VARCHAR,
  organization_name VARCHAR,
  team_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    ap.role,
    o.name,
    t.name
  FROM apps a
  JOIN organizations o ON a.organization_id = o.id
  JOIN teams t ON a.team_id = t.id
  LEFT JOIN app_permissions ap ON a.id = ap.app_id AND ap.user_id = auth.uid()
  WHERE can_access_app(a.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's organizations with their role
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
  org_id UUID,
  org_name VARCHAR,
  org_slug VARCHAR,
  user_role VARCHAR,
  member_count BIGINT,
  app_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    om.role,
    (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id),
    (SELECT COUNT(*) FROM apps WHERE organization_id = o.id)
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;