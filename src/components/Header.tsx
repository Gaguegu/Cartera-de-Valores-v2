import React, { useMemo } from 'react';
import { Menu, RefreshCw, TrendingUp, Calendar, Sparkles, Lock, Shield, Bell, Globe, Plus } from 'lucide-react';
import { ActiveTab } from '../types/portfolio';
import { formatEUR } from '../utils/formatters';

interface HeaderProps {
  currentTab: ActiveTab;
  onOpenMobileMenu: () => void;
  onOpenGuide?: () => void;
  onResetData?: () => void;
  totalPortfolioValue: number;
  currentVersion?: string;
  onOpenVersionsModal?: () => void;
  isCheckingVersion?: boolean;
  hasPendingUpdate?: boolean;
  onCheckForUpdates?: () => void;
  onInstallNow?: () => void;
  onForceReload?: () => void;
  hasPassword?: boolean;
  onLockApp?: () => void;
  onOpenSecurityModal?: (tab?: 'backup' | 'import' | 'password' | 'inspect') => void;
  onOpenAlertsModal?: () => void;
  triggeredAlertsCount?: number;
  onRefreshQuotesOnline?: () => Promise<void>;
  isRefreshingQuotes?: boolean;
  lastQuotesUpdatedAt?: string;
  cashEUR?: number;
  onOpenNewOperation?: () => void;
}

