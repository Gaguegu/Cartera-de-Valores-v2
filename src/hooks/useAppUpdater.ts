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
  useEffect(() => {
    const justReloaded = sessionStorage.getItem('cartera_just_reloaded');
    if (justReloaded) {
      sessionStorage.removeItem('cartera_just_reloaded');
      setJustUpdated({
        version: APP_SEMANTIC_VERSION,
        commitSha: getCurrentVersionSha(),
        message: 'Aplicación recargada con éxito a la última versión disponible.',
        date: new Date().toISOString(),
      });
      playUpdateChime();

      justUpdatedTimerRef.current = setTimeout(() => {
        setJustUpdated(null);
      }, 7000);
      return;
    }

    const notice = consumeJustUpdatedNotification();
    if (notice) {
      setJustUpdated(notice);
      setCurrentVersionSha(notice.commitSha || getCurrentVersionSha());
      playUpdateChime();

      justUpdatedTimerRef.current = setTimeout(() => {
        setJustUpdated(null);
      }, 7000);
    }

    return () => {
      if (justUpdatedTimerRef.current) {
        clearTimeout(justUpdatedTimerRef.current);
      }
    };
  }, []);

  /**
   * Check for updates from GitHub API and deployed version.
   * If autoUpdate is enabled, automatically installs and applies the update in-place,
   * notifying the user once updated without requiring closing/reopening the app.
   * If isManual is true, provides user-facing feedback toast and status.
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
          // New update detected!
          if (autoUpdateRef.current) {
            // AUTOMATIC UPDATE: Apply update cleanly in-place without restarting
            const notice = applyAppUpdate(latestCommit);
            const targetSha = (latestCommit.commitSha || latestCommit.version).substring(0, 7);

            setCurrentVersionSha(targetSha);
            setUpdateAvailable(null);
            setManualFeedback(null);
            setJustUpdated(notice);

            // Refresh history list marking the new target as current
            setHistory(prev =>
              prev.map(item => ({
                ...item,
                isCurrent: isSameCommit(item.version, targetSha) || isSameCommit(item.commitSha, targetSha),
              }))
            );

            playUpdateChime();

            if (justUpdatedTimerRef.current) {
              clearTimeout(justUpdatedTimerRef.current);
            }
            justUpdatedTimerRef.current = setTimeout(() => {
              setJustUpdated(null);
            }, 7000);

            if (isManual) {
              const cleanMsg = sanitizeCommitMessage(latestCommit.message);
              setManualFeedback({
                status: 'up_to_date',
                message: `¡Actualizado a la última versión! Se han sincronizado las modificaciones (${targetSha}): "${cleanMsg}".`,
                version: APP_SEMANTIC_VERSION,
                commitSha: targetSha,
                timestamp: now,
              });
              feedbackTimerRef.current = setTimeout(() => {
                setManualFeedback(null);
              }, 4500);
            }
          } else {
            // Manual mode: Notify that update is ready to install
            setUpdateAvailable(latestCommit);

            if (isManual) {
              const cleanMsg = sanitizeCommitMessage(latestCommit.message);
              setManualFeedback({
                status: 'update_available',
                message: `Nueva modificación detectada: "${cleanMsg}".`,
                version: latestCommit.version,
                commitSha: latestCommit.commitSha,
                timestamp: now,
              });
            }
          }
        } else {
          // Completely up to date
          setUpdateAvailable(null);

          if (isManual) {
            setManualFeedback({
              status: 'up_to_date',
              message: `¡Todas las modificaciones están al día! Tu versión activa coincide con el último commit de GitHub (${activeSha.substring(0, 7)}).`,
              version: APP_SEMANTIC_VERSION,
              commitSha: activeSha,
              timestamp: now,
            });

            feedbackTimerRef.current = setTimeout(() => {
              setManualFeedback(null);
            }, 4500);
          }
        }
      } else {
        setUpdateAvailable(null);
        if (isManual) {
          setManualFeedback({
            status: 'up_to_date',
            message: `¡Todas las actualizaciones están al día! Tienes la última versión (${APP_SEMANTIC_VERSION}).`,
            version: APP_SEMANTIC_VERSION,
            commitSha: activeSha,
            timestamp: now,
          });
          feedbackTimerRef.current = setTimeout(() => {
            setManualFeedback(null);
          }, 4500);
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
        }, 4500);
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

    sessionStorage.setItem('cartera_just_reloaded', 'true');
    window.location.reload();
  };

  /**
   * Forces a clean cache-busting reload of the app so any code modifications
   * take effect immediately without requiring the user to manually close and reopen the app.
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

    sessionStorage.setItem('cartera_just_reloaded', 'true');
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
