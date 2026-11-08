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
      {/* 1. ÚNICA NOTIFICACIÓN AL ENTRAR TRAS ACTUALIZACIÓN */}
      {justUpdated && (
        <div className="fixed top-4 right-4 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] bg-gradient-to-r from-emerald-950/95 via-slate-900/95 to-slate-900/95 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  ¡Actualizado a la última versión {justUpdated.version || 'v1.0.4'}!
                </h4>
                <button
                  onClick={onDismissJustUpdated}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                La aplicación se ha actualizado con éxito a la versión {justUpdated.version || 'v1.0.4'}.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  VERSIÓN {justUpdated.version || 'v1.0.4'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONFIRMACIÓN DISCRETA SOLO EN COMPROBACIÓN MANUAL */}
      {manualFeedback && !justUpdated && (
        <div className="fixed top-4 right-4 sm:right-6 z-50 max-w-md w-[calc(100%-2rem)] bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            {manualFeedback.status === 'up_to_date' ? (
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Check className="w-5 h-5" />
              </div>
            ) : manualFeedback.status === 'update_available' ? (
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center text-red-400 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white">
                  {manualFeedback.status === 'up_to_date'
                    ? 'Aplicación al día'
                    : manualFeedback.status === 'update_available'
                    ? 'Nueva versión disponible'
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

              <p className="text-xs text-slate-300 mt-0.5">
                {manualFeedback.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
