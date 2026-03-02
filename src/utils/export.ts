import { UserData, StudySession } from '../types';

export const exportToCSV = (sessions: StudySession[]): void => {
  const headers = ['Data', 'Matéria', 'Duração (min)', 'Meta Atingida', 'Horário'];
  
  const rows = sessions.map(session => [
    formatDate(new Date(session.date)),
    session.subject || 'Geral',
    (session.minutes || session.duration).toString(),
    session.goalMet ? 'Sim' : 'Não',
    session.timestamp ? formatTime(new Date(session.timestamp)) : '-'
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
  
  downloadFile(
    csv, 
    `medicina-do-zero-${formatDateFile(new Date())}.csv`, 
    'text/csv'
  );
};

export const exportToJSON = (userData: UserData): void => {
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    data: userData
  };
  
  const json = JSON.stringify(exportData, null, 2);
  downloadFile(
    json, 
    `medicina-do-zero-backup-${formatDateFile(new Date())}.json`, 
    'application/json'
  );
};

export const importFromJSON = (file: File): Promise<UserData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed.data || !parsed.version) {
          throw new Error('Formato de arquivo inválido');
        }
        
        const requiredFields = ['dailyGoal'];
        const hasAllFields = requiredFields.every(field => 
          field in parsed.data
        );
        
        if (!hasAllFields) {
          throw new Error('Backup incompleto ou corrompido');
        }
        
        resolve(parsed.data);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        reject(new Error('Erro ao importar dados: ' + message));
      }
    };
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
};

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR');
};

const formatDateFile = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};
