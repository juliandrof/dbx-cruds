import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCrud } from '../lib/api';
import { useStore } from '../store/useStore';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  GripVertical,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  Clock,
  CircleDot,
  Check,
  Palette,
} from 'lucide-react';

const DATA_TYPES = [
  { value: 'text', label: 'Texto', icon: Type, color: 'text-blue-600 bg-blue-100' },
  { value: 'integer', label: 'Inteiro', icon: Hash, color: 'text-purple-600 bg-purple-100' },
  { value: 'decimal', label: 'Decimal', icon: CircleDot, color: 'text-orange-600 bg-orange-100' },
  { value: 'boolean', label: 'Sim/Nao', icon: ToggleLeft, color: 'text-emerald-600 bg-emerald-100' },
  { value: 'date', label: 'Data', icon: Calendar, color: 'text-rose-600 bg-rose-100' },
  { value: 'datetime', label: 'Data/Hora', icon: Clock, color: 'text-cyan-600 bg-cyan-100' },
];

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#1e293b',
];

interface Column {
  id: string;
  name: string;
  data_type: string;
  is_required: boolean;
}

export default function CreateCrud() {
  const navigate = useNavigate();
  const addToast = useStore((s) => s.addToast);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [columns, setColumns] = useState<Column[]>([
    { id: '1', name: '', data_type: 'text', is_required: false },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addColumn = () => {
    setColumns([...columns, { id: Date.now().toString(), name: '', data_type: 'text', is_required: false }]);
  };

  const removeColumn = (id: string) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((c) => c.id !== id));
  };

  const updateColumn = (id: string, field: keyof Column, value: string | boolean) => {
    setColumns(columns.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const canNext = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return columns.every((c) => c.name.trim().length > 0);
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await createCrud({
        name: name.trim(),
        description: description.trim(),
        color,
        columns: columns.map((c) => ({
          name: c.name.trim(),
          data_type: c.data_type,
          is_required: c.is_required,
        })),
      });
      addToast('success', `CRUD "${name}" criado com sucesso!`);
      navigate(`/crud/${res.id}`);
    } catch (err: any) {
      addToast('error', err.message || 'Erro ao criar CRUD');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar ao painel
      </button>

      <h1 className="text-2xl font-bold mb-2">Criar novo CRUD</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step
                  ? 'accent-bg text-white'
                  : s < step
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            <span className={`text-sm hidden sm:inline ${s === step ? 'font-medium' : 'text-gray-400'}`}>
              {s === 1 ? 'Informacoes' : s === 2 ? 'Colunas' : 'Revisar'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-gray-300 dark:bg-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic info */}
      {step === 1 && (
        <div className="space-y-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nome do CRUD *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Clientes, Produtos, Pedidos..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 accent-ring"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Descricao</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo deste formulario..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 accent-ring resize-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-3">
              <Palette className="w-4 h-4" /> Cor do CRUD
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-xl transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Columns */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold">Defina as colunas</h3>
              <button
                onClick={addColumn}
                className="flex items-center gap-1.5 px-3 py-1.5 accent-bg text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {columns.map((col, i) => (
                <div key={col.id} className="px-6 py-4 flex items-start gap-3">
                  <GripVertical className="w-5 h-5 text-gray-300 mt-3 shrink-0 cursor-grab" />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColumn(col.id, 'name', e.target.value)}
                        placeholder={`Coluna ${i + 1}`}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 accent-ring"
                        autoFocus={i === columns.length - 1}
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <select
                        value={col.data_type}
                        onChange={(e) => updateColumn(col.id, 'data_type', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 accent-ring"
                      >
                        {DATA_TYPES.map((dt) => (
                          <option key={dt.value} value={dt.value}>{dt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex items-center">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={col.is_required}
                          onChange={(e) => updateColumn(col.id, 'is_required', e.target.checked)}
                          className="w-4 h-4 rounded accent-bg"
                        />
                        Obrig.
                      </label>
                    </div>
                    <div className="sm:col-span-1 flex items-center">
                      <button
                        onClick={() => removeColumn(col.id)}
                        disabled={columns.length <= 1}
                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-gray-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: color }}
            >
              {name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold">{name}</h3>
              {description && <p className="text-gray-500 text-sm">{description}</p>}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Colunas ({columns.length})</h4>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">#</th>
                    <th className="text-left px-4 py-2.5 font-medium">Nome</th>
                    <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
                    <th className="text-left px-4 py-2.5 font-medium">Obrigatorio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {columns.map((col, i) => {
                    const dt = DATA_TYPES.find((d) => d.value === col.data_type);
                    return (
                      <tr key={col.id}>
                        <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{col.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${dt?.color || ''}`}>
                            {dt && <dt.icon className="w-3 h-3" />}
                            {dt?.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">{col.is_required ? 'Sim' : 'Nao'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex items-center gap-2 px-5 py-2.5 accent-bg text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Proximo <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Criar CRUD
          </button>
        )}
      </div>
    </div>
  );
}
