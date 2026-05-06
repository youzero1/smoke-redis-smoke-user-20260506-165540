'use client';

import { useState } from 'react';
import type { LogEntry } from './Dashboard';
import styles from './SmokeTestPanel.module.css';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration: number;
}

interface SmokeTestResponse {
  success: boolean;
  target: string;
  url: string;
  results: TestResult[];
  summary: { total: number; passed: number; failed: number };
  timestamp: string;
  error?: string;
}

interface Props {
  addLog: (level: LogEntry['level'], message: string) => void;
}

export default function SmokeTestPanel({ addLog }: Props) {
  const [target, setTarget] = useState<'source' | 'target'>('source');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SmokeTestResponse | null>(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    addLog('info', `Running smoke tests on ${target} Redis...`);
    try {
      const res = await fetch('/api/smoke-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const json = (await res.json()) as SmokeTestResponse;
      setResult(json);
      if (json.success) {
        addLog('success', `Smoke tests passed: ${json.summary.passed}/${json.summary.total} on ${target}`);
      } else {
        addLog('error', `Smoke tests failed: ${json.summary.failed} failures on ${target}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Smoke test failed';
      addLog('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.targetSelector}>
          <label className={styles.label}>Target Instance</label>
          <div className={styles.toggleGroup}>
            <button
              className={`${styles.toggleBtn} ${target === 'source' ? styles.activeToggle : ''}`}
              onClick={() => setTarget('source')}
            >
              Source Redis
            </button>
            <button
              className={`${styles.toggleBtn} ${target === 'target' ? styles.activeToggle : ''}`}
              onClick={() => setTarget('target')}
            >
              Target Redis
            </button>
          </div>
        </div>
        <button
          className={styles.runBtn}
          onClick={() => void runTest()}
          disabled={loading}
        >
          {loading ? '⟳ Running Tests...' : '▶ Run Smoke Tests'}
        </button>
      </div>

      {result && (
        <div className={styles.results}>
          <div className={`${styles.summary} ${result.success ? styles.summaryPass : styles.summaryFail}`}>
            <span className={styles.summaryIcon}>{result.success ? '✅' : '❌'}</span>
            <div>
              <p className={styles.summaryTitle}>
                {result.success ? 'All tests passed!' : 'Some tests failed'}
              </p>
              <p className={styles.summaryDetail}>
                {result.summary.passed} passed · {result.summary.failed} failed · {result.summary.total} total
              </p>
            </div>
          </div>

          <div className={styles.testList}>
            {result.results.map((test, i) => (
              <div
                key={i}
                className={`${styles.testItem} ${
                  test.status === 'pass'
                    ? styles.testPass
                    : test.status === 'fail'
                    ? styles.testFail
                    : styles.testSkip
                }`}
              >
                <div className={styles.testLeft}>
                  <span className={styles.testIcon}>
                    {test.status === 'pass' ? '✓' : test.status === 'fail' ? '✗' : '−'}
                  </span>
                  <div>
                    <p className={styles.testName}>{test.name}</p>
                    <p className={styles.testMessage}>{test.message}</p>
                  </div>
                </div>
                <span className={styles.testDuration}>{test.duration}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className={styles.empty}>
          <p className={styles.emptyIcon}>🧪</p>
          <p>Select a target and run smoke tests to verify Redis connectivity and operations.</p>
        </div>
      )}
    </div>
  );
}
