/**
 * Security module exports
 * Centralized security utilities and components
 */

// Components
export { ProtectedRoute } from './components/ProtectedRoute';

// Hooks
export { useAuth } from './hooks/useAuth';

// Utils
export { securityUtils } from './utils/security';
export { SECURITY_CONFIG, SECURITY_ROUTES } from './utils/constants';

// Types
export type { SecurityRoute } from './utils/constants';
