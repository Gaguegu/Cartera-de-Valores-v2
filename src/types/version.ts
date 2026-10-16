export interface AppVersionInfo {
  version: string;
  commitSha: string;
  message: string;
  date: string;
  author: string;
  url?: string;
  isCurrent?: boolean;
}

export interface JustUpdatedNotification {
  version: string;
  commitSha?: string;
  message: string;
  date: string;
}

export interface ManualCheckFeedback {
  status: 'up_to_date' | 'update_available' | 'error';
  message: string;
  version?: string;
  commitSha?: string;
  timestamp: Date;
}
