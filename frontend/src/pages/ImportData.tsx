import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCrud, importData, CrudDetail } from '../lib/api';
import { useStore } from '../store/useStore';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Check,
  Zap,
  X,
  AlertCircle,
} from 'lucide-react';

interface ExcelData {
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
  sampleRows: Record<string, unknown>[];
}

export default function ImportData() {
  const { id } = useParams<{ id: string }>();
  const crudId = Number(id);
  const navigate = useNavigate();
  const addToast = useStore((s) => s.addToast);
  const fileRef = useRef<HTMLInputElement>(null);

  const [crud, setCrud] = useState<CrudDetail | null>(null);
  const [excel, setExcel] = useState<ExcelData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<'upload' | 'map' | 'done'>('upload');
  const [result, setResult] = useState<{ inserted: number; errors: number } | null>(null);

  useEffect(() => {
    getCrud(crudId).then(setCrud).catch(() => addToast('error', 'CRUD nao encontrado'));
  }, [crudId]);

  const processFile = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      addToast('error', 'Apenas arquivos .xlsx sao suportados');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        if (json.length === 0) {
          addToast('error', 'Planilha vazia');
          return;
        }
        const headers = Object.keys(json[0]);
        setExcel({
          fileName: file.name,
          headers,
          rows: json,
          sampleRows: json.slice(0, 5),
        });
        setStep('map');
        autoMap(headers);
      } catch {
        addToast('error', 'Erro ao ler arquivo Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const autoMap = (excelHeaders: string[]) => {
    if (!crud) return;
    const newMapping: Record<string, string> = {};
    for (const col of crud.columns) {
      const colLower = col.name.toLowerCase().replace(/\s+/g, '');
      const dbLower = col.db_column.toLowerCase();
      const match = excelHeaders.find((h) => {
        const hLower = h.toLowerCase().replace(/\s+/g, '');
        return hLower === colLower || hLower === dbLower || hLower.includes(colLower) || colLower.includes(hLower);
      });
      if (match) newMapping[col.db_column] = match;
    }
    setMapping(newMapping);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!excel) return;
    setImporting(true);
    try {
      const res = await importData(crudId, mapping, excel.rows as Record<string, unknown>[]);
      setResult({ inserted: res.inserted, errors: res.errors });
      setStep('done');
      addToast('success', res.message);
    } catch (err: any) {
      addToast('error', err.message);
    } finally {
      setImporting(false);
    }
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  if (!crud) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 accent-border border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => navigate(`/crud/${crudId}`)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Voltar para {crud.name}
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: crud.color }}>
          {crud.name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">Importar dados</h1>
          <p className="text-gray-500 text-sm">Importe dados de uma planilha Excel para "{crud.name}"</p>
        </div>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            dragging
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
          }`}
        >
          <FileSpreadsheet className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Arraste seu arquivo Excel aqui</h3>
          <p className="text-gray-500 mb-6">ou clique para selecionar um arquivo .xlsx</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 accent-bg text-white rounded-xl font-medium hover:opacity-90"
          >
            <Upload className="w-5 h-5" /> Selecionar arquivo
          </button>
        </div>
      )}

      {/* Step: Map columns */}
      {step === 'map' && excel && (
        <div className="space-y-6">
          {/* File info */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
              <div>
                <div className="font-medium">{excel.fileName}</div>
                <div className="text-sm text-gray-500">{excel.rows.length.toLocaleString('pt-BR')} linhas &middot; {excel.headers.length} colunas</div>
              </div>
            </div>
            <button onClick={() => { setStep('upload'); setExcel(null); setMapping({}); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Auto-map button */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mapeamento de colunas</h2>
            <button
              onClick={() => autoMap(excel.headers)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium accent-text hover:accent-bg-light rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" /> Auto-mapear
            </button>
          </div>

          {/* Column mapping */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium">
              <div className="col-span-5">Coluna do CRUD</div>
              <div className="col-span-2 text-center">
                <ArrowRight className="w-4 h-4 mx-auto text-gray-400" />
              </div>
              <div className="col-span-5">Coluna do Excel</div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {crud.columns.map((col) => (
                <div key={col.id} className="grid grid-cols-12 items-center px-6 py-3 gap-2">
                  {/* CRUD column */}
                  <div className="col-span-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: crud.color }} />
                      <span className="font-medium text-sm">{col.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {col.data_type}
                      </span>
                      {col.is_required && (
                        <span className="text-xs text-rose-500">*</span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="col-span-2 flex justify-center">
                    <div className={`w-8 h-px ${mapping[col.db_column] ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-gray-700'}`} />
                    {mapping[col.db_column] && (
                      <Check className="w-4 h-4 text-emerald-500 -ml-1" />
                    )}
                  </div>

                  {/* Excel column selector */}
                  <div className="col-span-5">
                    <select
                      value={mapping[col.db_column] || ''}
                      onChange={(e) => setMapping({ ...mapping, [col.db_column]: e.target.value })}
                      className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 accent-ring ${
                        mapping[col.db_column]
                          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20'
                          : 'border-gray-200 dark:border-gray-700 bg-transparent'
                      }`}
                    >
                      <option value="">-- Selecione --</option>
                      {excel.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {mappedCount > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <h3 className="font-medium text-sm">Pre-visualizacao (5 primeiras linhas)</h3>
                <span className="text-xs text-gray-400">{mappedCount} de {crud.columns.length} colunas mapeadas</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      {crud.columns.filter((c) => mapping[c.db_column]).map((col) => (
                        <th key={col.id} className="text-left px-4 py-2 font-medium">{col.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {excel.sampleRows.map((row, i) => (
                      <tr key={i}>
                        {crud.columns.filter((c) => mapping[c.db_column]).map((col) => (
                          <td key={col.id} className="px-4 py-2 truncate max-w-xs">
                            {row[mapping[col.db_column]] != null ? String(row[mapping[col.db_column]]) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {mappedCount === 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-4 h-4" /> Mapeie pelo menos uma coluna
                </span>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={mappedCount === 0 || importing}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {importing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Importar {excel.rows.length.toLocaleString('pt-BR')} linhas
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && result && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Importacao concluida!</h2>
          <p className="text-gray-500 mb-6">
            {result.inserted.toLocaleString('pt-BR')} registro(s) importado(s) com sucesso
            {result.errors > 0 && <span className="text-rose-500"> ({result.errors} com erro)</span>}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setStep('upload'); setExcel(null); setMapping({}); setResult(null); }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Importar mais
            </button>
            <button
              onClick={() => navigate(`/crud/${crudId}`)}
              className="px-4 py-2.5 accent-bg text-white rounded-xl text-sm font-medium hover:opacity-90"
            >
              Ver dados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