export function Header({
  currentTab,
  onOpenMobileMenu,
  totalPortfolioValue,
  currentVersion,
  onOpenVersionsModal,
  isCheckingVersion = false,
  hasPendingUpdate = false,
  onCheckForUpdates,
  onInstallNow,
  onForceReload,
  hasPassword = false,
  onLockApp,
  onOpenSecurityModal,
  onOpenAlertsModal,
  triggeredAlertsCount = 0,
  onRefreshQuotesOnline,
  isRefreshingQuotes = false,
  lastQuotesUpdatedAt,
  cashEUR,
  onOpenNewOperation,
}: HeaderProps) {
  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const getTabTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'dashboard':
        return 'Gestión de Inversiones';
      case 'current':
        return 'Cartera actual';
      case 'detail':
        return 'Detalle de valor';
      case 'operations':
        return 'Operaciones';
      case 'closed':
        return 'Carteras cerradas';
      case 'dividends':
        return 'Dividendos';
      case 'analytics':
        return 'Análisis y gráficos';
      case 'tax':
        return 'Fiscal / IRPF';
      case 'reports':
        return 'Informes y exportación';
      case 'calendar':
        return 'Calendario de dividendos';
      case 'quotes':
        return 'Cotizaciones de Mercado (EE.UU. y Europa)';
      case 'watchlist':
        return 'Lista de seguimiento';
      case 'config':
        return 'Configuración y Brokers';
      default:
        return 'Gestión de Inversiones';
    }
  };

  return (
    <header className="shrink-0 z-20 bg-[#0f1e36] border-b border-slate-800/80 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shadow-md relative min-h-[64px]">
      {/* Left: Mobile trigger & Current View (con controles de Dashboard unificados) */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="lg:hidden w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="lg:hidden font-extrabold text-sm tracking-wider text-white">Cartera de Valores</span>
              <span className="lg:hidden w-1 h-1 rounded-full bg-slate-500"></span>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                <span className="text-slate-400 font-normal hidden lg:inline">Panel /</span>
                <span className="text-white font-extrabold">{getTabTitle(currentTab)}</span>
                {currentTab === 'dashboard' && (
                  <span className="hidden xl:inline text-[11px] font-semibold text-blue-300 bg-blue-900/40 border border-blue-700/50 px-2 py-0.5 rounded-full ml-1">
                    Resumen de la cartera
                  </span>
                )}
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden md:block truncate">
              {currentTab === 'dashboard'
                ? 'Seguimiento en tiempo real de inversiones globales valoradas en euros · Método FIFO'
                : 'Gestión Integral de Inversiones · Control total de tu patrimonio'}
            </p>
          </div>
        </div>

        {/* Controles de Dashboard unificados en la cabecera única: Efectivo y Nueva Operación */}
        {currentTab === 'dashboard' && (
          <div className="hidden sm:flex items-center gap-2 ml-1 lg:ml-2 pl-3 border-l border-slate-800 shrink-0">
            {typeof cashEUR === 'number' && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300">
                <span className="text-emerald-400 font-bold">💶 Efectivo:</span>
                <span className="font-mono font-bold text-white">{formatEUR(cashEUR)}</span>
              </div>
            )}
            {onOpenNewOperation && (
              <button
                onClick={onOpenNewOperation}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Registrar una nueva compra o venta de acciones"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva operación</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Botón Bloquear en Rojo (in-flow sin solaparse), Alertas, Mercado, Óvalo Versión, Comprobar actualizaciones, Fecha */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-3">
        {/* BOTÓN ROJO DE BLOQUEO: colocado de forma fluida para que nunca se solape con ningún botón */}
        <button
          onClick={hasPassword && onLockApp ? onLockApp : () => onOpenSecurityModal && onOpenSecurityModal('password')}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-black bg-red-600 hover:bg-red-500 active:bg-red-700 border-2 border-red-400 text-white shadow-[0_0_14px_rgba(239,68,68,0.55)] hover:shadow-[0_0_20px_rgba(239,68,68,0.8)] transition-all cursor-pointer select-none active:scale-95 shrink-0"
          title={hasPassword ? 'Bloquear aplicación ahora (un solo clic)' : 'Configurar contraseña de acceso'}
        >
          <Lock className="w-3.5 h-3.5 text-white" />
          <span>Bloquear</span>
        </button>
        {/* BOTÓN / INDICADOR DE ALERTAS DE PRECIO (CAMPANA) */}
        {onOpenAlertsModal && (
          <button
            onClick={onOpenAlertsModal}
            className="relative p-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700/80 transition-all cursor-pointer shadow-sm active:scale-90"
            title="Centro de Alertas de Precios y Stop-Loss"
            aria-label="Alertas de precios"
          >
            <Bell className="w-4 h-4" />
            {triggeredAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-rose-600 text-[9px] font-black text-white border-2 border-slate-900">
                  {triggeredAlertsCount}
                </span>
              </span>
            )}
          </button>
        )}

        {/* INDICADOR DE MERCADO EN VIVO */}
        {onRefreshQuotesOnline && (
          <button
            onClick={() => onRefreshQuotesOnline()}
            disabled={isRefreshingQuotes}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title={lastQuotesUpdatedAt ? `Cotizaciones actualizadas: ${lastQuotesUpdatedAt}` : 'Actualizar cotizaciones en vivo'}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-slate-300">
              {isRefreshingQuotes ? 'Actualizando...' : lastQuotesUpdatedAt ? `Mercado ${lastQuotesUpdatedAt}` : 'Mercado en vivo'}
            </span>
            <RefreshCw className={`w-3 h-3 text-cyan-400 ${isRefreshingQuotes ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* ÓVALO DE VERSIÓN (Estilo de la captura con colores de la aplicación) */}
        {onOpenVersionsModal && (
          <button
            onClick={onOpenVersionsModal}
            className={`group relative flex flex-col items-center justify-center min-w-[92px] sm:min-w-[108px] px-4 sm:px-5 py-1 sm:py-1.5 rounded-full border-2 transition-all duration-200 cursor-pointer select-none active:scale-95 ${
              hasPendingUpdate
                ? 'bg-gradient-to-b from-[#2a1708] via-[#1f130b] to-[#0f0a05] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                : 'bg-gradient-to-b from-[#0f2343] via-[#0b1a32] to-[#071222] border-blue-500/80 hover:border-cyan-400 shadow-[0_0_14px_rgba(59,130,246,0.25)] hover:shadow-[0_0_20px_rgba(6,182,212,0.45)]'
            }`}
            title={`Versión ${currentVersion || 'v1.0.0'} · Ver versiones modificadas en GitHub`}
          >
            {/* Indicador de actualización pendiente */}
            {hasPendingUpdate && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-slate-900"></span>
              </span>
            )}

            {/* Texto superior: VERSIÓN */}
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-cyan-400 group-hover:text-cyan-300 transition-colors">
                VERSIÓN
              </span>
              {!hasPendingUpdate && (
                <span className="relative flex h-1.5 w-1.5">
                  {isCheckingVersion ? (
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-400 animate-pulse"></span>
                  ) : (
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                  )}
                </span>
              )}
            </div>

            {/* Texto inferior: Versión activa */}
            <span className="text-xs sm:text-sm font-black text-white tracking-tight leading-none mt-0.5 font-mono">
              {currentVersion || 'v1.0.0'}
            </span>
          </button>
        )}

        {/* BOTÓN DE ACTUALIZACIÓN MANUAL (Comprobar si están todas las actualizaciones al día) */}
        {onCheckForUpdates && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={hasPendingUpdate && onInstallNow ? () => onInstallNow() : onCheckForUpdates}
              disabled={isCheckingVersion}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-60 ${
                hasPendingUpdate
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-amber-400 shadow-md shadow-amber-950/40 ring-2 ring-amber-500/30'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700/80 hover:border-cyan-500/60'
              }`}
              title="Comprobar si están todas las actualizaciones al día con GitHub"
            >
              {isCheckingVersion ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : hasPendingUpdate ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden md:inline">
                {isCheckingVersion
                  ? 'Comprobando...'
                  : hasPendingUpdate
                  ? 'Actualizar ahora'
                  : 'Comprobar actualizaciones'}
              </span>
              <span className="md:hidden">
                {isCheckingVersion ? 'Buscando...' : hasPendingUpdate ? 'Actualizar' : 'Comprobar'}
              </span>
            </button>

            {onForceReload && (
              <button
                onClick={onForceReload}
                className="flex items-center justify-center p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-sm active:scale-90"
                title="Recargar la aplicación (limpia caché y carga los últimos cambios sin cerrar la app)"
                aria-label="Recargar aplicación"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Date badge: Fecha actual dinámica */}
        <div 
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs text-slate-300"
          title={`Fecha actual: ${todayFormatted}`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">{todayFormatted}</span>
        </div>
      </div>
    </header>
  );
}
