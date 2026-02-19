import { useState } from 'react';
import { useDisastersList } from '../api/hooks';
import styles from './DataList.module.css';

const filters = ['All', 'active', 'contained', 'resolved'];

function StatusBadge({ status }) {
  return <span className={`${styles.badge} ${styles[`badge_${status}`] || styles.badge_muted}`}>{status}</span>;
}

function SeverityBadge({ severity }) {
  const map = { critical: 'critical', high: 'warning', medium: 'info', low: 'muted' };
  const s = String(severity ?? '').toLowerCase();
  const variant = map[s] || 'muted';
  return <span className={`${styles.badge} ${styles[`badge_${variant}`]}`}>{severity ?? '—'}</span>;
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function DisastersList() {
  const { data: list, isLoading, error } = useDisastersList();
  const [activeFilter, setActiveFilter] = useState('All');

  if (isLoading) return <div className={styles.loading}>Loading disaster zones…</div>;
  if (error) return <div className={styles.error}>⚠️ Error: {error.message}</div>;

  const allRows = Array.isArray(list) ? list : [];
  const rows = activeFilter === 'All' ? allRows : allRows.filter(r => r.status === activeFilter);
  const activeCount = allRows.filter(d => d.status === 'active').length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.title}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#f59e0b' }}>flood</span>
            Disaster Zones
          </h1>
          <p className={styles.subtitle}>{activeCount} active zones · {allRows.length} total</p>
        </div>
      </div>

      <div className={styles.filterRow}>
        {filters.map(f => (
          <button
            key={f}
            className={`${styles.filterPill} ${activeFilter === f ? styles.filterPillActive : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f === 'All' ? 'All' : f}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Activated</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className={styles.emptyState}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.3 }}>landscape</span>
                    <p className={styles.emptyText}>No disaster zones found</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.name}</td>
                  <td>{row.type ?? '—'}</td>
                  <td><StatusBadge status={row.status} /></td>
                  <td><SeverityBadge severity={row.severity} /></td>
                  <td className={styles.timeCell}>{formatTime(row.activated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
