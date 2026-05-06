'use client';

import { useState } from 'react';
import type { LogEntry } from './Dashboard';
import styles from './MigrationPanel.module.css';

interface MigrationResponse {
  success: boolean;
  dryRun: boolean;
  keyPattern: string;
  totalKeys: number;
  migratedCount: number;
  errorCount: number;
  errors: string[];
  timestamp: string;
  error?: string;
}

interface Props {
  addLog: (level: LogEntry['level'], message: string) => void;
}

export default function MigrationPanel({ addLog }: Props) {
  const [keyPattern, setKeyPattern] = useState('*');
  const [batchSize, setBatchSize] = useState(100);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResponse | null>(null);

  const runMigration = async () => {
    setLoading(true);
    setResult(null);
    addLog('info', `Starting migration: pattern="${keyPattern}", dryRun=${dryRun}, batchSize=${batchSize}`);
    try {
      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyPattern, batchSize, dryRun }),
      });
      const json = (await res.json()) as MigrationResponse;
      setResult(json);
      if (json.success) {
        addLog(
          'success',
          `Migration ${dryRun ? 'dry run' : ''} complete: ${json.migratedCount}/${json.totalKeys} keys ${dryRun ? 'found' : 'migrated'}`
        );
      } else {
        addLog('error', `Migration failed: ${json.error ?? 'Unknown error'}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Migration failed';
      addLog('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.warningBanner}>
        <span>⚠️</span>
        <span>Always run a <strong>dry run</strong> first to verify the migration scope before executing.</span>
      </div>

      <div className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Key Pattern</label>
            <input
              type="text"
              className={styles.input}
              value={keyPattern}
              onChange={(e) => setKeyPattern(e.target.value)}
              placeholder="e.g. user:*, session:*, *"
            />
            <p className={styles.hint}>Use Redis SCAN pattern syntax</p>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Batch Size</label>
            <input
              type="number"
              className={styles.input}
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 100)}
              min={1}
              max={10000}
            />
            <p className={styles.hint}>Keys per SCAN iteration</p>
          </div>
        </div>

        <div className={styles.dryRunToggle}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.toggleText}>
              <strong>Dry Run Mode</strong>
              <span className={styles.toggleDesc}>Scan and count keys without migrating</span>
            </span>
          </label>
        </div>

        <button
          className={`${styles.migrateBtn} ${!dryRun ? styles.migrateBtnReal : ''}`}
          onClick={() => void runMigration()}
          disabled={loading}
        >
          {loading
            ? '⟳ Processing...'
            : dryRun
            ? '🔍 Run Dry Run'
            : '🚀 Execute Migration'}
        </button>
      </div>

      {result && (
        <div className={styles.result}>
          <div
            className={`${styles.resultHeader} ${
              result.success ? styles.resultSuccess : styles.resultError
            }`}
          >
            <div>
              <p className={styles.resultTitle}>
                {result.success
                  ? result.dryRun
                    ? '🔍 Dry Run Complete'
                    : '✅ Migration Complete'
                  : '❌ Migration Failed'}
              </p>
              <p className={styles.resultTimestamp}>
                {new Date(result.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <p className={styles.statValue}>{result.totalKeys}</p>
              <p className={styles.statLabel}>Total Keys Found</p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statValue}>{result.migratedCount}</p>
              <p className={styles.statLabel}>{result.dryRun ? 'Keys Scanned' : 'Keys Migrated'}</p>
            </div>
            <div className={styles.stat}>
              <p className={`${styles.statValue} ${result.errorCount > 0 ? styles.statError : ''}`}>
                {result.errorCount}
              </p>
              <p className={styles.statLabel}>Errors</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className={styles.errorList}>
              <p className={styles.errorTitle}>Errors (first 10):</p>
              {result.errors.map((err, i) => (
                <p key={i} className={styles.errorItem}>
                  {err}
                </p>
              ))}
            </div>
          )}

          {result.error && (
            <div className={styles.errorList}>
              <p className={styles.errorItem}>{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
