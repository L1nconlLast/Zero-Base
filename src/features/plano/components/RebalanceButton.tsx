import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

interface RebalanceButtonProps {
  label: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const RebalanceButton: React.FC<RebalanceButtonProps> = ({
  label,
  description,
  onClick,
  disabled = false,
}) => {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#111827_100%)] p-4 text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">Ajuste leve</div>
          <h3 className="mt-1.5 text-lg font-black tracking-[-0.04em]">{label}</h3>
          <p className="mt-1.5 text-sm text-white/70">{description}</p>
        </div>

        <button
          type="button"
          onClick={onClick}
          disabled={disabled || !onClick}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Abrir ajuste
          <ArrowRightLeft className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
};

export default RebalanceButton;
