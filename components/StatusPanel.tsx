'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LogEntry } from './Dashboard';
import styles from './StatusPanel.module.css';

interface RedisStatus {
  url: string;
  status: string;
  latency: number | null;
  error: string | null;
}

interface StatusData {
  source: RedisStatus;
  target: RedisStatus;
  timestamp: string;
}

interface Props {
  addLog: (level: LogEntry['level'], message: string) => void;
}

export default function StatusPanel({ addLog }: Props) {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/status');
      const json = (await res.json()) as StatusData;
      setData(json);
      addLog(
        json.source.status === 'connected' && json.target.status === 'connected'
          ? 'success'
          : 'warning',
        `Status check: Source=${json.source.status}, Target=${json.target.status}`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch status';
      addLog('error', msg);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>📡 Connection Status</h2>
        <button
          className={styles.refreshBtn}
          onClick={() => void fetchStatus()}
          disabled={loading}
        >
          {loading ? '⟳ Checking...' : '↻ Refresh'}
        </button>
      </div>
      <div className={styles.cards}>
        <StatusCard
          label="Source Redis"
          data={data?.source ?? null}
          loading={loading}
        />
        <StatusCard
          label="Target Redis"
          data={data?.target ?? null}
          loading={loading}
        />
      </div>
      {data && (
        <p className={styles.timestamp}>Last checked: {new Date(data.timestamp).toLocaleString()}</p>
      )}
    </div>
  );
}

function StatusCard({
  label,
  data,
  loading,
}: {
  label: string;
  data: RedisStatus | null;
  loading: boolean;
}) {
  const isConnected = data?.status === 'connected';
  const isError = data?.status === 'error';

  return (
    <div className={`${styles.card} ${isConnected ? styles.cardConnected : isError ? styles.cardError : styles.cardUnknown}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardLabel}>{label}</span>
        <span
          className={`${styles.statusBadge} ${
            isConnected
              ? styles.badgeConnected
              : isError
              ? styles.badgeError
              : styles.badgeUnknown
          }`}
        >
          <span className={styles.statusDot} />
          {loading ? 'Checking' : data?.status ?? 'Unknown'}
        </span>
      </div>
      {data && (
        <>
          <p className={styles.cardUrl}>{data.url}</p>
          {data.latency !== null && (
            <p className={styles.cardLatency}>Latency: {data.latency}ms</p>
          )}
          {data.error && <p className={styles.cardError2}>{data.error}</p>}
        </>
      )}
    </div>
  );
}
