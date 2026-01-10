-- Add current_native_version_id to channels table
ALTER TABLE channels 
ADD COLUMN current_native_version_id UUID REFERENCES native_updates(id) ON DELETE SET NULL;

COMMENT ON COLUMN channels.current_native_version_id IS 'Pointer to the active native update for this channel';
