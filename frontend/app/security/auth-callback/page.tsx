'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { securityUtils } from '../utils/security';
import { SECURITY_CONFIG, SECURITY_ROUTES } from '../utils/constants';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the access token from URL if it exists
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (accessToken && securityUtils.isValidToken(accessToken)) {
          // Set the session securely using our security utils
          await securityUtils.setSecureSession(accessToken, refreshToken || '');
          
          // Clean the URL to remove sensitive parameters
          securityUtils.cleanUrl();

          // Redirect to the intended destination
          router.push('/ide');
        } else {
          // No valid token in URL, try to get session normally
          const session = await securityUtils.getSecureSession();
          if (session) {
            router.push('/ide');
          } else {
            router.push(SECURITY_ROUTES.LOGIN);
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push(`${SECURITY_ROUTES.LOGIN}?error=auth_failed`);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-cream via-cream-beige to-light-coffee flex items-center justify-center">
      <div className="text-center">
        <div className="spinner-coffee-thick h-12 w-12 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-coffee-brown mb-2">Completing Authentication...</h2>
        <p className="text-gray-600">Please wait while we securely log you in.</p>
      </div>
    </div>
  );
}
