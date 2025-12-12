-- Authentication and RBAC setup for Capgo Updater

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for storing users
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing applications (multi-tenancy)
CREATE TABLE IF NOT EXISTS apps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  app_identifier VARCHAR(255) UNIQUE NOT NULL, -- like com.example.app
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  app_id UUID REFERENCES apps(id), -- NULL means system-wide role
  permissions JSONB DEFAULT '[]'::jsonb, -- Store permissions as JSON array
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for team memberships
CREATE TABLE IF NOT EXISTS team_memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id), -- Role within the team
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id) -- A user can only have one role per team
);

-- Table for user sessions (for authentication)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL, -- JWT token or session token
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Table for password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System administrator with full access', 
  '["read:*", "write:*", "delete:*", "manage:users", "manage:roles", "manage:apps"]'::jsonb),
('app_owner', 'App owner with full access to their applications',
  '["read:app", "write:app", "manage:app", "read:updates", "write:updates", "manage:updates", "read:channels", "write:channels", "manage:channels"]'::jsonb),
('app_developer', 'App developer with update and channel management',
  '["read:app", "read:updates", "write:updates", "read:channels", "write:channels"]'::jsonb),
('app_viewer', 'App viewer with read-only access',
  '["read:app", "read:updates", "read:channels"]'::jsonb);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_teams_app_id ON teams(app_id);
CREATE INDEX idx_team_memberships_user_id ON team_memberships(user_id);
CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_apps_app_identifier ON apps(app_identifier);

-- Add columns to existing tables to support multi-tenancy
-- Link existing updates to apps
ALTER TABLE updates ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id);
-- Link existing device_channels to apps  
ALTER TABLE device_channels ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id);
-- Link existing update_stats to apps
ALTER TABLE update_stats ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id);
-- Link existing update_logs to apps
ALTER TABLE update_logs ADD COLUMN IF NOT EXISTS app_id UUID REFERENCES apps(id);