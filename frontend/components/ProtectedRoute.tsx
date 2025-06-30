'use client'

import { useRouter } from 'next/navigation'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()

  // Note: Authentication logic has been removed
  // This component now renders children without protection

  return <>{children}</>
}