import { useStore } from '../store/useStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};
const bg = {
  success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  error: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
  info: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
};

export default function Toasts() {
  const { toasts, removeToast } = useStore();
  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className={`animate-slide-in flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${bg[t.type]}`}>
          {icons[t.type]}
          <span className="text-sm flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="p-0.5 hover:bg-black/10 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
