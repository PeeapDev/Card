import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Key,
  Webhook,
  Activity,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Code2,
  Terminal,
  TestTube,
  FileCode,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface DeveloperLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/developer', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/developer/api-keys', label: 'API Keys', icon: Key },
  { path: '/developer/webhooks', label: 'Webhooks', icon: Webhook },
  { path: '/developer/logs', label: 'Request Logs', icon: Activity },
  { path: '/developer/sandbox', label: 'Sandbox', icon: TestTube },
  { path: '/developer/docs', label: 'Documentation', icon: BookOpen },
  { path: '/developer/sdks', label: 'SDKs & Libraries', icon: FileCode },
  { path: '/developer/settings', label: 'Settings', icon: Settings },
];

export function DeveloperLayout({ children }: DeveloperLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 bg-gray-800">
            <Link to="/developer" className="flex items-center gap-2">
              <Code2 className="w-8 h-8 text-indigo-400" />
              <span className="text-xl font-bold text-white">Developer</span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-700 text-gray-400"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Environment Switcher */}
          <div className="px-4 py-3 border-b border-gray-700">
            <select className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700">
              <option value="live">Live Environment</option>
              <option value="test">Test Environment</option>
            </select>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/developer' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center px-4 py-2.5 rounded-lg transition-colors text-sm',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* API Console */}
          <div className="px-4 py-3 border-t border-gray-700">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors">
              <Terminal className="w-4 h-4" />
              Open API Console
            </button>
          </div>

          {/* User section */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-400">Developer Account</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors text-sm"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-flex px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                Developer Portal
              </span>
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
