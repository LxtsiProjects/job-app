import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

export default function Login() {
  const router = useRouter()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/')
    })
  }, [router])

  async function handleEmailAuth(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        setMessage('Check your inbox — click the confirmation link to activate your account, then sign in here.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
      }
    } catch (err) {
      // Supabase's own message for this case is accurate, just surface it plainly
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white border border-line rounded-2xl shadow-md p-8 w-full max-w-sm">
          <p className="font-mono text-xs text-slate mb-2 tracking-wide text-center">01 · SIGN IN</p>
          <h1 className="text-xl font-semibold mb-2 text-center">Job Application System</h1>
          <p className="mb-6 text-sm text-slate text-center">
            Track new roles, generate documents, and follow every application through to an offer.
          </p>

          <div className="flex border border-line rounded-card overflow-hidden mb-5 text-sm">
            <button
              onClick={() => { setMode('signin'); setError(null); setMessage(null) }}
              className={`flex-1 py-2 transition-colors ${mode === 'signin' ? 'bg-ink text-paper' : 'text-slate'}`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); setMessage(null) }}
              className={`flex-1 py-2 transition-colors ${mode === 'signup' ? 'bg-ink text-paper' : 'text-slate'}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line rounded-card px-3 py-2 text-sm"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line rounded-card px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-signal hover:bg-signalDark text-white font-medium py-2.5 px-4 rounded-card transition-colors disabled:opacity-50"
            >
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {message && <p className="mt-4 text-sm text-stageOffer">{message}</p>}
          {error && <p className="mt-4 text-sm text-stageRejected">{error}</p>}

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-line flex-1" />
            <span className="text-xs text-slate">or</span>
            <div className="h-px bg-line flex-1" />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full border border-line hover:bg-line/40 text-ink font-medium py-2.5 px-4 rounded-card transition-colors text-sm"
          >
            Continue with Google
          </button>
        </div>
      </div>
    </Layout>
  )
}
