'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the security login page
    router.replace('/security/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-cream via-cream-beige to-light-coffee flex items-center justify-center">
      <div className="text-center">
        <div className="spinner-coffee-thick h-12 w-12 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-coffee-brown mb-2">Redirecting to Login...</h2>
        <p className="text-gray-600">Please wait while we redirect you to the login page.</p>
      </div>
    </div>
  );
}
