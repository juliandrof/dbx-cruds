import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCrud, updateCrud, addColumn, updateColumn, deleteColumn, CrudDetail } from '../lib/api';
import { useStore } from '../store/useStore';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Palette,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  Clock,
  CircleDot,
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

export default function EditCrud() {
  const { id } = useParams<{ id: string }>();
  const crudId = Number(id);
  const navigate = useNavigate();
  const addToast = useStore((s) => s.addToast);

  const [crud, setCrud] = useState<CrudDetail | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [newColRequired, setNewColRequired] = useState(false);
  const [deletingCol, setDeletingCol] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    getCrud(crudId).then((c) => {
      setCrud(c);
      setName(c.name);
      setDescription(c.description);
      setColor(c.color);
    }).catch(() => addToast('error', 'CRUD nao encontrado'));
  }, [crudId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCrud(crudId, { name: name.trim(), description: description.trim(), color });
      addToast('success', 'CRUD atualizado');
      navigate(`/crud/${crudId}`);
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddColumn = async () => {
    if (!newColName.trim()) return;
    try {
      await addColumn(crudId, { name: newColName.trim(), data_type: newColType, is_required: newColRequired });
      addToast('success', `Coluna "${newColName}" adicionada`);
      setNewColName('');
      setNewColType('text');
      setNewColRequired(false);
      const updated = await getCrud(crudId);
      setCrud(updated);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleRenameCol = async (colId: number, newName: string) => {
    try {
      await updateColumn(crudId, colId, { name: newName });
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleDeleteCol = async () => {
    if (!deletingCol) return;
    try {
      await deleteColumn(crudId, deletingCol.id);
      addToast('success', `Coluna "${deletingCol.name}" removida`);
      const updated = await getCrud(crudId);
      setCrud(updated);
    } catch (err: any) {
      addToast('error', err.message);
    }
    setDeletingCol(null);
  };

  if (!crud) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 accent-border border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <button onClick={() => navigate(`/crud/${crudId}`)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <h1 className="text-2xl font-bold mb-6">Editar CRUD</h1>

      {/* Basic info */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-5 mb-6">
        <h2 className="font-semibold text-lg">Informacoes gerais</h2>
        <div>
          <label className="block text-sm font-medium mb-2">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 accent-ring"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Descricao</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 accent-ring resize-none"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-3">
            <Palette className="w-4 h-4" /> Cor
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-xl transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-5 py-2.5 accent-bg text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar alteracoes
        </button>
      </div>

      {/* Columns */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-lg">Colunas ({crud.columns.length})</h2>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {crud.columns.map((col) => {
            const dt = DATA_TYPES.find((d) => d.value === col.data_type);
            return (
              <div key={col.id} className="px-6 py-3 flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${dt?.color || ''}`}>
                  {dt && <dt.icon className="w-3 h-3" />}
                  {dt?.label}
                </span>
                <input
                  type="text"
                  defaultValue={col.name}
                  onBlur={(e) => {
                    if (e.target.value !== col.name) handleRenameCol(col.id, e.target.value);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600 bg-transparent text-sm focus:outline-none"
                />
                <span className="text-xs text-gray-400 font-mono">{col.db_column}</span>
                <button
                  onClick={() => setDeletingCol({ id: col.id, name: col.name })}
                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-gray-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Add column */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <h3 className="text-sm font-medium mb-3">Adicionar nova coluna</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Nome da coluna"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 accent-ring"
              />
            </div>
            <div className="w-36">
              <select
                value={newColType}
                onChange={(e) => setNewColType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none"
              >
                {DATA_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm shrink-0">
              <input type="checkbox" checked={newColRequired} onChange={(e) => setNewColRequired(e.target.checked)} className="w-4 h-4 rounded" />
              Obrig.
            </label>
            <button
              onClick={handleAddColumn}
              disabled={!newColName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 accent-bg text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deletingCol}
        title="Remover coluna"
        message={`Tem certeza que deseja remover a coluna "${deletingCol?.name}"? Os dados existentes nessa coluna serao preservados mas nao ficarao mais visiveis.`}
        confirmLabel="Remover"
        danger
        onConfirm={handleDeleteCol}
        onCancel={() => setDeletingCol(null)}
      />
    </div>
  );
}
