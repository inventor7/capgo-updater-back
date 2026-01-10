-- Migration: Add environment field to channels table
-- Default: staging (as per user preference)

ALTER TABLE channels 
ADD COLUMN IF NOT EXISTS environment VARCHAR(50) NOT NULL DEFAULT 'staging' 
CHECK (environment IN ('prod', 'staging', 'dev'));

-- Update comment
COMMENT ON COLUMN channels.environment IS 'Target environment for this channel (prod, staging, dev). Used by CLI to select correct .env file.';
