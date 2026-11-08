import React from 'react';
import {
  X,
  GitCommit,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Zap,
  Clock,
  User,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { AppVersionInfo } from '../../types/version';
import { GITHUB_REPO, sanitizeCommitMessage } from '../../utils/versionService';

interface VersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  currentCommitSha?: string;
  history: AppVersionInfo[];
  isChecking: boolean;
  isUpdating?: boolean;
  lastChecked: Date | null;
  autoUpdate: boolean;
  updateAvailable: AppVersionInfo | null;
  onCheckForUpdates: () => void;
  onInstallUpdate: (version?: AppVersionInfo) => void;
  onToggleAutoUpdate: (enabled: boolean) => void;
}

export function VersionsModal({
  isOpen,
  onClose,
  currentVersion,
  currentCommitSha,
  history,
  isChecking,
  isUpdating = false,
  lastChecked,
  autoUpdate,
  updateAvailable,
  onCheckForUpdates,
  onInstallUpdate,
  onToggleAutoUpdate,
}: VersionsModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <GitCommit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Versión Oficial de la Aplicación
                </h2>
                {/* Oval in modal header */}
                <div className="inline-flex flex-col items-center justify-center px-3.5 py-1 rounded-full bg-gradient-to-b from-[#0f2343] via-[#0b1a32] to-[#071222] border-2 border-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.25)]">
                  <span className="text-[8px] font-black uppercase tracking-widest text-cyan-400 leading-none">
                    VERSIÓN
                  </span>
                  <span className="text-[11px] font-black text-white tracking-tight leading-none mt-0.5 font-mono">
                    {currentVersion || 'v1.0.4'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                Repositorio:{' '}
                <a
                  href={`https://github.com/${GITHUB_REPO}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1 font-mono"
                >
                  {GITHUB_REPO}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Status & Control Card */}
          <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Estado de la instalación
                </span>
                {updateAvailable ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <AlertCircle className="w-3 h-3" /> Actualización disponible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3" /> Al día con GitHub
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex flex-col items-center justify-center px-4 py-1 rounded-full bg-gradient-to-b from-[#0f2343] via-[#0b1a32] to-[#071222] border-2 border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
                  <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 leading-none">
                    VERSIÓN
                  </span>
                  <span className="text-xs font-black text-white tracking-tight leading-none mt-0.5 font-mono">
                    {currentVersion || 'v1.0.4'}
                  </span>
                </div>
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Versión oficial en uso</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {lastChecked
                  ? `Última comprobación: ${lastChecked.toLocaleTimeString()}`
                  : 'Sincronizado con GitHub'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onCheckForUpdates}
                disabled={isChecking}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                title="Comprueba con GitHub si todas las modificaciones están al día"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-cyan-400' : 'text-blue-400'}`} />
                {isChecking ? 'Comprobando...' : 'Comprobar si está al día'}
              </button>

              <button
                onClick={() => onToggleAutoUpdate(!autoUpdate)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  autoUpdate
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Actualiza automáticamente cuando se detecten cambios en GitHub"
              >
                <Zap className={`w-3.5 h-3.5 ${autoUpdate ? 'text-amber-400 fill-amber-400' : ''}`} />
                Auto-actualizar: {autoUpdate ? 'SÍ' : 'NO'}
              </button>
            </div>
          </div>

          {/* Pending Update Alert Banner */}
          {updateAvailable && (
            <div className="bg-gradient-to-r from-blue-950/80 via-indigo-950/80 to-blue-900/60 border border-blue-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-600/30 text-blue-400 mt-0.5">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    ¡Nueva modificación detectada en GitHub!
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                      v{updateAvailable.version}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                    {updateAvailable.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onInstallUpdate(updateAvailable)}
                disabled={isUpdating}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? 'Actualizando...' : 'Actualizar a la última versión'}
              </button>
            </div>
          )}

          {/* Versión Oficial del Sistema (Solo v1.0.4 o posteriores) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>Versión Oficial del Sistema</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                  v1.0.4
                </span>
              </h3>
              <a
                href={`https://github.com/${GITHUB_REPO}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                title="Ver historial completo de commits y ramas en GitHub"
              >
                <span>Ver historial en GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2.5">
              <div className="p-4 rounded-xl border bg-blue-950/40 border-emerald-500/50 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start sm:items-center gap-2.5">
                    {/* Oval Badge with Version */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border shadow-sm bg-emerald-950 text-emerald-300 border-emerald-500/60 ring-1 ring-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>v1.0.4</span>
                    </div>

                    {/* Current badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <ShieldCheck className="w-3 h-3" /> Versión actual en uso
                    </span>
                  </div>

                  {/* Date & Author */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 sm:self-center">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      08/11/2026, 12:00
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      Ansama
                    </span>
                    <a
                      href={`https://github.com/${GITHUB_REPO}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                      title="Ver repositorio en GitHub"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Release Description */}
                <div className="mt-3 text-xs sm:text-sm text-slate-200 font-medium pl-1 leading-relaxed">
                  Versión Oficial v1.0.4: Actualización automática en segundo plano con cierre y bloqueo seguro de sesión (solicitando la clave de acceso al inicio), asignación automática del nombre oficial de archivo PDF en informes y corrección de redondeo financiero de alta precisión en liquidaciones.
                </div>
              </div>
            </div>
          </div>

          {/* Informative Note */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
            <span className="text-base">💡</span>
            <div>
              <p className="font-semibold text-slate-300">Gestión de versiones y GitHub</p>
              <p className="mt-0.5 text-slate-400 leading-relaxed">
                Todas las modificaciones intermedias de código se gestionan directamente en tu repositorio de GitHub. Cuando se detecten archivos nuevos, la aplicación se actualizará automáticamente y se cerrará para que entres introduciendo tu clave como al inicio.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Rama: <span className="font-mono text-slate-300">principal / main</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
