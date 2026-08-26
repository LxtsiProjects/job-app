import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

export default function Login() {
  const router = useRouter()
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/')
    })
  }, [router])

  async function handleLogin() {
    setError(null)
    // window.location.origin means this works on localhost AND after
    // you deploy to Vercel, without editing code — just add both URLs
    // to Supabase's allowed redirect list.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white border border-line rounded-card shadow-sm p-8 w-full max-w-sm text-center">
          <p className="font-mono text-xs text-slate mb-2 tracking-wide">01 · SIGN IN</p>
          <h1 className="text-xl font-semibold mb-2">Job Application System</h1>
          <p className="mb-6 text-sm text-slate">
            Track new roles, generate documents, and follow every application through to an offer.
          </p>
          <button
            onClick={handleLogin}
            className="w-full bg-signal hover:bg-signalDark text-white font-medium py-2.5 px-4 rounded-card transition-colors"
          >
            Continue with Google
          </button>
          {error && <p className="mt-4 text-sm text-stageRejected">{error}</p>}
        </div>
      </div>
    </Layout>
  )
}
