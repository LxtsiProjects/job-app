import { useEffect, useState } from 'react'
import { supabase } from '../../utils/supabaseClient'
import { useRouter } from 'next/router'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState(null)

  useEffect(() => {
    async function completeLogin() {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')

        // PKCE flow: an explicit ?code= param needs exchanging for a session.
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (error) throw error
        }

        // Implicit flow (tokens in the URL hash) resolves automatically —
        // either way, check the session once both paths have settled.
        const { data: { session } } = await supabase.auth.getSession()
        router.replace(session ? '/' : '/login')
      } catch (err) {
        setError(err.message)
      }
    }
    completeLogin()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className="text-sm text-slate font-mono">
        {error ? `Sign-in failed: ${error}` : 'Signing you in…'}
      </p>
    </div>
  )
}
