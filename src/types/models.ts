import { Platform } from "./index";

export type OrgRole = "owner" | "admin" | "member";
export type AppRole = "admin" | "developer" | "tester" | "viewer";
export type StorageProvider = "r2" | "external" | "s3";

export interface User {
  id: string; // uuid
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string; // uuid
  name: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string; // uuid
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export interface App {
  id: string; // uuid
  app_id: string; // string id e.g. com.example.app
  name: string;
  icon_url?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface AppPermission {
  id: string; // uuid
  app_id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface AppVersion {
  id: string; // uuid
  app_id: string;
  version_name: string;
  platform: Platform;
  storage_provider: StorageProvider;
  external_url?: string;
  r2_path?: string;
  checksum?: string;
  session_key?: string;
  manifest?: any; // jsonb
  min_update_version?: string;
  required: boolean;
  active: boolean;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Channel {
  id: string; // uuid
  app_id: string;
  name: string;
  is_public: boolean;
  allow_device_self_set: boolean;
  allow_dev: boolean;
  allow_emulator: boolean;
  ios_enabled: boolean;
  android_enabled: boolean;
  disable_auto_update: "none" | "major" | "minor" | "patch";
  disable_auto_update_under_native: boolean;
  current_version_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string; // uuid
  device_id: string;
  app_id: string;
  custom_id?: string;
  platform: Platform;
  is_prod: boolean;
  is_emulator: boolean;
  version_name?: string;
  version_build?: string;
  version_os?: string;
  plugin_version?: string;
  channel_id?: string;
  channel_override?: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceChannel {
  id: string; // uuid
  device_id: string;
  channel_id: string;
  platform: string;
  created_at: string;
  updated_at: string;
}
