-- ============================================================================
-- Migration: 002_app_env_vars.sql
-- Description: Create app_env_vars table for key-value environment configuration
-- ============================================================================

-- Create the app_env_vars table
CREATE TABLE IF NOT EXISTS app_env_vars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    
    -- Key-Value pair
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    value_type VARCHAR(20) DEFAULT 'string' CHECK (
        value_type IN ('string', 'number', 'boolean', 'json')
    ),
    
    -- Scoping: environment and optional channel
    environment VARCHAR(50) NOT NULL CHECK (
        environment IN ('production', 'staging', 'development', 'all')
    ),
    channel VARCHAR(100),  -- NULL = applies to all channels
    
    -- Metadata
    is_secret BOOLEAN DEFAULT false,
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_env_vars_app ON app_env_vars(app_id);
CREATE INDEX IF NOT EXISTS idx_env_vars_lookup ON app_env_vars(app_id, environment, channel);
CREATE INDEX IF NOT EXISTS idx_env_vars_key ON app_env_vars(app_id, key);

-- Unique index to enforce uniqueness for app_id + key + environment + channel (treat NULL as '')
CREATE UNIQUE INDEX IF NOT EXISTS ux_app_env_vars_app_key_env_channel
ON app_env_vars(app_id, key, environment, COALESCE(channel, ''));

-- Auto-update timestamps trigger
CREATE TRIGGER update_app_env_vars_updated_at 
    BEFORE UPDATE ON app_env_vars 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE app_env_vars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View env vars" ON app_env_vars
    FOR SELECT USING (can_access_app(app_id));

CREATE POLICY "Developers manage env vars" ON app_env_vars
    FOR INSERT WITH CHECK (can_deploy(app_id));

CREATE POLICY "Developers update env vars" ON app_env_vars
    FOR UPDATE USING (can_deploy(app_id));

CREATE POLICY "Developers delete env vars" ON app_env_vars
    FOR DELETE USING (can_deploy(app_id));

-- Documentation
COMMENT ON TABLE app_env_vars IS 'Environment variables for apps, sent during update handshake';
COMMENT ON COLUMN app_env_vars.environment IS 'Target environment: production, staging, development, or all';
COMMENT ON COLUMN app_env_vars.channel IS 'Optional channel override. NULL means applies to all channels';
COMMENT ON COLUMN app_env_vars.is_secret IS 'If true, value should be masked in UI';
COMMENT ON COLUMN app_env_vars.value_type IS 'Type hint for parsing: string, number, boolean, or json';
