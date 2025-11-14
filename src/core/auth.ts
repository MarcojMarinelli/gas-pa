import Logger from './logger';

/**
 * Authentication and authorization manager for GAS-PA
 */
class AuthManager {
  /**
   * Get the current authenticated user
   */
  static getCurrentUser(): { email: string; name?: string } {
    try {
      const email = Session.getActiveUser().getEmail();
      return {
        email: email || 'unknown@example.com',
        name: email?.split('@')[0]
      };
    } catch (error) {
      Logger.error('AuthManager', 'Failed to get current user', error);
      return { email: 'unknown@example.com' };
    }
  }

  /**
   * Check if user has a specific permission
   */
  static hasPermission(permission: string): boolean {
    try {
      // For now, all authenticated users have all permissions
      // This can be extended to check against a permissions database
      const user = Session.getActiveUser().getEmail();

      if (!user) {
        return false;
      }

      // Admin users have all permissions
      const admins = PropertiesService.getScriptProperties()
        .getProperty('ADMIN_USERS')?.split(',') || [];

      if (admins.includes(user)) {
        return true;
      }

      // Check specific permissions
      switch (permission) {
        case 'read':
          return true; // All users can read
        case 'write':
          return true; // All users can write
        case 'configure':
          return admins.includes(user); // Only admins can configure
        default:
          return false;
      }
    } catch (error) {
      Logger.error('AuthManager', `Failed to check permission: ${permission}`, error);
      return false;
    }
  }

  /**
   * Verify API token
   */
  static verifyToken(token: string): boolean {
    try {
      const validToken = PropertiesService.getScriptProperties()
        .getProperty('API_TOKEN');

      return !validToken || token === validToken;
    } catch (error) {
      Logger.error('AuthManager', 'Failed to verify token', error);
      return false;
    }
  }

  /**
   * Generate new API token
   */
  static generateToken(): string {
    try {
      const token = Utilities.getUuid();
      PropertiesService.getScriptProperties()
        .setProperty('API_TOKEN', token);

      Logger.info('AuthManager', 'Generated new API token');
      return token;
    } catch (error) {
      Logger.error('AuthManager', 'Failed to generate token', error);
      throw error;
    }
  }
}

export default AuthManager;