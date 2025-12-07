-- Native update event logs table
-- Run this SQL in your Supabase dashboard

CREATE TABLE IF NOT EXISTS public.native_update_logs (
  id SERIAL PRIMARY KEY,
  event VARCHAR NOT NULL,              -- 'check', 'download_started', 'download_completed', 'install_started', 'install_completed', 'failed'
  platform VARCHAR NOT NULL,
  device_id VARCHAR,
  current_version_code INTEGER,
  new_version VARCHAR,
  new_version_code INTEGER,
  channel VARCHAR DEFAULT 'stable',
  environment VARCHAR DEFAULT 'prod',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_native_update_logs_lookup 
  ON native_update_logs(platform, device_id, created_at DESC);

-- Note: The native_updates table should already exist from user's previous setup:
-- CREATE TABLE public.native_updates (
--   id SERIAL PRIMARY KEY,
--   platform VARCHAR NOT NULL,       -- 'android' | 'ios'
--   version VARCHAR NOT NULL,        -- '1.2.3'
--   version_code INTEGER NOT NULL,   -- 42 (for comparison)
--   download_url TEXT NOT NULL,      -- APK URL
--   checksum VARCHAR,
--   channel VARCHAR DEFAULT 'stable',
--   environment VARCHAR DEFAULT 'prod',
--   required BOOLEAN DEFAULT false,
--   active BOOLEAN DEFAULT true,
--   file_size BIGINT,
--   release_notes TEXT,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   
--   UNIQUE(platform, channel, environment, version_code)
-- );
