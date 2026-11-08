import { useState, useEffect, useCallback, useRef } from 'react';
import { AppVersionInfo, JustUpdatedNotification, ManualCheckFeedback } from '../types/version';
import {
  getCurrentVersionSha,
  fetchGitHubCommits,
  fetchDeployedVersion,
  applyAppUpdate,
  consumeJustUpdatedNotification,
  playUpdateChime,
  isSameCommit,
  APP_SEMANTIC_VERSION,
  isAutoUpdateEnabled,
  setAutoUpdateEnabled as saveAutoUpdatePref,
  getCachedHistory,
  sanitizeCommitMessage,
} from '../utils/versionService';

export function useAppUpdater() {
  const [currentVersionSha, setCurrentVersionSha] = useState<string>(() => getCurrentVersionSha());
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateAvailable, setUpdateAvailable] = useState<AppVersionInfo | null>(null);
  const [justUpdated, setJustUpdated] = useState<JustUpdatedNotification | null>(null);
  const [manualFeedback, setManualFeedback] = useState<ManualCheckFeedback | null>(null);
  const [history, setHistory] = useState<AppVersionInfo[]>(() => getCachedHistory());
  const [autoUpdate, setAutoUpdate] = useState<boolean>(() => isAutoUpdateEnabled());
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const justUpdatedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef<boolean>(false);
  const autoUpdateRef = useRef<boolean>(autoUpdate);

  // Keep autoUpdateRef synchronized with state
  useEffect(() => {
    autoUpdateRef.current = autoUpdate;
  }, [autoUpdate]);

  // Check if we just reloaded or have a pending post-update notice
  // Check if we just reloaded or have a pending post-update notice
  useEffect(() => {
    const pendingNotice = localStorage.getItem('cartera_pending_update_banner');
    if (pendingNotice) {
      localStorage.removeItem('cartera_pending_update_banner');
      setJustUpdated({
        version: pendingNotice || APP_SEMANTIC_VERSION,
        commitSha: '',
        message: `Aplicación actualizada con éxito a la última versión ${pendingNotice || APP_SEMANTIC_VERSION}.`,
        date: new Date().toISOString(),
      });
      playUpdateChime();

      justUpdatedTimerRef.current = setTimeout(() => {
        setJustUpdated(null);
      }, 6000);
      return;
    }

    const notice = consumeJustUpdatedNotification();
    if (notice) {
      setJustUpdated({
        version: APP_SEMANTIC_VERSION,
        commitSha: '',
        message: `Aplicación actualizada a la última versión ${APP_SEMANTIC_VERSION}.`,
        date: new Date().toISOString(),
      });
      playUpdateChime();

      justUpdatedTimerRef.current = setTimeout(() => {
        setJustUpdated(null);
      }, 6000);
    }

    return () => {
      if (justUpdatedTimerRef.current) {
        clearTimeout(justUpdatedTimerRef.current);
      }
    };
  }, []);

  /**
   * Check for updates from GitHub API and deployed version.
   * Cuando detecta archivos nuevos en GitHub:
   * 1. Aplica la actualización.
   * 2. Cierra la aplicación bloqueando la sesión para pedir la clave al inicio.
   * 3. Muestra una única notificación al acceder a la aplicación.
   */
  const checkForUpdates = useCallback(async (isManual = false) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }

    try {
      // 1. Fetch commits from GitHub
      const commits = await fetchGitHubCommits();
      const activeSha = getCurrentVersionSha();
      let latestCommit: AppVersionInfo | null = null;

      if (commits && commits.length > 0) {
        setHistory(commits);
        latestCommit = commits[0];
      }

      // 2. Fetch deployed version.json as secondary confirmation
      const deployed = await fetchDeployedVersion();
      if (!latestCommit && deployed) {
        latestCommit = deployed;
      }

      const now = new Date();
      setLastChecked(now);

      if (latestCommit) {
        const upToDate =
          isSameCommit(latestCommit.commitSha, activeSha) ||
          isSameCommit(latestCommit.version, activeSha);

        if (!upToDate) {
          // ¡Nueva actualización / archivos detectados en GitHub!
          applyAppUpdate(latestCommit);

          // Guardamos la señal para mostrar la única notificación de éxito cuando el usuario entre
          localStorage.setItem('cartera_pending_update_banner', APP_SEMANTIC_VERSION);

          // Cerramos y bloqueamos la sesión para pedir la clave como al inicio
          sessionStorage.removeItem('cartera_session_token');
          sessionStorage.removeItem('cartera_session_pass');
          sessionStorage.removeItem('cartera_just_reloaded');

          // Limpiamos las cachés del navegador
          if ('caches' in window) {
            try {
              const cacheKeys = await window.caches.keys();
              await Promise.all(cacheKeys.map(k => window.caches.delete(k)));
            } catch {}
          }

          // Se actualiza y se cierra la aplicación inmediatamente recargando hacia la pantalla de acceso
          window.location.reload();
          return;
        } else {
          // Completamente al día
          setUpdateAvailable(null);

          if (isManual) {
            setManualFeedback({
              status: 'up_to_date',
              message: `La aplicación ya está actualizada a la última versión (${APP_SEMANTIC_VERSION}).`,
              version: APP_SEMANTIC_VERSION,
              commitSha: activeSha,
              timestamp: now,
            });

            feedbackTimerRef.current = setTimeout(() => {
              setManualFeedback(null);
            }, 3000);
          }
        }
      } else {
        setUpdateAvailable(null);
        if (isManual) {
          setManualFeedback({
            status: 'up_to_date',
            message: `La aplicación ya está actualizada a la última versión (${APP_SEMANTIC_VERSION}).`,
            version: APP_SEMANTIC_VERSION,
            commitSha: activeSha,
            timestamp: now,
          });
          feedbackTimerRef.current = setTimeout(() => {
            setManualFeedback(null);
          }, 3000);
        }
      }
    } catch (e) {
      console.warn('Error checking for updates:', e);
      if (isManual) {
        setManualFeedback({
          status: 'error',
          message: 'No se pudo conectar con GitHub en este momento. Inténtalo de nuevo más tarde.',
          timestamp: new Date(),
        });
        feedbackTimerRef.current = setTimeout(() => {
          setManualFeedback(null);
        }, 3000);
      }
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, []);

  // 1. Initial check on mount
  useEffect(() => {
    checkForUpdates(false);
  }, [checkForUpdates]);

  // 2. Periodic background check every 5 min (prevents GitHub API 60 req/hr rate limit)
  useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdates(false);
    }, 300000);

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  // 3. Check immediately when window gains focus or tab becomes visible
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(false);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [checkForUpdates]);

  /**
   * Instantly applies the update and reloads the application cleanly,
   * clearing cache storage and showing the success banner upon reload.
   */
  const handleInstallNow = async (versionToInstall?: AppVersionInfo) => {
    const target = versionToInstall || updateAvailable;
    setIsUpdating(true);

    try {
      if (target) {
        applyAppUpdate(target);
      }
      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map(k => window.caches.delete(k)));
      }
    } catch {
      // ignore
    }

    // Guardamos la señal para mostrar la única notificación de éxito cuando el usuario vuelva a entrar
    localStorage.setItem('cartera_pending_update_banner', APP_SEMANTIC_VERSION);

    // Cerramos la aplicación bloqueando la sesión para solicitar la clave al inicio
    sessionStorage.removeItem('cartera_session_token');
    sessionStorage.removeItem('cartera_session_pass');
    sessionStorage.removeItem('cartera_just_reloaded');

    window.location.reload();
  };

  /**
   * Recarga limpia cerrando la sesión para que se vuelva a solicitar la clave
   */
  const handleForceReload = async () => {
    setIsUpdating(true);

    try {
      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map(k => window.caches.delete(k)));
      }
    } catch {
      // ignore
    }

    sessionStorage.removeItem('cartera_session_token');
    sessionStorage.removeItem('cartera_session_pass');
    sessionStorage.removeItem('cartera_just_reloaded');
    window.location.reload();
  };

  const handleToggleAutoUpdate = (enabled: boolean) => {
    setAutoUpdate(enabled);
    saveAutoUpdatePref(enabled);
  };

  const dismissJustUpdated = () => {
    if (justUpdatedTimerRef.current) {
      clearTimeout(justUpdatedTimerRef.current);
    }
    setJustUpdated(null);
  };

  const dismissManualFeedback = () => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    setManualFeedback(null);
  };

  return {
    currentVersion: APP_SEMANTIC_VERSION,
    currentVersionSha,
    isChecking,
    isUpdating,
    updateAvailable,
    justUpdated,
    manualFeedback,
    history,
    autoUpdate,
    lastChecked,
    checkForUpdates,
    handleInstallNow,
    handleForceReload,
    handleToggleAutoUpdate,
    dismissJustUpdated,
    dismissManualFeedback,
  };
}
