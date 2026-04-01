import React from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';

import { ZeroBaseLogo } from './ZeroBaseLogo';

const SHELL_TRANSITION = '240ms cubic-bezier(0.22, 1, 0.36, 1)';
const SHELL_DURATION = '240ms';
const MICRO_TRANSITION = '180ms ease';
const MICRO_DURATION = '180ms';

export interface AppSidebarStat {
  label: string;
  value: string;
}

export interface AppSidebarNavItem {
  id: string;
  label: string;
  meta?: string;
  icon: LucideIcon;
  tabId: string;
  isActive: boolean;
  title?: string;
}

export interface AppSidebarNavSection {
  id: string;
  label: string;
  items: AppSidebarNavItem[];
}

export interface AppSidebarQuickAction {
  heading: string;
  description: string;
  actionLabel: string;
  compactLabel: string;
  onAction: () => void;
}

interface AppSidebarProps {
  darkMode: boolean;
  isExpanded: boolean;
  isDisabled?: boolean;
  modeBadgeLabel: string;
  quickStats: AppSidebarStat[];
  sections: AppSidebarNavSection[];
  quickAction: AppSidebarQuickAction;
  onToggle: () => void;
  onNavigate: (tabId: string) => void;
}

interface SidebarNavItemProps {
  darkMode: boolean;
  isExpanded: boolean;
  item: AppSidebarNavItem;
  onNavigate: (tabId: string) => void;
}

const SidebarNavItem = ({ darkMode, isExpanded, item, onNavigate }: SidebarNavItemProps) => {
  const buttonStateClass = item.isActive
    ? darkMode
      ? 'border-cyan-900/65 bg-[linear-gradient(135deg,rgba(8,145,178,0.16)_0%,rgba(15,23,42,0.94)_100%)] text-slate-50 shadow-[0_12px_24px_-18px_rgba(34,211,238,0.22)]'
      : 'border-cyan-100 bg-[linear-gradient(135deg,rgba(247,253,255,0.98)_0%,rgba(236,247,255,0.98)_100%)] text-slate-950 shadow-[0_12px_24px_-18px_rgba(14,165,233,0.2)]'
    : darkMode
      ? 'border-transparent bg-transparent text-slate-400 hover:border-slate-800/90 hover:bg-slate-900/76 hover:text-slate-100'
      : 'border-transparent bg-transparent text-slate-500 hover:border-slate-200/80 hover:bg-white/78 hover:text-slate-900 hover:shadow-[0_10px_20px_-22px_rgba(15,23,42,0.14)]';

  const iconStateClass = item.isActive
    ? darkMode
      ? 'bg-cyan-950/62 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
      : 'bg-white text-cyan-700 shadow-[0_10px_18px_-16px_rgba(14,165,233,0.34)]'
    : darkMode
      ? 'bg-slate-900 text-slate-300 group-hover:bg-slate-800 group-hover:text-slate-100'
      : 'bg-slate-100/92 text-slate-500 group-hover:bg-slate-900 group-hover:text-slate-50';

  return (
    <button
      type="button"
      title={item.title || item.label}
      aria-label={item.title || item.label}
      aria-current={item.isActive ? 'page' : undefined}
      onClick={() => onNavigate(item.tabId)}
      className={`group relative flex w-full items-center overflow-hidden rounded-[16px] border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${
        darkMode ? 'focus-visible:ring-cyan-400 focus-visible:ring-offset-slate-950' : 'focus-visible:ring-cyan-500 focus-visible:ring-offset-slate-100'
      } focus-visible:ring-offset-2 ${isExpanded ? 'min-h-[54px] gap-2.5 px-2.5 py-2' : 'h-11 justify-center px-2 py-0'} ${buttonStateClass}`}
      style={{ transitionDuration: MICRO_DURATION }}
    >
      <span
        className={`absolute left-0 top-1/2 hidden h-7 w-0.5 -translate-y-1/2 rounded-full transition-all duration-200 ${
          isExpanded ? 'sm:block' : ''
        } ${item.isActive ? (darkMode ? 'bg-cyan-300' : 'bg-cyan-500') : 'bg-transparent'}`}
      />
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] transition-all duration-200 ${iconStateClass}`}
        style={{ transitionDuration: MICRO_DURATION }}
      >
        <item.icon className={`transition-transform duration-200 ${item.isActive ? 'scale-100' : 'scale-[0.98] group-hover:scale-100'} h-4 w-4`} />
      </span>
      <div
        className={`min-w-0 overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-w-[164px] translate-x-0 opacity-100' : 'max-w-0 -translate-x-1.5 opacity-0 pointer-events-none'
        }`}
        style={{ transitionDuration: MICRO_DURATION }}
      >
        <p className={`truncate text-[13px] ${item.isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</p>
        {item.meta ? (
          <p className={`mt-0.5 truncate text-[11px] leading-4 ${item.isActive ? (darkMode ? 'text-slate-300' : 'text-slate-600') : 'opacity-65'}`}>
            {item.meta}
          </p>
        ) : null}
      </div>
    </button>
  );
};

