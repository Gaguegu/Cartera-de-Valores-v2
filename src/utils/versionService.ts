import { AppVersionInfo, JustUpdatedNotification } from '../types/version';

export const GITHUB_REPO = 'Gaguegu/Cartera-de-Valores-v2';
export const GITHUB_COMMITS_API = `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=15`;
export const APP_SEMANTIC_VERSION = 'v1.0.2';

const KEY_CURRENT_VERSION = 'cartera_current_version_sha';
const KEY_JUST_UPDATED = 'cartera_just_updated_notification';
const KEY_AUTO_UPDATE_ENABLED = 'cartera_auto_update_enabled';
const KEY_CACHED_HISTORY = 'cartera_cached_versions_history';
const KEY_GITHUB_ETAG = 'cartera_github_commits_etag';

// Latest commit from GitHub repository (Gaguegu/Cartera-de-Valores)
export const INITIAL_FALLBACK_VERSION = '92ab1ff';

/**
 * Cleans and sanitizes any commit message, preventing raw JSON, planner traces,
 * or technical payloads from ever leaking into the UI.
 */
export function sanitizeCommitMessage(rawMessage?: string | null): string {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return 'Actualización y optimización de la cartera';
  }

  let text = rawMessage.trim();

  // If it's a JSON payload or planner trace like {"step_index": ...}
  if (
    text.startsWith('{') ||
    text.startsWith('[') ||
    text.includes('step_index') ||
    text.includes('PLANNER_RESPONSE') ||
    text.includes('MODEL') ||
    text.includes('tool_calls') ||
    text.includes('cache_read_tokens') ||
    text.includes('input_tokens')
  ) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        if (parsed.message && typeof parsed.message === 'string' && !parsed.message.includes('step_index')) {
          text = parsed.message;
        } else if (parsed.content && typeof parsed.content === 'string' && !parsed.content.includes('step_index')) {
          text = parsed.content;
        } else {
          return 'Actualización y mejoras en la cartera de valores';
        }
      }
    } catch {
      return 'Actualización y mejoras en la cartera de valores';
    }
  }

  // Double check if any internal technical traces remain
  if (
    text.includes('step_index') ||
    text.includes('PLANNER_RESPONSE') ||
    text.includes('tool_calls') ||
    text.includes('status":"DONE"')
  ) {
    return 'Actualización y mejoras en la cartera de valores';
  }

  // Extract first clean line
  const firstLine = text.split('\n')[0].replace(/[`"'{}]/g, '').trim();
  if (firstLine.length < 3) {
    return 'Actualización y mejoras en la cartera de valores';
  }

  return firstLine;
}

/**
 * Checks if two commits are identical by comparing their short SHAs.
 */
export function isSameCommit(sha1?: string | null, sha2?: string | null): boolean {
  if (!sha1 || !sha2) return false;
  const clean1 = sha1.trim().substring(0, 7).toLowerCase();
  const clean2 = sha2.trim().substring(0, 7).toLowerCase();
  return clean1 === clean2;
}

/**
 * Gets the currently active/installed commit SHA in this client.
 */
export function getCurrentVersionSha(): string {
  const saved = localStorage.getItem(KEY_CURRENT_VERSION);
  if (saved && saved.trim().length > 0) {
    return saved.trim().substring(0, 7);
  }
  // Initialize with the current repository version
  localStorage.setItem(KEY_CURRENT_VERSION, INITIAL_FALLBACK_VERSION);
  return INITIAL_FALLBACK_VERSION;
}

/**
 * Sets the currently active/installed version SHA.
 */
export function setCurrentVersionSha(sha: string): void {
  const cleanSha = sha.trim().substring(0, 7);
  localStorage.setItem(KEY_CURRENT_VERSION, cleanSha);
}

/**
 * Checks if auto-update preference is enabled (default: true for hands-free updates).
 */
export function isAutoUpdateEnabled(): boolean {
  const val = localStorage.getItem(KEY_AUTO_UPDATE_ENABLED);
  // Default to true so automatic updates run seamlessly in the background
  if (val === null) return true;
  return val === 'true';
}

/**
 * Sets auto-update preference.
 */
export function setAutoUpdateEnabled(enabled: boolean): void {
  localStorage.setItem(KEY_AUTO_UPDATE_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Gets and clears any post-update notification.
 */
export function consumeJustUpdatedNotification(): JustUpdatedNotification | null {
  const raw = localStorage.getItem(KEY_JUST_UPDATED);
  if (!raw) return null;
  try {
    localStorage.removeItem(KEY_JUST_UPDATED);
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || APP_SEMANTIC_VERSION,
      commitSha: parsed.commitSha || INITIAL_FALLBACK_VERSION,
      message: sanitizeCommitMessage(parsed.message),
      date: parsed.date || new Date().toISOString(),
    };
  } catch {
    localStorage.removeItem(KEY_JUST_UPDATED);
    return null;
  }
}

/**
 * Sets a notification to be shown after the app updates.
 */
export function setJustUpdatedNotification(notification: JustUpdatedNotification): void {
  const sanitized = {
    ...notification,
    message: sanitizeCommitMessage(notification.message),
  };
  localStorage.setItem(KEY_JUST_UPDATED, JSON.stringify(sanitized));
}

/**
 * Fetches the version.json file deployed with the app.
 */
export async function fetchDeployedVersion(): Promise<AppVersionInfo | null> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const shortSha = (data.commitSha || data.version || '').substring(0, 7);
    return {
      version: data.version || APP_SEMANTIC_VERSION,
      commitSha: shortSha || INITIAL_FALLBACK_VERSION,
      message: sanitizeCommitMessage(data.message),
      date: data.buildTime || new Date().toISOString(),
      author: data.author || 'Ansama',
      url: `https://github.com/${GITHUB_REPO}/commit/${data.commitSha || ''}`,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches recent commit history directly from GitHub API with ETag caching.
 */
export async function fetchGitHubCommits(): Promise<AppVersionInfo[]> {
  try {
    const cachedEtag = localStorage.getItem(KEY_GITHUB_ETAG);
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (cachedEtag) {
      headers['If-None-Match'] = cachedEtag;
    }

    const response = await fetch(GITHUB_COMMITS_API, { headers });

    // 304 Not Modified means current cached history is completely up to date
    if (response.status === 304) {
      return getCachedHistory();
    }

    if (!response.ok) {
      console.warn(`GitHub API returned status ${response.status}, falling back to cache`);
      return getCachedHistory();
    }

    const newEtag = response.headers.get('etag');
    if (newEtag) {
      localStorage.setItem(KEY_GITHUB_ETAG, newEtag);
    }

    const data = await response.json();
    if (!Array.isArray(data)) return getCachedHistory();

    const currentSha = getCurrentVersionSha();

    const history: AppVersionInfo[] = data.map((item: any) => {
      const shortSha = item.sha.substring(0, 7);
      const cleanMsg = sanitizeCommitMessage(item.commit?.message);
      return {
        version: shortSha,
        commitSha: item.sha,
        message: cleanMsg,
        date: item.commit?.author?.date || new Date().toISOString(),
        author: item.commit?.author?.name || item.author?.login || 'Ansama',
        url: item.html_url || `https://github.com/${GITHUB_REPO}/commit/${item.sha}`,
        isCurrent: isSameCommit(shortSha, currentSha),
      };
    });

    // Cache to localStorage
    if (history.length > 0) {
      localStorage.setItem(KEY_CACHED_HISTORY, JSON.stringify(history));
    }

    return history;
  } catch (error) {
    console.warn('Could not fetch commits directly from GitHub API, using cache:', error);
    return getCachedHistory();
  }
}

/**
 * Retrieves cached versions history or fallback repository list.
 */
export function getCachedHistory(): AppVersionInfo[] {
  const raw = localStorage.getItem(KEY_CACHED_HISTORY);
  const currentSha = getCurrentVersionSha();

  if (raw) {
    try {
      const parsed: AppVersionInfo[] = JSON.parse(raw);
      return parsed.map(p => ({
        ...p,
        message: sanitizeCommitMessage(p.message),
        isCurrent: isSameCommit(p.version, currentSha) || isSameCommit(p.commitSha, currentSha),
      }));
    } catch {
      // ignore
    }
  }

  // Fallback initial list matching GitHub repository commits
  return [
    {
      version: 'ca04a78',
      commitSha: 'ca04a78b62e2c0cdec349e96cca5b680229b2b2d',
      message: 'chore: bump application version to v1.0.0',
      date: '2026-10-09T18:08:24Z',
      author: 'Ansama',
      url: `https://github.com/${GITHUB_REPO}/commit/ca04a78b62e2c0cdec349e96cca5b680229b2b2d`,
      isCurrent: isSameCommit(currentSha, 'ca04a78'),
    },
    {
      version: '1a1718d',
      commitSha: '1a1718d859d8ad7c83bbcbb77d794e6eeeb05d19',
      message: 'feat: implement manual update check functionality',
      date: '2026-10-09T18:02:26Z',
      author: 'Ansama',
      url: `https://github.com/${GITHUB_REPO}/commit/1a1718d859d8ad7c83bbcbb77d794e6eeeb05d19`,
      isCurrent: isSameCommit(currentSha, '1a1718d'),
    },
    {
      version: '755adff',
      commitSha: '755adff4c9af6a38cf81ac9a3cae4bc22483530a',
      message: 'feat: implement manual update check functionality',
      date: '2026-10-09T17:50:53Z',
      author: 'Ansama',
      url: `https://github.com/${GITHUB_REPO}/commit/755adff4c9af6a38cf81ac9a3cae4bc22483530a`,
      isCurrent: isSameCommit(currentSha, '755adff'),
    },
    {
      version: '8e54940',
      commitSha: '8e54940213992b3fc1a33f1e7eabd6a2d0c76d98',
      message: 'feat: implement automatic update checker and version tracking',
      date: '2026-10-09T17:33:24Z',
      author: 'Ansama',
      url: `https://github.com/${GITHUB_REPO}/commit/8e54940213992b3fc1a33f1e7eabd6a2d0c76d98`,
      isCurrent: isSameCommit(currentSha, '8e54940'),
    },
    {
      version: '0e15465',
      commitSha: '0e154658255c99b2cdbf7a9965b9cc7f7ef9680f',
      message: 'build: upgrade esbuild and update dependency install',
      date: '2026-10-09T16:58:01Z',
      author: 'Ansama',
      url: `https://github.com/${GITHUB_REPO}/commit/0e154658255c99b2cdbf7a9965b9cc7f7ef9680f`,
      isCurrent: isSameCommit(currentSha, '0e15465'),
    },
    {
      version: 'fb5cec6',
      commitSha: 'fb5cec673bcd417443aa4a0d7e0130b3da5dca79',
      message: 'build: initialize project dependencies',
      date: '2026-10-09T16:53:30Z',
      author: 'Ansama',
      url: `https://github.com/${GITHUB_REPO}/commit/fb5cec673bcd417443aa4a0d7e0130b3da5dca79`,
      isCurrent: isSameCommit(currentSha, 'fb5cec6'),
    },
    {
      version: '054dc0a',
      commitSha: '054dc0ad387f0f9d38157dae7424eeaeb7fde2cd',
      message: 'ci: update deployment workflow and dependency install',
      date: '2026-10-09T16:08:13Z',
      author: 'Ansama',
      url: `https://github.com/${GITHUB_REPO}/commit/054dc0ad387f0f9d38157dae7424eeaeb7fde2cd`,
      isCurrent: isSameCommit(currentSha, '054dc0a'),
    },
    {
      version: 'ad1eee0',
      commitSha: 'ad1eee0bcda48627a7fcb166869b7b082cc000be',
      message: 'feat: initial project scaffold',
      date: '2026-10-09T15:54:07Z',
      author: 'Ansama',
      url: `https://github.com/${GITHUB_REPO}/commit/ad1eee0bcda48627a7fcb166869b7b082cc000be`,
      isCurrent: isSameCommit(currentSha, 'ad1eee0'),
    },
    {
      version: 'a85ac28',
      commitSha: 'a85ac2838501c94df36769f0a9d2d1be6d7dff7d',
      message: 'Initial commit',
      date: '2026-10-09T15:51:27Z',
      author: 'Ansama',
      url: `https://github.com/${GITHUB_REPO}/commit/a85ac2838501c94df36769f0a9d2d1be6d7dff7d`,
      isCurrent: isSameCommit(currentSha, 'a85ac28'),
    },
  ];
}

/**
 * Applies an update cleanly in client storage without causing disruptive infinite reloads.
 */
export function applyAppUpdate(newVersion: AppVersionInfo): JustUpdatedNotification {
  const targetSha = (newVersion.commitSha || newVersion.version || INITIAL_FALLBACK_VERSION).substring(0, 7);
  
  // Set current version in local storage
  setCurrentVersionSha(targetSha);

  const notification: JustUpdatedNotification = {
    version: newVersion.version || APP_SEMANTIC_VERSION,
    commitSha: targetSha,
    message: sanitizeCommitMessage(newVersion.message),
    date: new Date().toISOString(),
  };

  // Store update banner confirmation
  setJustUpdatedNotification(notification);

  return notification;
}

/**
 * Sound notification on successful update.
 */
export function playUpdateChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch {
    // AudioContext might be blocked until user gesture, safely ignore
  }
}
