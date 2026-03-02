// ============================================================
// src/components/UI/FeedbackButton.tsx
// Botão flutuante + formulário inline de feedback
// ============================================================

import React, { useState } from 'react';
import { MessageSquarePlus, Send, X, Star } from 'lucide-react';
import { feedbackService, type FeedbackPayload } from '../../services/feedback.service';
import toast from 'react-hot-toast';

interface FeedbackButtonProps {
  userId: string | null;
  currentPage?: string;
}

const FEEDBACK_TYPES: { value: FeedbackPayload['type']; label: string; emoji: string }[] = [
  { value: 'bug', label: 'Bug', emoji: '🐛' },
  { value: 'feature', label: 'Sugestão', emoji: '💡' },
  { value: 'elogio', label: 'Elogio', emoji: '❤️' },
  { value: 'outro', label: 'Outro', emoji: '💬' },
];

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ userId, currentPage }) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackPayload['type']>('feature');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);

  const resetForm = () => {
    setType('feature');
    setMessage('');
    setRating(0);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Escreva sua mensagem.');
      return;
    }

    if (!userId) {
      toast.error('Faça login para enviar feedback.');
      return;
    }

    setSending(true);
    try {
      await feedbackService.submit(userId, {
        type,
        message: message.trim(),
        page: currentPage,
        rating: rating > 0 ? rating : undefined,
      });
      toast.success('Feedback enviado! Obrigado 🙏');
      resetForm();
      setOpen(false);
    } catch {
      toast.error('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
        aria-label="Enviar feedback"
        title="Enviar feedback"
      >
        {open ? <X size={20} /> : <MessageSquarePlus size={20} />}
      </button>

      {/* Feedback Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <MessageSquarePlus size={18} className="text-blue-500" />
            Enviar Feedback
          </h3>

          {/* Type selector */}
          <div className="flex gap-1.5 mb-3">
            {FEEDBACK_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                  type === t.value
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* Stars rating */}
          <div className="flex items-center gap-1 mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Nota:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star === rating ? 0 : star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={18}
                  className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                />
              </button>
            ))}
          </div>

          {/* Message */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Descreva sua sugestão, bug ou elogio..."
            className="w-full h-24 p-3 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
            maxLength={1000}
          />
          <p className="text-right text-xs text-gray-400 mt-1">{message.length}/1000</p>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={sending || !message.trim()}
            className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;
