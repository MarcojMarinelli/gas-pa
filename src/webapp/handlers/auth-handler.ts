/**
 * Authentication Handler
 * Handles login, logout, and token management
 */

import { ApiRequest, ValidationError } from '../types/api-types';
import { AuthService, SessionData } from '../middleware/auth';
import Logger from '../../core/logger';

export interface LoginResponse {
  token: string;
  user: {
    email: string;
    name: string;
    permissions: string[];
  };
  expiresIn: number;
  expiresAt: string;
}

/**
 * Login endpoint
 * Creates session from Google OAuth
 */
export async function login(request: ApiRequest): Promise<LoginResponse> {
  // In GAS environment, user is already authenticated via Google
  const token = AuthService.authenticateFromGoogleSession();

  if (!token) {
    throw new ValidationError('Failed to create session');
  }

  const session = AuthService.validateToken(token);

  if (!session) {
    throw new ValidationError('Failed to validate session');
  }

  Logger.info('Auth', 'User logged in', { email: session.email });

  return {
    token,
    user: {
      email: session.email,
      name: session.name,
      permissions: session.permissions
    },
    expiresIn: AuthService['SESSION_DURATION'], // 1 hour in ms
    expiresAt: new Date(session.expiresAt).toISOString()
  };
}

/**
 * Logout endpoint
 * Destroys session
 */
export async function logout(request: ApiRequest): Promise<{ message: string }> {
  const session = (request as any).session as SessionData | undefined;

  if (session) {
    // Extract token from header
    const authHeader = request.headers['Authorization'] || request.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      AuthService.destroySession(token);
      Logger.info('Auth', 'User logged out', { email: session.email });
    }
  }

  return { message: 'Logged out successfully' };
}

/**
 * Refresh token endpoint
 * Issues new token before expiration
 */
export async function refreshToken(request: ApiRequest): Promise<LoginResponse> {
  const session = (request as any).session as SessionData | undefined;

  if (!session) {
    throw new ValidationError('No active session');
  }

  // Extract old token
  const authHeader = request.headers['Authorization'] || request.headers['authorization'];
  if (!authHeader) {
    throw new ValidationError('Missing authorization header');
  }

  const oldToken = authHeader.split(' ')[1];

  // Create new token
  const newToken = AuthService.refreshSession(oldToken);

  if (!newToken) {
    throw new ValidationError('Failed to refresh session');
  }

  const newSession = AuthService.validateToken(newToken);

  if (!newSession) {
    throw new ValidationError('Failed to validate new session');
  }

  Logger.info('Auth', 'Token refreshed', { email: session.email });

  return {
    token: newToken,
    user: {
      email: newSession.email,
      name: newSession.name,
      permissions: newSession.permissions
    },
    expiresIn: AuthService['SESSION_DURATION'],
    expiresAt: new Date(newSession.expiresAt).toISOString()
  };
}

/**
 * Get current user info
 */
export async function getCurrentUser(request: ApiRequest): Promise<{
  email: string;
  name: string;
  permissions: string[];
}> {
  const session = (request as any).session as SessionData | undefined;

  if (!session) {
    throw new ValidationError('No active session');
  }

  return {
    email: session.email,
    name: session.name,
    permissions: session.permissions
  };
}

export const authHandler = {
  login,
  logout,
  refreshToken,
  getCurrentUser
};
