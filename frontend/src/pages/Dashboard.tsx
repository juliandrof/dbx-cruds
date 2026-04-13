import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCruds, getStats, CrudDefinition, Stats, updateCrud } from '../lib/api';
import { useStore } from '../store/useStore';
import {
  Database,
  Plus,
  Rows3,
  Columns3,
  Star,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Search,
  ArrowRight,
  Table2,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import { deleteCrud } from '../lib/api';

export default function Dashboard() {
  const [cruds, setCruds] = useState<CrudDefinition[]>([]);
  const [stats, setStats] = useState<Stats>({ total_cruds: 0, total_rows: 0, total_columns: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [deleting, setDeleting] = useState<CrudDefinition | null>(null);
  const addToast = useStore((s) => s.addToast);

  const load = async () => {
    try {
      const [c, s] = await Promise.all([listCruds(), getStats()]);
      setCruds(c);
      setStats(s);
    } catch {
      addToast('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleFav = async (crud: CrudDefinition) => {
    try {
      await updateCrud(crud.id, { is_favorite: !crud.is_favorite });
      setCruds((prev) => prev.map((c) => c.id === crud.id ? { ...c, is_favorite: !c.is_favorite } : c));
    } catch {
      addToast('error', 'Erro ao atualizar favorito');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteCrud(deleting.id);
      setCruds((prev) => prev.filter((c) => c.id !== deleting.id));
      addToast('success', `"${deleting.name}" excluido`);
    } catch {
      addToast('error', 'Erro ao excluir');
    }
    setDeleting(null);
  };

  const filtered = cruds.filter(
    (c) => c.name.toLowerCase().includes(filter.toLowerCase()) || c.description.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 accent-border border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie seus formularios e dados</p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 accent-bg text-white rounded-xl font-medium shadow-md hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Novo CRUD
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Database, label: 'CRUDs', value: stats.total_cruds, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-950' },
          { icon: Rows3, label: 'Registros', value: stats.total_rows, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950' },
          { icon: Columns3, label: 'Colunas', value: stats.total_columns, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold">{s.value.toLocaleString('pt-BR')}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      {cruds.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar CRUDs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 accent-ring transition-shadow"
          />
        </div>
      )}

      {/* CRUD Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Table2 className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {cruds.length === 0 ? 'Nenhum CRUD criado' : 'Nenhum resultado'}
          </h3>
          <p className="text-gray-500 mb-6">
            {cruds.length === 0
              ? 'Crie seu primeiro CRUD para comecar a organizar seus dados'
              : 'Tente buscar com outros termos'}
          </p>
          {cruds.length === 0 && (
            <Link
              to="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 accent-bg text-white rounded-xl font-medium"
            >
              <Plus className="w-5 h-5" /> Criar primeiro CRUD
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((crud) => (
            <div
              key={crud.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm card-hover overflow-hidden"
            >
              {/* Color bar */}
              <div className="h-1.5" style={{ backgroundColor: crud.color }} />

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: crud.color }}
                    >
                      {crud.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{crud.name}</h3>
                      {crud.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">{crud.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFav(crud)}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Star
                      className={`w-4 h-4 ${crud.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <Columns3 className="w-3.5 h-3.5" /> {crud.column_count} colunas
                  </span>
                  <span className="flex items-center gap-1">
                    <Rows3 className="w-3.5 h-3.5" /> {crud.row_count.toLocaleString('pt-BR')} registros
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/crud/${crud.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 accent-bg text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Abrir <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/crud/${crud.id}/edit`}
                    className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/crud/${crud.id}/import`}
                    className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    title="Importar Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setDeleting(crud)}
                    className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-rose-50 dark:hover:bg-rose-950 hover:border-rose-300 dark:hover:border-rose-800 text-gray-500 hover:text-rose-600 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir CRUD"
        message={`Tem certeza que deseja excluir "${deleting?.name}"? Os dados serao mantidos mas o CRUD nao ficara mais visivel.`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
