import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  Archive,
  Coins,
  BarChart3,
  FileSpreadsheet,
  Printer,
  Calendar,
  Settings,
  X,
  CheckCircle2,
  TrendingUp,
  Star,
  GitCommit,
  RefreshCw,
  Shield,
  Lock,
  FileKey,
  Globe,
} from 'lucide-react';
import { ActiveTab } from '../types/portfolio';

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenGuide?: () => void;
  currentVersion?: string;
  onOpenVersionsModal?: () => void;
  onCheckForUpdates?: () => void;
  isCheckingVersion?: boolean;
  hasPendingUpdate?: boolean;
  hasPassword?: boolean;
  onLockApp?: () => void;
  onOpenSecurityModal?: (tab?: 'backup' | 'import' | 'password' | 'inspect') => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  currentVersion,
  onOpenVersionsModal,
  onCheckForUpdates,
  isCheckingVersion = false,
  hasPendingUpdate = false,
  hasPassword = false,
  onLockApp,
  onOpenSecurityModal,
}: SidebarProps) {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Inicio', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'current', label: 'Cartera actual', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'quotes', label: 'Cotizaciones 🌐', icon: <Globe className="w-4 h-4 text-cyan-400" /> },
    { id: 'operations', label: 'Operaciones', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { id: 'closed', label: 'Carteras cerradas', icon: <Archive className="w-4 h-4" /> },
    { id: 'dividends', label: 'Dividendos', icon: <Coins className="w-4 h-4" /> },
    { id: 'analytics', label: 'Análisis', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'tax', label: 'Fiscal / IRPF', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'reports', label: 'Informes', icon: <Printer className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendario dividendos', icon: <Calendar className="w-4 h-4" /> },
    { id: 'watchlist', label: 'Lista seguimiento ⭐', icon: <Star className="w-4 h-4 text-amber-400" /> },
    { id: 'config', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
  ];

  const advantages = [
    'Valoración en euros (EUR)',
    'Acciones USA y europeas',
    'Histórico de compras y ventas',
    'Carteras cerradas por años',
    'Dividendos con retenciones',
    'Cálculo de rentabilidad y FIFO',
    'Filtros y búsqueda rápida',
    'Gráficos por sectores y países',
    'Informes y modelo Hacienda IRPF',
    'Disponible en Android y web',
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-[#0c182c] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wider text-white">Cartera de Valores</span>
              <span className="block text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
                Gestión de Inversiones
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="p-3 space-y-1 overflow-y-auto flex-1">
          {navItems.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Advantages box (Screen 12 Feature) */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-2 text-[11px]">
            <span className="font-bold text-slate-200 block text-xs border-b border-slate-800 pb-1.5">
              Principales ventajas
            </span>
            <ul className="space-y-1.5 text-slate-300">
              {advantages.map((adv, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{adv}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Banner from Screen 12 */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-950/80 to-slate-900 border border-blue-900/40 text-center">
            <span className="font-black text-xs text-white tracking-widest block uppercase">
              Cartera de Valores
            </span>
            <span className="text-[10px] text-blue-300 block font-medium">
              Tu cartera, siempre bajo control
            </span>

            {onOpenVersionsModal && (
              <button
                onClick={() => {
                  onOpenVersionsModal();
                  onClose();
                }}
                className="mt-3 w-full flex flex-col items-center justify-center py-1.5 px-4 rounded-full bg-gradient-to-b from-[#0f2343] via-[#0b1a32] to-[#071222] border-2 border-blue-500/80 hover:border-cyan-400 shadow-[0_0_12px_rgba(59,130,246,0.25)] hover:shadow-[0_0_18px_rgba(6,182,212,0.4)] transition-all cursor-pointer group active:scale-95"
                title={`Versión ${currentVersion || 'v1.0.0'} · Ver versiones modificadas en GitHub`}
              >
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 group-hover:text-cyan-300">
                    VERSIÓN
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </div>
                <span className="text-xs font-black text-white tracking-tight leading-none mt-0.5 font-mono">
                  {currentVersion || 'v1.0.0'}
                </span>
              </button>
            )}

            {onCheckForUpdates && (
              <button
                onClick={() => {
                  onCheckForUpdates();
                  onClose();
                }}
                disabled={isCheckingVersion}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1 px-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white border border-slate-700/70 transition-colors cursor-pointer"
                title="Comprobar si están todas las actualizaciones al día con GitHub"
              >
                <RefreshCw className={`w-3 h-3 ${isCheckingVersion ? 'animate-spin text-cyan-400' : 'text-blue-400'}`} />
                <span>{isCheckingVersion ? 'Comprobando...' : 'Comprobar al día'}</span>
              </button>
            )}

            {/* Acceso rápido a Seguridad y Copias Cifradas */}
            {onOpenSecurityModal && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
                <button
                  onClick={() => {
                    onOpenSecurityModal();
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 text-[11px] font-bold text-cyan-300 border border-cyan-800/50 transition-colors"
                  title="Abrir panel de Seguridad y Copias de Seguridad"
                >
                  <Shield className="w-3 h-3 text-cyan-400" />
                  <span>Seguridad & Copias</span>
                </button>

                {hasPassword && onLockApp && (
                  <button
                    onClick={() => {
                      onLockApp();
                      onClose();
                    }}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/50 transition-colors"
                    title="Bloquear aplicación ahora"
                  >
                    <Lock className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