interface SidebarHeaderProps {
  darkMode: boolean;
  isExpanded: boolean;
  modeBadgeLabel: string;
  onToggle: () => void;
}

const SidebarHeader = ({ darkMode, isExpanded, modeBadgeLabel, onToggle }: SidebarHeaderProps) => (
  <div className={`${isExpanded ? 'flex items-start justify-between gap-2.5' : 'flex flex-col items-center gap-2'}`}>
    <div className={`${isExpanded ? 'flex min-w-0 items-center gap-2.5' : 'flex items-center justify-center'}`}>
      <ZeroBaseLogo compact />
      <div
        className={`min-w-0 overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-w-[150px] translate-x-0 opacity-100' : 'max-w-0 -translate-x-1.5 opacity-0 pointer-events-none'
        }`}
        style={{ transitionDuration: MICRO_DURATION }}
      >
        <div className="flex items-center gap-2">
          <h1 className={`truncate text-[15px] font-black tracking-[-0.03em] ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>Zero Base</h1>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
              darkMode ? 'bg-slate-900 text-slate-300' : 'bg-slate-100/92 text-slate-500'
            }`}
          >
            {modeBadgeLabel}
          </span>
        </div>
        <p className={`mt-1 truncate text-[10px] font-medium uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Study OS
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Recolher menu lateral' : 'Expandir menu lateral'}
      title={isExpanded ? 'Recolher menu lateral' : 'Expandir menu lateral'}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 ${
        darkMode
          ? 'border-slate-800 bg-slate-900/92 text-slate-100 hover:bg-slate-900 focus-visible:ring-cyan-400 focus-visible:ring-offset-slate-950'
          : 'border-white/75 bg-white/92 text-slate-700 shadow-[0_10px_20px_-18px_rgba(148,163,184,0.24)] hover:bg-white focus-visible:ring-cyan-500 focus-visible:ring-offset-slate-100'
      } focus-visible:ring-offset-2`}
      style={{ transitionDuration: MICRO_DURATION }}
    >
      <ArrowRight className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
    </button>
  </div>
);

interface SidebarSectionProps {
  darkMode: boolean;
  isExpanded: boolean;
  section: AppSidebarNavSection;
  onNavigate: (tabId: string) => void;
}

interface SidebarQuickActionProps {
  darkMode: boolean;
  isExpanded: boolean;
  quickAction: AppSidebarQuickAction;
}

