// Types for authentication and authorization system

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface UserRegistration {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface App {
  id: string;
  name: string;
  appIdentifier: string; // like com.example.app
  description?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  appId?: string; // NULL means system-wide role
  permissions: string[]; // Array of permission strings like ["read:app", "write:updates"]
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  appId: string;
  description?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMembership {
  id: string;
  userId: string;
  teamId: string;
  roleId: string; // Role within the team
  joinedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  lastAccessed: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  permissions?: string[];
  app?: App;
}

// Permission types
export type Permission =
  | "read:app"
  | "write:app"
  | "manage:app"
  | "read:updates"
  | "write:updates"
  | "manage:updates"
  | "read:channels"
  | "write:channels"
  | "manage:channels"
  | "read:stats"
  | "write:stats"
  | "manage:stats"
  | "read:devices"
  | "write:devices"
  | "manage:devices"
  | "manage:users"
  | "manage:roles"
  | "manage:teams"
  | "*"; // Wildcard for all permissions

// RBAC service interface
export interface IRBACService {
  authenticateToken(token: string): Promise<User | null>;
  authorizeUser(
    userId: string,
    permission: Permission,
    appId?: string,
  ): Promise<boolean>;
  getUserPermissions(userId: string, appId?: string): Promise<string[]>;
  getUserApps(userId: string): Promise<App[]>;
  getUserTeams(userId: string): Promise<Team[]>;
}

// App service interface
export interface IAppService {
  createApp(appData: {
    name: string;
    appIdentifier: string;
    description?: string;
    createdById: string;
  }): Promise<App>;
  getAppById(appId: string): Promise<App | null>;
  getUserApps(userId: string): Promise<App[]>;
  createTeam(teamData: {
    name: string;
    appId: string;
    description?: string;
    createdById: string;
  }): Promise<Team>;
  addUserToTeam(membershipData: {
    userId: string;
    teamId: string;
    roleId: string;
  }): Promise<TeamMembership>;
  createRole(roleData: {
    name: string;
    description?: string;
    appId: string;
    permissions: string[];
  }): Promise<Role>;
}

// Auth service interface
export interface IAuthService {
  register(
    user: UserRegistration,
  ): Promise<{ user: User; session: UserSession }>;
  login(credentials: UserLogin): Promise<{ user: User; session: UserSession }>;
  logout(sessionId: string): Promise<void>;
  refreshToken(
    token: string,
  ): Promise<{ user: User; session: UserSession } | null>;
  verifyEmail(token: string): Promise<boolean>;
  sendPasswordResetEmail(email: string): Promise<boolean>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
}
