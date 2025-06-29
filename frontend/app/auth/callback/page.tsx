'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth callback error:', error)
        router.push('/?error=auth_failed')
        return
      }

      if (data.session?.user) {
        // Check if user profile exists, if not create one
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single()

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.session.user.id,
                email: data.session.user.email,
                username: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0],
              },
            ])

          if (insertError) {
            console.error('Error creating profile:', insertError)
          }
        }

        router.push('/ide')
      } else {
        router.push('/?error=no_session')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#094074] to-[#3c6997]">
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-[#ffdd4a] animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-[#5adbff] mb-2">Completing Sign In</h2>
        <p className="text-[#5adbff]/70">Please wait while we set up your account...</p>
      </div>
    </div>
  )
} 