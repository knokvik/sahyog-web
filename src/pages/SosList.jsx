import { useState } from 'react';
import { useSosList, useUpdateSosStatus } from '../api/hooks';
import styles from './DataList.module.css';

const statusOptions = ['pending', 'in_progress', 'resolved', 'cancelled'];
const filters = ['All', 'pending', 'in_progress', 'resolved', 'cancelled'];

function StatusBadge({ status }) {
  return <span className={`${styles.badge} ${styles[`badge_${status}`] || styles.badge_muted}`}>{status?.replace('_', ' ')}</span>;
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function SosList() {
  const { data: list, isLoading, error } = useSosList();
  const updateStatus = useUpdateSosStatus();
  const [activeFilter, setActiveFilter] = useState('All');

  if (isLoading) return <div className={styles.loading}>Loading SOS alerts…</div>;
  if (error) return <div className={styles.error}>⚠️ Error: {error.message}</div>;

  const allRows = Array.isArray(list) ? list : [];
  const rows = activeFilter === 'All' ? allRows : allRows.filter(r => r.status === activeFilter);
  const activeCount = allRows.filter(s => s.status !== 'resolved' && s.status !== 'cancelled').length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.title}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#ef4444' }}>sos</span>
            SOS Alerts
          </h1>
          <p className={styles.subtitle}>{activeCount} active · {allRows.length} total</p>
        </div>
      </div>

      <div className={styles.filterRow}>
        {filters.map(f => (
          <button
            key={f}
            className={`${styles.filterPill} ${activeFilter === f ? styles.filterPillActive : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f === 'All' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={styles.emptyState}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.3 }}>inbox</span>
                    <p className={styles.emptyText}>No SOS alerts found</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id}>
                  <td><code className={styles.idCode}>#{row.id?.slice(0, 8)}</code></td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>{row.type ?? '—'}</td>
                  <td style={{ fontWeight: 700 }}>{row.priority_score ?? '—'}</td>
                  <td className={styles.timeCell}>{formatTime(row.created_at)}</td>
                  <td>
                    <select
                      value={row.status}
                      onChange={(e) => updateStatus.mutate({ id: row.id, status: e.target.value })}
                      disabled={updateStatus.isPending}
                      className={styles.select}
                    >
                      {statusOptions.map(s => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
