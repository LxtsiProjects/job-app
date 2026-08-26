import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../utils/supabaseClient'

export default function Layout({ children }) {
  const router = useRouter()
  const isLogin = router.pathname === '/login'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-paper font-sans text-ink">
      {!isLogin && (
        <header className="border-b border-line bg-paper/95 backdrop-blur sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
            <Link href="/" className="font-mono text-sm tracking-wide text-ink">
              <span className="text-signal">/</span>job-app
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink href="/" active={router.pathname === '/'}>Dashboard</NavLink>
              <NavLink href="/profile" active={router.pathname === '/profile'}>Profile</NavLink>
              <button
                onClick={handleLogout}
                className="ml-2 text-sm text-slate hover:text-ink px-3 py-1.5 rounded transition-colors"
              >
                Log out
              </button>
            </nav>
          </div>
        </header>
      )}
      <main>{children}</main>
    </div>
  )
}

function NavLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={`text-sm px-3 py-1.5 rounded transition-colors ${
        active ? 'bg-ink text-paper' : 'text-slate hover:text-ink'
      }`}
    >
      {children}
    </Link>
  )
}
