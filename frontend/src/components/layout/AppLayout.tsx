import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/recovery-jobs': 'Recovery Jobs',
  '/appointments': 'Appointments',
  '/waitlist': 'Waitlist',
  '/customers': 'Customers',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export function AppLayout() {
  const location = useLocation();
  const pathKey = '/' + location.pathname.split('/')[1];
  const title = pageTitles[pathKey] ?? 'Jericho';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="hidden w-56 shrink-0 lg:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-6">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
