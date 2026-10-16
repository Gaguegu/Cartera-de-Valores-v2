import React from 'react';
import { RefreshCw, X, CheckCircle2, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { AppVersionInfo, JustUpdatedNotification, ManualCheckFeedback } from '../types/version';
import { sanitizeCommitMessage } from '../utils/versionService';

interface UpdateNotificationBannerProps {
  updateAvailable: AppVersionInfo | null;
  justUpdated: JustUpdatedNotification | null;
  manualFeedback: ManualCheckFeedback | null;
  isUpdating?: boolean;
  onInstallNow: (version?: AppVersionInfo) => void;
  onForceReload?: () => void;
  onDismissJustUpdated: () => void;
  onDismissManualFeedback: () => void;
  onOpenVersionsModal: () => void;
}

export function UpdateNotificationBanner({
  updateAvailable,
  justUpdated,
  manualFeedback,
  isUpdating = false,
  onInstallNow,
  onForceReload,
  onDismissJustUpdated,
  onDismissManualFeedback,
  onOpenVersionsModal,
}: UpdateNotificationBannerProps) {
  return (
    <>
      {/* 1. TOAST: NOTIFICACIÓN DE ACTUALIZACIÓN COMPLETADA A LA ÚLTIMA VERSIÓN */}
      {justUpdated && (
        <div className="fixed top-4 right-4 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] bg-gradient-to-r from-emerald-950/95 via-slate-900/95 to-slate-900/95 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  ¡Actualizado a la última versión!
                </h4>
                <button
                  onClick={onDismissJustUpdated}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                Se han aplicado todas las modificaciones de GitHub:
                <span className="font-semibold text-emerald-300 ml-1">
                  "{sanitizeCommitMessage(justUpdated.message)}"
                </span>
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  VERSIÓN {justUpdated.version || 'v1.0.0'}
                </span>
                {justUpdated.commitSha && (
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {justUpdated.commitSha}
                  </span>
                )}
                <button
                  onClick={() => {
                    onDismissJustUpdated();
                    onOpenVersionsModal();
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-semibold flex items-center gap-1 cursor-pointer ml-auto"
                >
                  Ver versiones <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TOAST: FEEDBACK DE COMPROBACIÓN MANUAL ("COMPROBAR SI ESTÁN TODAS AL DÍA") */}
      {manualFeedback && !justUpdated && (
        <div className="fixed top-4 right-4 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            {manualFeedback.status === 'up_to_date' ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Check className="w-6 h-6" />
              </div>
            ) : manualFeedback.status === 'update_available' ? (
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-400 flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white">
                  {manualFeedback.status === 'up_to_date'
                    ? 'Todas las modificaciones al día'
                    : manualFeedback.status === 'update_available'
                    ? 'Nueva modificación disponible'
                    : 'Estado de conexión'}
                </h4>
                <button
                  onClick={onDismissManualFeedback}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Cerrar aviso"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 mt-1">
                {manualFeedback.message}
              </p>

              {manualFeedback.status === 'up_to_date' && onForceReload && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={onForceReload}
                    disabled={isUpdating}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/40 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    title="Recargar la aplicación para limpiar la memoria y cargar los últimos cambios sin cerrar la app"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                    {isUpdating ? 'Recargando...' : 'Recargar aplicación ahora'}
                  </button>
                  <button
                    onClick={() => {
                      onDismissManualFeedback();
                      onOpenVersionsModal();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                  >
                    Ver detalles
                  </button>
                </div>
              )}

              {manualFeedback.status === 'update_available' && updateAvailable && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => onInstallNow(updateAvailable)}
                    disabled={isUpdating}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/40 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                    {isUpdating ? 'Actualizando...' : 'Actualizar ahora'}
                  </button>
                  <button
                    onClick={() => {
                      onDismissManualFeedback();
                      onOpenVersionsModal();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                  >
                    Ver detalles
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