const SidebarSection = ({ darkMode, isExpanded, section, onNavigate }: SidebarSectionProps) => {
  if (section.items.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 first:mt-0">
      <div
        className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-10 opacity-100' : 'max-h-0 opacity-0'}`}
        style={{ transitionDuration: MICRO_DURATION }}
      >
        <p className={`px-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {section.label}
        </p>
      </div>
      <div className="mt-2 space-y-1.5">
        {section.items.map((item) => (
          <SidebarNavItem
            key={item.id}
            darkMode={darkMode}
            isExpanded={isExpanded}
            item={item}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
};

const SidebarQuickAction = ({ darkMode, isExpanded, quickAction }: SidebarQuickActionProps) => (
  <div
    className={`mt-auto rounded-[20px] border transition-all duration-200 ${
      darkMode
        ? 'border-slate-800/90 bg-slate-900/72 text-slate-100'
        : 'border-slate-200/90 bg-white/68 text-slate-900 shadow-[0_16px_26px_-28px_rgba(15,23,42,0.16)]'
    } ${isExpanded ? 'p-3' : 'p-2'}`}
    style={{ transitionDuration: SHELL_DURATION }}
  >
    <div className={`flex items-start ${isExpanded ? 'justify-between gap-2.5' : 'justify-center'}`}>
      <div
        className={`min-w-0 overflow-hidden transition-all duration-200 ${
          isExpanded ? 'max-w-[164px] translate-x-0 opacity-100' : 'max-w-0 -translate-x-1.5 opacity-0 pointer-events-none'
        }`}
        style={{ transitionDuration: MICRO_DURATION }}
      >
        <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Atalho do dia
        </p>
        <h3 className="mt-1.5 truncate text-[13px] font-semibold">{quickAction.heading}</h3>
        <p className={`mt-1 truncate text-[11px] leading-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{quickAction.description}</p>
      </div>

      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] ${
          darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-100 text-slate-700'
        }`}
        aria-hidden="true"
      >
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </div>

    <button
      type="button"
      title={quickAction.actionLabel}
      onClick={quickAction.onAction}
      className={`inline-flex w-full items-center justify-center rounded-[16px] border font-semibold transition-all duration-200 ${
        darkMode
          ? 'border-slate-700 bg-slate-950/90 text-slate-100 hover:bg-slate-900'
          : 'border-slate-200 bg-white/96 text-slate-900 hover:bg-slate-50'
      } ${isExpanded ? 'mt-3 gap-2 px-3.5 py-2 text-[13px]' : 'gap-1.5 px-2 py-2 text-[11px]'}`}
      style={{ transitionDuration: MICRO_DURATION }}
    >
      <span>{isExpanded ? quickAction.actionLabel : quickAction.compactLabel}</span>
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  </div>
);

export const AppSidebar = ({
  darkMode,
  isExpanded,
  isDisabled = false,
  modeBadgeLabel,
  quickStats,
  sections,
  quickAction,
  onToggle,
  onNavigate,
}: AppSidebarProps) => (
  <aside className={`hidden xl:block transition-all duration-200 ${isDisabled ? 'opacity-60' : 'opacity-100'}`}>
    <div
      className={`sticky top-[5.25rem] overflow-hidden rounded-[26px] border backdrop-blur ${
        darkMode
          ? 'border-slate-800/80 bg-slate-950/92'
          : 'border-slate-200/85 bg-[linear-gradient(180deg,rgba(244,247,251,0.98)_0%,rgba(235,241,247,0.95)_100%)]'
      } ${isExpanded ? 'p-3.5' : 'p-2.5'}`}
      style={{
        transform: isExpanded ? 'translateX(0)' : 'translateX(-5px)',
        transition: `width ${SHELL_TRANSITION}, transform ${SHELL_TRANSITION}, box-shadow ${SHELL_TRANSITION}, background-color ${SHELL_TRANSITION}, padding ${SHELL_TRANSITION}`,
        boxShadow: darkMode
          ? isExpanded
            ? '0 18px 36px rgba(2,6,23,0.46)'
            : '0 10px 20px rgba(2,6,23,0.3)'
          : isExpanded
            ? '0 18px 38px rgba(148,163,184,0.18)'
            : '0 8px 18px rgba(148,163,184,0.12)',
      }}
    >
      <div className="flex min-h-[calc(100vh-8rem)] flex-col">
        <SidebarHeader darkMode={darkMode} isExpanded={isExpanded} modeBadgeLabel={modeBadgeLabel} onToggle={onToggle} />

        <div
          className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'mt-3.5 max-h-56 opacity-100' : 'max-h-0 opacity-0'}`}
          style={{ transitionDuration: SHELL_DURATION }}
        >
          <div className={`rounded-[20px] p-3 ${darkMode ? 'bg-slate-900/68' : 'bg-slate-200/30 backdrop-blur-sm'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Ritmo</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {quickStats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-[16px] px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)] ${
                    darkMode
                      ? 'bg-slate-950/80 shadow-[0_8px_18px_rgba(2,6,23,0.45)]'
                      : 'border border-white/55 bg-white/58 shadow-[0_10px_22px_rgba(148,163,184,0.18)] backdrop-blur-sm'
                  }`}
                >
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                  <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-1">
          {sections.map((section) => (
            <SidebarSection
              key={section.id}
              darkMode={darkMode}
              isExpanded={isExpanded}
              section={section}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <SidebarQuickAction darkMode={darkMode} isExpanded={isExpanded} quickAction={quickAction} />
      </div>
    </div>
  </aside>
);
