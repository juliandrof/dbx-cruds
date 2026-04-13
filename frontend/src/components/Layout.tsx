import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStore } from '../store/useStore';
import { Menu } from 'lucide-react';

export default function Layout() {
  const { sidebarOpen, toggleSidebar } = useStore();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 glass shrink-0 lg:hidden">
          <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-3 font-semibold text-lg">DBX CRUDs</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
