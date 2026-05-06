'use client';

import { useState } from 'react';
import StatusPanel from './StatusPanel';
import SmokeTestPanel from './SmokeTestPanel';
import MigrationPanel from './MigrationPanel';
import LogPanel from './LogPanel';
import styles from './Dashboard.module.css';

export type LogEntry = {
  id: number;
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
};

let logId = 0;

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'smoke' | 'migrate'>('smoke');

  const addLog = (level: LogEntry['level'], message: string) => {
    setLogs((prev) => [
      {
        id: ++logId,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      },
      ...prev.slice(0, 99),
    ]);
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🔥</span>
            <div>
              <h1 className={styles.title}>Smoke Redis Migration</h1>
              <p className={styles.subtitle}>Test and migrate Redis data with confidence</p>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <StatusPanel addLog={addLog} />

        <div className={styles.tabContainer}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'smoke' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('smoke')}
            >
              🧪 Smoke Tests
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'migrate' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('migrate')}
            >
              🚀 Migration
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'smoke' ? (
              <SmokeTestPanel addLog={addLog} />
            ) : (
              <MigrationPanel addLog={addLog} />
            )}
          </div>
        </div>

        <LogPanel logs={logs} onClear={() => setLogs([])} />
      </main>
    </div>
  );
}
