const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Erro na requisição');
  }
  return res.json();
}

// Types
export interface CrudDefinition {
  id: number;
  name: string;
  description: string;
  table_name: string;
  color: string;
  is_favorite: boolean;
  column_count: number;
  row_count: number;
  created_at: string;
  updated_at: string;
}

export interface CrudColumn {
  id: number;
  name: string;
  db_column: string;
  data_type: string;
  is_required: boolean;
  position: number;
}

export interface CrudDetail extends CrudDefinition {
  columns: CrudColumn[];
}

export interface DataPage {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Stats {
  total_cruds: number;
  total_rows: number;
  total_columns: number;
}

export interface ExcelPreview {
  file_name: string;
  headers: string[];
  sample_data: string[][];
  total_rows: number;
}

// Stats
export const getStats = () => request<Stats>('/stats');

// CRUDs
export const listCruds = () => request<CrudDefinition[]>('/cruds');
export const getCrud = (id: number) => request<CrudDetail>(`/cruds/${id}`);
export const createCrud = (body: {
  name: string;
  description: string;
  color: string;
  columns: { name: string; data_type: string; is_required: boolean }[];
}) => request<{ id: number; table_name: string }>('/cruds', { method: 'POST', body: JSON.stringify(body) });

export const updateCrud = (id: number, body: Record<string, unknown>) =>
  request(`/cruds/${id}`, { method: 'PUT', body: JSON.stringify(body) });

export const deleteCrud = (id: number) =>
  request(`/cruds/${id}`, { method: 'DELETE' });

// Columns
export const addColumn = (crudId: number, body: { name: string; data_type: string; is_required: boolean }) =>
  request<{ id: number; db_column: string }>(`/cruds/${crudId}/columns`, { method: 'POST', body: JSON.stringify(body) });

export const updateColumn = (crudId: number, colId: number, body: { name: string }) =>
  request(`/cruds/${crudId}/columns/${colId}`, { method: 'PUT', body: JSON.stringify(body) });

export const deleteColumn = (crudId: number, colId: number) =>
  request(`/cruds/${crudId}/columns/${colId}`, { method: 'DELETE' });

// Data
export const listData = (crudId: number, params: {
  search?: string; page?: number; page_size?: number; sort_by?: string; sort_dir?: string;
}) => {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.page_size) qs.set('page_size', String(params.page_size));
  if (params.sort_by) qs.set('sort_by', params.sort_by);
  if (params.sort_dir) qs.set('sort_dir', params.sort_dir);
  return request<DataPage>(`/cruds/${crudId}/data?${qs}`);
};

export const createRow = (crudId: number, data: Record<string, unknown>) =>
  request(`/cruds/${crudId}/data`, { method: 'POST', body: JSON.stringify({ data }) });

export const updateRow = (crudId: number, rowId: number, data: Record<string, unknown>) =>
  request(`/cruds/${crudId}/data/${rowId}`, { method: 'PUT', body: JSON.stringify({ data }) });

export const deleteRow = (crudId: number, rowId: number) =>
  request(`/cruds/${crudId}/data/${rowId}`, { method: 'DELETE' });

export const batchDelete = (crudId: number, rowIds: number[]) =>
  request(`/cruds/${crudId}/data/batch-delete`, { method: 'POST', body: JSON.stringify(rowIds) });

// Import/Export
export const previewExcel = async (crudId: number, file: File): Promise<ExcelPreview> => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/cruds/${crudId}/import/preview`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro' }));
    throw new Error(err.detail);
  }
  return res.json();
};

export const importData = (crudId: number, mapping: Record<string, string>, rows: Record<string, unknown>[]) =>
  request<{ inserted: number; errors: number; message: string }>(`/cruds/${crudId}/import`, {
    method: 'POST',
    body: JSON.stringify({ mapping, rows }),
  });

export const exportData = (crudId: number) =>
  request<{ columns: string[]; data: Record<string, unknown>[] }>(`/cruds/${crudId}/export`);
