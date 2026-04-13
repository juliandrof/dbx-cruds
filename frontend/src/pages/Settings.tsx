import { useStore } from '../store/useStore';
import { Sun, Moon, Palette } from 'lucide-react';

const ACCENT_COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Escuro', value: '#1e293b' },
];

export default function Settings() {
  const { theme, accentColor, setTheme, setAccentColor } = useStore();

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold mb-2">Configuracoes</h1>
      <p className="text-gray-500 mb-8">Personalize o visual do seu DBX CRUDs</p>

      {/* Theme */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          Tema
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
              theme === 'light'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
              <Sun className="w-6 h-6 text-amber-500" />
            </div>
            <span className="font-medium text-sm">Claro</span>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
              theme === 'dark'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center">
              <Moon className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="font-medium text-sm">Escuro</span>
          </button>
        </div>
      </div>

      {/* Accent Color */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Cor de destaque
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setAccentColor(c.value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                accentColor === c.value
                  ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-105'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <div className="w-10 h-10 rounded-xl shadow-sm" style={{ backgroundColor: c.value }} />
              <span className="text-xs text-gray-500">{c.name}</span>
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
          <h3 className="text-sm font-medium mb-3 text-gray-500">Pre-visualizacao</h3>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 accent-bg text-white rounded-xl text-sm font-medium">
              Botao primario
            </button>
            <button className="px-4 py-2 accent-bg-light accent-text rounded-xl text-sm font-medium">
              Botao secundario
            </button>
            <div className="w-3 h-3 rounded-full accent-bg" />
            <span className="accent-text text-sm font-medium">Link colorido</span>
          </div>
        </div>
      </div>
    </div>
  );
}
