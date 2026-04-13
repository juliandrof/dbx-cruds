import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getCrud,
  listData,
  createRow,
  updateRow,
  deleteRow,
  batchDelete,
  exportData,
  CrudDetail,
  DataPage,
} from '../lib/api';
import { useStore } from '../store/useStore';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Settings2,
  ArrowUpDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CrudView() {
  const { id } = useParams<{ id: string }>();
  const crudId = Number(id);
  const addToast = useStore((s) => s.addToast);

  const [crud, setCrud] = useState<CrudDetail | null>(null);
  const [dataPage, setDataPage] = useState<DataPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('_created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Inline add/edit
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<number | null>(null);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const cols = useMemo(() => crud?.columns || [], [crud]);

  const loadData = async () => {
    try {
      const d = await listData(crudId, { search, page, sort_by: sortBy, sort_dir: sortDir });
      setDataPage(d);
    } catch {
      addToast('error', 'Erro ao carregar dados');
    }
  };

  useEffect(() => {
    getCrud(crudId)
      .then(setCrud)
      .catch(() => addToast('error', 'CRUD nao encontrado'))
      .finally(() => setLoading(false));
  }, [crudId]);

  useEffect(() => {
    if (crud) loadData();
  }, [crud, search, page, sortBy, sortDir]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setFormData({});
  };

  const startEdit = (row: Record<string, unknown>) => {
    setEditingId(row._id as number);
    setAdding(false);
    const fd: Record<string, string> = {};
    cols.forEach((c) => { fd[c.db_column] = row[c.db_column] != null ? String(row[c.db_column]) : ''; });
    setFormData(fd);
  };

  const cancelForm = () => {
    setAdding(false);
    setEditingId(null);
    setFormData({});
  };

  const saveAdd = async () => {
    try {
      await createRow(crudId, formData);
      addToast('success', 'Registro adicionado');
      cancelForm();
      loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateRow(crudId, editingId, formData);
      addToast('success', 'Registro atualizado');
      cancelForm();
      loadData();
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteRow(crudId, deleting);
      addToast('success', 'Registro excluido');
      loadData();
    } catch {
      addToast('error', 'Erro ao excluir');
    }
    setDeleting(null);
  };

  const handleBatchDelete = async () => {
    try {
      await batchDelete(crudId, Array.from(selected));
      addToast('success', `${selected.size} registros excluidos`);
      setSelected(new Set());
      loadData();
    } catch {
      addToast('error', 'Erro ao excluir');
    }
    setBatchDeleting(false);
  };

  const handleExport = async () => {
    try {
      const exp = await exportData(crudId);
      const ws = XLSX.utils.json_to_sheet(exp.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, crud?.name || 'Dados');
      XLSX.writeFile(wb, `${crud?.name || 'export'}.xlsx`);
      addToast('success', 'Arquivo exportado');
    } catch {
      addToast('error', 'Erro ao exportar');
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!dataPage) return;
    if (selected.size === dataPage.data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(dataPage.data.map((r) => r._id as number)));
    }
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const renderInput = (col: { db_column: string; data_type: string; name: string }) => {
    const value = formData[col.db_column] || '';
    const onChange = (v: string) => setFormData({ ...formData, [col.db_column]: v });

    if (col.data_type === 'boolean') {
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm">
          <option value="">--</option>
          <option value="true">Sim</option>
          <option value="false">Nao</option>
        </select>
      );
    }
    const type = col.data_type === 'date' ? 'date' : col.data_type === 'datetime' ? 'datetime-local' : col.data_type === 'integer' || col.data_type === 'decimal' ? 'number' : 'text';
    return (
      <input
        type={type}
        step={col.data_type === 'decimal' ? '0.01' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={col.name}
        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-1 accent-ring"
      />
    );
  };

  if (loading || !crud) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 accent-border border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rows = dataPage?.data || [];

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: crud.color }}
          >
            {crud.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{crud.name}</h1>
            {crud.description && <p className="text-gray-500 text-sm">{crud.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/crud/${crudId}/import`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            <FileSpreadsheet className="w-4 h-4" /> Importar
          </Link>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <Link to={`/crud/${crudId}/edit`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
            <Settings2 className="w-4 h-4" /> Editar
          </Link>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar em todos os campos..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 accent-ring"
          />
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 accent-bg text-white rounded-xl text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Adicionar
        </button>
        {selected.size > 0 && (
          <button
            onClick={() => setBatchDeleting(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
          >
            <Trash2 className="w-4 h-4" /> Excluir ({selected.size})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                {cols.map((col) => (
                  <th
                    key={col.id}
                    className="text-left px-4 py-3 font-medium cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    onClick={() => toggleSort(col.db_column)}
                  >
                    <div className="flex items-center gap-1">
                      {col.name}
                      <ArrowUpDown className={`w-3 h-3 ${sortBy === col.db_column ? 'accent-text' : 'text-gray-300'}`} />
                    </div>
                  </th>
                ))}
                <th className="w-24 px-4 py-3 text-right font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* Add row */}
              {adding && (
                <tr className="bg-indigo-50/50 dark:bg-indigo-950/20">
                  <td className="px-4 py-2" />
                  {cols.map((col) => (
                    <td key={col.id} className="px-4 py-2">{renderInput(col)}</td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={saveAdd} className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={cancelForm} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {rows.map((row) => (
                <tr key={row._id as number} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selected.has(row._id as number) ? 'bg-indigo-50/30 dark:bg-indigo-950/10' : ''}`}>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(row._id as number)}
                      onChange={() => toggleSelect(row._id as number)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  {cols.map((col) => (
                    <td key={col.id} className="px-4 py-2.5">
                      {editingId === row._id ? (
                        renderInput(col)
                      ) : col.data_type === 'boolean' ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          row[col.db_column] ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {row[col.db_column] ? 'Sim' : 'Nao'}
                        </span>
                      ) : (
                        <span className="truncate max-w-xs inline-block">
                          {row[col.db_column] != null ? String(row[col.db_column]) : '-'}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right">
                    {editingId === row._id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={saveEdit} className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelForm} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(row)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleting(row._id as number)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-gray-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {/* Empty state */}
              {rows.length === 0 && !adding && (
                <tr>
                  <td colSpan={cols.length + 2} className="px-4 py-12 text-center text-gray-400">
                    {search ? 'Nenhum resultado encontrado' : 'Nenhum registro. Clique em "Adicionar" para comecar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {dataPage && dataPage.total_pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {dataPage.total.toLocaleString('pt-BR')} registro{dataPage.total !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                {page} / {dataPage.total_pages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= dataPage.total_pages}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={deleting !== null}
        title="Excluir registro"
        message="Tem certeza que deseja excluir este registro?"
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
      <ConfirmDialog
        open={batchDeleting}
        title="Excluir registros"
        message={`Tem certeza que deseja excluir ${selected.size} registro(s)?`}
        confirmLabel="Excluir todos"
        danger
        onConfirm={handleBatchDelete}
        onCancel={() => setBatchDeleting(false)}
      />
    </div>
  );
}
