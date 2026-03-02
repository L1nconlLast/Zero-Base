import React, { useState } from 'react';
import { Database, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { UserData } from '../types';
import toast from 'react-hot-toast';
import { safeParseAndValidate } from '../utils/validation';

interface LocalStoragePageProps {
  userData: UserData;
  onImportData: (data: UserData) => void;
  onClearData: () => void;
}

const LocalStoragePage: React.FC<LocalStoragePageProps> = ({
  userData,
  onImportData,
  onClearData
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const primaryStyle = { color: 'var(--color-primary)' };
  const primaryBgStyle = { backgroundColor: 'var(--color-primary)' };
  const primarySoftStyle = {
    backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-primary) 28%, transparent)',
  };

  const secondaryStyle = { color: 'var(--color-secondary)' };
  const secondarySoftStyle = {
    backgroundColor: 'color-mix(in srgb, var(--color-secondary) 12%, transparent)',
    borderColor: 'color-mix(in srgb, var(--color-secondary) 28%, transparent)',
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medicina-do-zero-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Dados exportados com sucesso!');
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = safeParseAndValidate(text);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onImportData(result.data.data);
      toast.success('Dados importados com sucesso!');
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    onClearData();
    setShowClearConfirm(false);
    toast.success('Todos os dados foram limpos!');
  };

  const calculateStorageSize = () => {
    const dataStr = JSON.stringify(userData);
    return (new Blob([dataStr]).size / 1024).toFixed(2);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Database className="w-8 h-8" />
          Gerenciamento de Dados
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gerencie seus dados locais, faça backup e restaure informações
        </p>
      </div>

      <div className="space-y-6">
        {/* Informações de Armazenamento */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Estatísticas de Armazenamento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg p-4 border" style={primarySoftStyle}>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tamanho dos Dados</div>
              <div className="text-2xl font-bold" style={primaryStyle}>
                {calculateStorageSize()} KB
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Sessões de Estudo</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {userData.studyHistory.length}
              </div>
            </div>
            <div className="rounded-lg p-4 border" style={secondarySoftStyle}>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total de Pontos</div>
              <div className="text-2xl font-bold" style={secondaryStyle}>
                {userData.totalPoints.toLocaleString()}
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Conquistas</div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {userData.achievements.length}
              </div>
            </div>
          </div>
        </div>

        {/* Exportar Dados */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-6 h-6" style={primaryStyle} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Exportar Dados
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Faça backup de todos os seus dados de estudo em formato JSON
          </p>
          <button
            onClick={handleExportJSON}
            className="w-full md:w-auto px-6 py-3 text-white rounded-lg font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={primaryBgStyle}
          >
            <Download className="w-5 h-5" />
            Baixar Backup JSON
          </button>
        </div>

        {/* Importar Dados */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Importar Dados
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Restaure um backup anterior dos seus dados
          </p>
          <label className="w-full md:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5" />
            Selecionar Arquivo JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Atenção:</strong> Importar dados irá substituir todos os dados atuais. Faça um backup antes!
              </p>
            </div>
          </div>
        </div>

        {/* Limpar Dados */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Zona de Perigo
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Limpar todos os dados armazenados localmente. Esta ação não pode ser desfeita!
          </p>
          
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full md:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Limpar Todos os Dados
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200 font-semibold mb-2">
                   Tem certeza que deseja limpar TODOS os dados?
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Isso irá remover permanentemente:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside mt-2">
                  <li>Todas as sessões de estudo</li>
                  <li>Todo o histórico de progresso</li>
                  <li>Todas as conquistas</li>
                  <li>Todos os pontos e níveis</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClearAll}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Sim, Limpar Tudo
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalStoragePage;
