import React, { useState } from 'react';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import { exportToCSV, exportToJSON, importFromJSON } from '../../utils/export';
import { UserData } from '../../types';
import toast from 'react-hot-toast';

interface ExportSectionProps {
  userData: UserData;
  onImport: (data: UserData) => void;
}

const ExportSection: React.FC<ExportSectionProps> = ({ userData, onImport }) => {
  const [importing, setImporting] = useState(false);
  const [pendingData, setPendingData] = useState<UserData | null>(null);
  
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    
    try {
      const importedData = await importFromJSON(file);
      setPendingData(importedData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao importar: ' + message);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const confirmImport = () => {
    if (!pendingData) return;
    onImport(pendingData);
    setPendingData(null);
    toast.success('Dados importados com sucesso!');
  };

  const cancelImport = () => setPendingData(null);
  
  const sessions = userData.sessions || userData.studyHistory || [];
  
  return (
    <>
    <div className="export-section bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      <h3 className="text-lg font-semibold mb-4">Exportar / Importar Dados</h3>
      
      <div className="space-y-3">
        <button
          onClick={() => exportToCSV(sessions)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Download className="w-5 h-5" />
          Exportar para CSV
        </button>
        
        <button
          onClick={() => exportToJSON(userData)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Download className="w-5 h-5" />
          Fazer Backup (JSON)
        </button>
        
        <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer">
          <Upload className="w-5 h-5" />
          {importing ? 'Importando...' : 'Restaurar Backup'}
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            disabled={importing}
          />
        </label>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
         Dica: Faça backup regularmente para não perder seus dados!
      </p>
    </div>

      {/* Modal de confirmação de import */}
      {pendingData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Confirmar importação</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Isso irá <strong>substituir todos os seus dados atuais</strong>. Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmImport}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition"
              >
                Confirmar
              </button>
              <button
                onClick={cancelImport}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportSection;
