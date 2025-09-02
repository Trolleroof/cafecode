/**
 * Security-related constants and configuration
 */

export const SECURITY_CONFIG = {
  // OAuth redirect URLs
  OAUTH_REDIRECT_URL: 'https://www.trycafecode.xyz/security/auth-callback',
  
  // Token validation
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  
  // Session timeout
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  
  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  },
  
  // Allowed origins for CORS
  ALLOWED_ORIGINS: [
    'https://www.trycafecode.xyz',
    'https://trycafecode.xyz',
    'http://localhost:3000', // For development
  ],
  
  // Error messages
  ERROR_MESSAGES: {
    AUTH_FAILED: 'Authentication failed. Please try again.',
    TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
    INVALID_TOKEN: 'Invalid authentication token.',
    ACCESS_DENIED: 'Access denied. Please log in.',
    SECURITY_ERROR: 'A security error occurred. Please try again.',
  }
};

export const SECURITY_ROUTES = {
  LOGIN: '/security/login',
  SIGNUP: '/security/sign-up',
  AUTH_CALLBACK: '/security/auth-callback',
  LOGOUT: '/security/logout',
} as const;

export type SecurityRoute = typeof SECURITY_ROUTES[keyof typeof SECURITY_ROUTES];
