import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  LayoutDashboard,
  Plus,
  Settings,
  Database,
  X,
  Star,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { listCruds, CrudDefinition } from '../lib/api';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Painel' },
  { to: '/create', icon: Plus, label: 'Novo CRUD' },
  { to: '/settings', icon: Settings, label: 'Configuracoes' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useStore();
  const location = useLocation();
  const [favs, setFavs] = useState<CrudDefinition[]>([]);

  useEffect(() => {
    listCruds()
      .then((cruds) => setFavs(cruds.filter((c) => c.is_favorite)))
      .catch(() => {});
  }, [location.pathname]);

  return (
    <>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <Database className="w-7 h-7 accent-text" />
          <span className="ml-3 text-xl font-bold tracking-tight">
            DBX <span className="accent-text">CRUDs</span>
          </span>
          <button
            onClick={toggleSidebar}
            className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'accent-bg text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}

          {/* Favorites */}
          {favs.length > 0 && (
            <div className="pt-4">
              <div className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Favoritos
              </div>
              {favs.map((crud) => (
                <Link
                  key={crud.id}
                  to={`/crud/${crud.id}`}
                  onClick={() => window.innerWidth < 1024 && toggleSidebar()}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors
                    ${location.pathname === `/crud/${crud.id}`
                      ? 'bg-gray-100 dark:bg-gray-800 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }
                  `}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: crud.color }}
                  />
                  <span className="truncate">{crud.name}</span>
                  <Star className="w-3.5 h-3.5 text-amber-400 ml-auto shrink-0 fill-amber-400" />
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-400">
          Powered by Databricks Lakebase
        </div>
      </aside>
    </>
  );
}
