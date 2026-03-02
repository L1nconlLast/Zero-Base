import React from 'react';

interface ZeroBaseLogoProps {
  compact?: boolean;
}

export const ZeroBaseLogo: React.FC<ZeroBaseLogoProps> = ({ compact = false }) => {
  return (
    <div className="flex items-center gap-2">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="var(--color-primary)" strokeWidth="2" />
        <circle cx="8" cy="12" r="2" fill="var(--color-primary)" />
        <path
          d="M10 12L14 8L18 12"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {!compact && (
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Zero Base</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Versão 2.0</p>
        </div>
      )}
    </div>
  );
};
