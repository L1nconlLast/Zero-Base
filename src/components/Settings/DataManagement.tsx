import React, { useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { safeParseAndValidate } from '../../utils/validation';
import { ConfirmModal } from '../UI/ConfirmModal';
import toast from 'react-hot-toast';

interface DataManagementProps {
  data: {
    sessions: unknown[];
    userLevel: number;
    xp: number;
    exportedAt: string;
  };
  onClear: () => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ data, onClear }) => {
  const [importJson, setImportJson] = useState('');
  const [error, setError] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);

  const primaryStyle = { color: 'var(--color-primary)' };
  const primaryBgStyle = { backgroundColor: 'var(--color-primary)' };
  const primarySoftStyle = {
    backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-primary) 28%, transparent)',
  };

  const secondaryStyle = { color: 'var(--color-secondary)' };
  const secondaryBgStyle = { backgroundColor: 'var(--color-secondary)' };
  const secondarySoftStyle = {
    backgroundColor: 'color-mix(in srgb, var(--color-secondary) 12%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-secondary) 28%, transparent)',
  };
  const secondaryRingStyle = {
    '--tw-ring-color': 'var(--color-secondary)',
  } as unknown as React.CSSProperties;

  const handleExport = () => {
    const exportData = {
      ...data,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zero-base-dados-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Dados exportados com sucesso!');
  };

  const handleImport = () => {
    setError('');
    if (!importJson.trim()) {
      setError('Cole o JSON para importar');
      return;
    }

    const result = safeParseAndValidate(importJson);
    if (!result.success) {
      setError(result.error);
      return;
    }

    // Dados validados, agora insere no localStorage
    const backup = result.data;
    const importedData = backup.data;
    localStorage.setItem('zero-base-sessions', JSON.stringify(importedData.sessions));
    localStorage.setItem('zero-base-level', importedData.level.toString());
    localStorage.setItem('zero-base-xp', importedData.totalPoints.toString());
    // Legacy fallback para versões antigas do app.
    localStorage.setItem('medicina-sessions', JSON.stringify(importedData.sessions));
    localStorage.setItem('medicina-level', importedData.level.toString());
    localStorage.setItem('medicina-xp', importedData.totalPoints.toString());

    toast.success('Dados importados com sucesso! A página será recarregada.');
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border" style={primarySoftStyle}>
          <p className="text-sm mb-2" style={primaryStyle}>Sessões Registradas</p>
          <p className="text-3xl font-bold" style={primaryStyle}>{data.sessions.length}</p>
        </div>
        <div className="p-6 rounded-xl border" style={secondarySoftStyle}>
          <p className="text-sm mb-2" style={secondaryStyle}>Nível Atual</p>
          <p className="text-3xl font-bold" style={secondaryStyle}>{data.userLevel}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
          <p className="text-sm text-emerald-600 mb-2">XP Total</p>
          <p className="text-3xl font-bold text-emerald-700">{data.xp.toLocaleString()}</p>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Download size={20} style={primaryStyle} />
          Exportar Dados
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Faça backup de todos os seus dados em um arquivo JSON.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 py-3 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={primaryBgStyle}
          >
            <Download size={18} />
            Download JSON
          </button>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Upload size={20} style={secondaryStyle} />
          Importar Dados
        </h3>
        <p className="text-gray-600 mb-4 text-sm">
          Restaure seus dados a partir de um backup anterior.
        </p>
        
        <div className="space-y-4">
          <textarea
            value={importJson}
            onChange={(e) => {
              setImportJson(e.target.value);
              setError('');
            }}
            placeholder="Cole aqui o JSON exportado..."
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 font-mono text-sm"
            style={secondaryRingStyle}
          />
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
               {error}
            </div>
          )}

          <button
            onClick={handleImport}
            className="w-full py-3 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={secondaryBgStyle}
          >
            <Upload size={18} />
            Importar Dados
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
        <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
          <Trash2 size={20} />
          Zona de Perigo
        </h3>
        <p className="text-red-600 mb-4 text-sm">
          Esta ação é irreversível. Todos os seus dados serão apagados permanentemente.
        </p>
        <button
          onClick={() => setShowClearModal(true)}
          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
        >
          <Trash2 size={18} />
          Apagar Todos os Dados
        </button>

        <ConfirmModal
          open={showClearModal}
          title="Apagar Todos os Dados"
          message="Esta ação é irreversível. Todos os seus dados serão apagados permanentemente."
          confirmLabel="Apagar Tudo"
          variant="danger"
          onConfirm={() => {
            onClear();
            setShowClearModal(false);
            toast.success('Dados apagados.');
          }}
          onCancel={() => setShowClearModal(false)}
        />
      </div>

      {/* Info */}
      <div className="border rounded-lg p-4 text-sm" style={{ ...primarySoftStyle, color: 'var(--color-primary)' }}>
        <p className="font-semibold mb-2"> Informações sobre Dados</p>
        <ul className="space-y-1 text-xs">
          <li>• Seus dados são salvos localmente no seu navegador</li>
          <li>• Exporte regularmente para não perder informações</li>
          <li>• Use a importação para restaurar dados em outro dispositivo ou navegador</li>
          <li>• Última atualização: {new Date(data.exportedAt).toLocaleString('pt-BR')}</li>
        </ul>
      </div>
    </div>
  );
};
