import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export interface ItemActionMenuAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ItemActionMenuProps {
  darkMode?: boolean;
  itemLabel: string;
  actions: ItemActionMenuAction[];
}

const triggerClassName = (darkMode: boolean): string =>
  `inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
    darkMode
      ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
  }`;

const menuClassName = (darkMode: boolean): string =>
  `absolute right-0 top-full z-20 mt-2 min-w-[190px] overflow-hidden rounded-2xl border shadow-[0_24px_48px_-24px_rgba(15,23,42,0.35)] ${
    darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
  }`;

const actionClassName = (darkMode: boolean, destructive: boolean): string => {
  if (destructive) {
    return `flex w-full items-center justify-start px-4 py-3 text-sm font-semibold transition ${
      darkMode
        ? 'text-rose-200 hover:bg-rose-950/50'
        : 'text-rose-700 hover:bg-rose-50'
    }`;
  }

  return `flex w-full items-center justify-start px-4 py-3 text-sm font-medium transition ${
    darkMode
      ? 'text-slate-100 hover:bg-slate-900'
      : 'text-slate-700 hover:bg-slate-50'
  }`;
};

export const ItemActionMenu: React.FC<ItemActionMenuProps> = ({
  darkMode = false,
  itemLabel,
  actions,
}) => {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const firstDestructiveIndex = actions.findIndex((action) => action.destructive);

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={triggerClassName(darkMode)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acoes para ${itemLabel}`}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`Menu de acoes para ${itemLabel}`}
          className={menuClassName(darkMode)}
        >
          {actions.map((action, index) => (
            <React.Fragment key={`${itemLabel}-${action.label}`}>
              {firstDestructiveIndex > 0 && index === firstDestructiveIndex ? (
                <div className={darkMode ? 'border-t border-slate-800' : 'border-t border-slate-100'} />
              ) : null}
              <button
                type="button"
                role="menuitem"
                disabled={action.disabled}
                className={`${actionClassName(darkMode, Boolean(action.destructive))} disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => {
                  setOpen(false);
                  action.onSelect();
                }}
              >
                {action.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default ItemActionMenu;
