'use client';

import type { LogEntry } from './Dashboard';
import styles from './LogPanel.module.css';

interface Props {
  logs: LogEntry[];
  onClear: () => void;
}

export default function LogPanel({ logs, onClear }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>📋 Activity Log</h2>
        <div className={styles.headerRight}>
          <span className={styles.count}>{logs.length} entries</span>
          <button className={styles.clearBtn} onClick={onClear} disabled={logs.length === 0}>
            Clear
          </button>
        </div>
      </div>
      <div className={styles.logContainer}>
        {logs.length === 0 ? (
          <p className={styles.empty}>No activity yet. Run a status check, smoke test, or migration to see logs.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`${styles.logEntry} ${styles[log.level]}`}>
              <span className={styles.logTime}>{log.timestamp}</span>
              <span className={styles.logBadge}>{log.level.toUpperCase()}</span>
              <span className={styles.logMessage}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
