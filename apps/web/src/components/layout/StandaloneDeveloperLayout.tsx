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
  Home,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface StandaloneDeveloperLayoutProps {
  children: ReactNode;
  homeRoute: string;
  homeLabel: string;
  basePath: string;
}

export function StandaloneDeveloperLayout({
  children,
  homeRoute,
  homeLabel,
  basePath
}: StandaloneDeveloperLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: `${basePath}`, label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { path: `${basePath}/api-keys`, label: 'API Keys', icon: Key },
    { path: `${basePath}/webhooks`, label: 'Webhooks', icon: Webhook },
    { path: `${basePath}/logs`, label: 'Request Logs', icon: Activity },
    { path: `${basePath}/sandbox`, label: 'Sandbox', icon: TestTube },
    { path: `${basePath}/docs`, label: 'SDK & Libraries', icon: FileCode },
    { path: `${basePath}/settings`, label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 bg-gray-800">
            <div className="flex items-center gap-2">
              <Code2 className="w-8 h-8 text-indigo-400" />
              <span className="text-xl font-bold text-white">Developer</span>
            </div>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-700 text-gray-400"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Back to Home Button */}
          <div className="px-4 py-3 border-b border-gray-800">
            <Link
              to={homeRoute}
              className="flex items-center gap-2 px-4 py-3 text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to {homeLabel}</span>
            </Link>
          </div>

          {/* Environment Switcher */}
          <div className="px-4 py-3 border-b border-gray-800">
            <select className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="test">Test Environment</option>
              <option value="live">Live Environment</option>
            </select>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path) && item.path !== basePath;

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
          <div className="px-4 py-3 border-t border-gray-800">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors">
              <Terminal className="w-4 h-4" />
              Open API Console
            </button>
          </div>

          {/* User section */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-400">Developer Mode</p>
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
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                  Test Mode
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to={homeRoute}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                {homeLabel}
              </Link>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                Developer Portal
              </span>
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
