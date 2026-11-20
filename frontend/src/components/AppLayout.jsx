import { NavLink, Outlet } from 'react-router';
import { LayoutDashboard, Users, UserPlus, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/circles', label: 'My Circles', icon: Users },
  { to: '/join', label: 'Join', icon: UserPlus },
  { to: '/trust', label: 'Trust', icon: ShieldCheck },
];

const desktopLink = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive ? 'bg-white/10 text-accent' : 'text-slate-300 hover:bg-white/5 hover:text-white'
  }`;

const mobileLink = ({ isActive }) =>
  `flex flex-col items-center gap-1 py-2 text-xs font-medium ${
    isActive ? 'text-accent-dark' : 'text-slate-500'
  }`;

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-primary p-4 text-white lg:flex">
        <div className="px-3 py-4 text-xl font-bold">
          Gameya <span className="text-accent">Manager</span>
        </div>

        <nav className="mt-4 flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={desktopLink}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 pt-4">
          <p className="truncate px-3 text-sm font-semibold">{user.name}</p>
          <p className="truncate px-3 text-xs text-slate-400">{user.email}</p>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-primary px-4 py-3 text-white lg:hidden">
        <span className="font-bold">
          Gameya <span className="text-accent">Manager</span>
        </span>
        <button
          onClick={logout}
          aria-label="Log out"
          className="rounded-lg p-2 text-slate-300 hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Page content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl p-4 pb-28 sm:p-6 lg:p-8 lg:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={mobileLink}>
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}