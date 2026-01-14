-- Migration: Update update_logs_action_check constraint
-- Description: Allow all Capgo plugin actions including app_moved_to_background
-- Created: 2026-01-14

-- 1. Drop existing constraint
ALTER TABLE update_logs DROP CONSTRAINT IF EXISTS update_logs_action_check;

-- 2. Add new constraint with expanded allowed values
ALTER TABLE update_logs
ADD CONSTRAINT update_logs_action_check
CHECK (action IN (
    'get', 
    'set', 
    'install', 
    'download', 
    'download_complete', 
    'download_fail', 
    'download_failed',
    'update_fail', 
    'update_failed',
    'app_ready', 
    'app_moved_to_background', 
    'app_moved_to_foreground', 
    'update_available', 
    'native_update_required', 
    'no_update_available',
    'unknown',
    'blocked_by_server_url'
));
