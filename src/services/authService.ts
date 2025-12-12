import { User, UserRegistration, UserLogin, UserSession, IAuthService, AppError } from "@/types";
import supabaseService from "@/services/supabaseService";
import logger from "@/utils/logger";

class AuthService implements IAuthService {
  // Supabase Auth doesn't need custom register/login methods
  // Instead, we'll provide methods to work with Supabase Auth and our custom user profiles

  // Register a user using Supabase Auth - matches IAuthService interface
  async register(user: UserRegistration): Promise<{ user: User; session: UserSession }> {
    try {
      logger.info("Registering user via Supabase Auth", { email: user.email });

      const { data, error } = await supabaseService.getClient().auth.signUp({
        email: user.email,
        password: user.password,
      });

      if (error) {
        logger.error("Supabase registration failed", { error: error.message });
        throw new AppError(error.message, 400);
      }

      // Create a user profile in our custom users table
      if (data.user) {
        // Create user profile in our system
        const userProfile = await supabaseService.insert("users", [{
          id: data.user.id, // Use Supabase user ID
          email: data.user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          is_verified: data.user.email_confirmed_at !== null,
        }]);

        logger.info("User registered successfully", { userId: data.user.id });

        // Create a user object matching the User type
        const newUser: User = {
          id: data.user.id,
          email: data.user.email || user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          isVerified: data.user.email_confirmed_at !== null,
          isActive: true,
          phone: data.user.phone || '',
          createdAt: data.user.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Create a mock session since Supabase handles sessions automatically
        // In a real implementation, you might want to use the Supabase session data
        const mockSession: UserSession = {
          id: data.user.id + '-session',
          userId: data.user.id,
          token: '', // Supabase handles the token automatically
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
        };

        return {
          user: newUser,
          session: mockSession
        };
      }

      throw new AppError("Registration failed", 500);
    } catch (error) {
      logger.error("Registration failed", { error });
      throw error;
    }
  }

  // Login a user using Supabase Auth - matches IAuthService interface
  async login(credentials: UserLogin): Promise<{ user: User; session: UserSession }> {
    try {
      logger.info("Logging in user via Supabase Auth", { email: credentials.email });

      const { data, error } = await supabaseService.getClient().auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        logger.error("Supabase login failed", { error: error.message });
        throw new AppError(error.message, 401);
      }

      if (data.user) {
        logger.info("User login successful", { userId: data.user.id });

        // Get user profile from our custom users table
        const userProfiles = await supabaseService.query("users", {
          match: { id: data.user.id },
          select: "id, email, first_name, last_name, phone, is_active, is_verified, created_at, updated_at"
        });

        let userProfile: User;
        if (userProfiles.data && userProfiles.data.length > 0) {
          const dbUser = userProfiles.data[0];
          userProfile = {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.first_name,
            lastName: dbUser.last_name,
            phone: dbUser.phone,
            isActive: dbUser.is_active ?? true,
            isVerified: dbUser.is_verified,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
          };
        } else {
          // If no profile exists in our custom table, use Supabase user data
          userProfile = {
            id: data.user.id,
            email: data.user.email || credentials.email,
            firstName: data.user.user_metadata?.first_name || '',
            lastName: data.user.user_metadata?.last_name || '',
            phone: data.user.phone || '',
            isActive: true, // Default to active
            isVerified: !!data.user.email_confirmed_at,
            createdAt: data.user.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(), // Updated at might not exist in Supabase user
          };
        }

        // Create a mock session since Supabase handles sessions automatically
        const mockSession: UserSession = {
          id: data.user.id + '-session',
          userId: data.user.id,
          token: '', // Supabase handles the token automatically
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
        };

        return {
          user: userProfile,
          session: mockSession
        };
      }

      throw new AppError("Login failed", 500);
    } catch (error) {
      logger.error("Login failed", { error });
      throw error;
    }
  }

  // Logout user using Supabase Auth
  async logout(): Promise<void> {
    try {
      logger.info("Logging out user via Supabase Auth");

      const { error } = await supabaseService.getClient().auth.signOut();

      if (error) {
        logger.error("Supabase logout failed", { error: error.message });
        throw new AppError(error.message, 500);
      }

      logger.info("User logged out successfully");
    } catch (error) {
      logger.error("Logout failed", { error });
      throw error;
    }
  }

  async refreshToken(token: string): Promise<{ user: User; session: UserSession } | null> {
    // With Supabase Auth, tokens are automatically refreshed
    // This method is less relevant in Supabase Auth context
    // We'll return the current session instead
    try {
      const { data: { user }, error } = await supabaseService.getClient().auth.getUser(token);

      if (error || !user) {
        logger.error("Failed to get user with token", { error: error?.message });
        return null;
      }

      if (user) {
        // Get user profile from our custom users table
        const userProfiles = await supabaseService.query("users", {
          match: { id: user.id },
          select: "id, email, first_name, last_name, phone, is_active, is_verified, created_at, updated_at"
        });

        let userProfile: User;
        if (userProfiles.data && userProfiles.data.length > 0) {
          const dbUser = userProfiles.data[0];
          userProfile = {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.first_name,
            lastName: dbUser.last_name,
            phone: dbUser.phone,
            isActive: dbUser.is_active ?? true,
            isVerified: dbUser.is_verified,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
          };
        } else {
          // If no profile exists in our custom table, use Supabase user data
          userProfile = {
            id: user.id,
            email: user.email || token, // Use token as fallback if email is undefined
            firstName: user.user_metadata?.first_name || '',
            lastName: user.user_metadata?.last_name || '',
            phone: user.phone || '',
            isActive: true, // Default to active
            isVerified: !!user.email_confirmed_at,
            createdAt: user.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(), // Updated at might not exist in Supabase user
          };
        }

        // Create a mock session since Supabase handles sessions automatically
        const mockSession: UserSession = {
          id: user.id + '-session',
          userId: user.id,
          token: token, // Use the provided token
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
        };

        return {
          user: userProfile,
          session: mockSession
        };
      }

      return null;
    } catch (error) {
      logger.error("Token refresh failed", { error });
      return null;
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    // With Supabase Auth, email verification is handled by Supabase
    // This method would be used if we had custom email verification
    logger.info("Using Supabase built-in email verification");
    return true;
  }

  async sendPasswordResetEmail(email: string): Promise<boolean> {
    try {
      logger.info("Sending password reset via Supabase Auth", { email });

      const { error } = await supabaseService.getClient().auth.resetPasswordForEmail(email);

      if (error) {
        logger.error("Password reset request failed", { error: error.message, email });
        return false;
      }

      logger.info("Password reset email sent", { email });
      return true;
    } catch (error) {
      logger.error("Password reset failed", { error, email });
      return false;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Supabase handles password reset through a different flow
    // This method is more of a placeholder in the Supabase context
    logger.info("Password reset should be handled through Supabase Auth link");
    return true;
  }
}

export default new AuthService();