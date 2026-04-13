import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppState {
  // Theme
  theme: 'light' | 'dark';
  accentColor: string;
  sidebarOpen: boolean;
  setTheme: (t: 'light' | 'dark') => void;
  setAccentColor: (c: string) => void;
  toggleSidebar: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      accentColor: '#6366f1',
      sidebarOpen: true,

      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
      setAccentColor: (accentColor) => {
        const hex = accentColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        document.documentElement.style.setProperty('--accent', `${r} ${g} ${b}`);
        set({ accentColor });
      },
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      toasts: [],
      addToast: (type, message) => {
        const id = Date.now().toString(36);
        set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'dbx-cruds-settings',
      partialize: (state) => ({
        theme: state.theme,
        accentColor: state.accentColor,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);
