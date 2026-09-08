import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../utils/supabaseClient'
import { LayoutDashboard, User, LogOut } from 'lucide-react'

export default function Layout({ children }) {
  const router = useRouter()
  const isLogin = router.pathname === '/login'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLogin) {
    return <div className="min-h-screen bg-paper font-sans text-ink">{children}</div>
  }

  return (
    <div className="min-h-screen bg-paper font-sans text-ink md:flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r border-line bg-white">
        <div className="px-5 py-5 border-b border-line">
          <Link href="/" className="font-mono text-sm text-ink">
            <span className="text-signal">/</span>job-app
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <SidebarLink href="/" icon={LayoutDashboard} active={router.pathname === '/'}>
            Dashboard
          </SidebarLink>
          <SidebarLink href="/profile" icon={User} active={router.pathname === '/profile'}>
            Profile
          </SidebarLink>
        </nav>
        <div className="px-3 py-4 border-t border-line">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-sm text-slate hover:text-ink px-3 py-2 rounded-card transition-colors"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>

      {/* Top bar — mobile */}
      <header className="md:hidden border-b border-line bg-white sticky top-0 z-10">
        <div className="px-4 py-3 flex justify-between items-center">
          <Link href="/" className="font-mono text-sm text-ink">
            <span className="text-signal">/</span>job-app
          </Link>
          <nav className="flex items-center gap-1">
            <MobileLink href="/" active={router.pathname === '/'}>
              Dashboard
            </MobileLink>
            <MobileLink href="/profile" active={router.pathname === '/profile'}>
              Profile
            </MobileLink>
            <button onClick={handleLogout} className="text-sm text-slate px-2">
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}

function SidebarLink({ href, icon: Icon, active, children }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 text-sm px-3 py-2 rounded-card transition-colors ${
        active ? 'bg-ink text-paper' : 'text-slate hover:bg-paper hover:text-ink'
      }`}
    >
      <Icon size={16} />
      {children}
    </Link>
  )
}

function MobileLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={`text-sm px-2.5 py-1 rounded transition-colors ${
        active ? 'bg-ink text-paper' : 'text-slate'
      }`}
    >
      {children}
    </Link>
  )
}
