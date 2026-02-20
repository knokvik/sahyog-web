import { useState } from 'react';
import { useDisastersList, useCreateDisaster, useActivateDisaster, useResolveDisaster } from '../api/hooks';
import styles from './DataList.module.css';

const filters = ['All', 'active', 'contained', 'resolved'];

function StatusBadge({ status }) {
  return <span className={`${styles.badge} ${styles[`badge_${status}`] || styles.badge_muted}`}>{status}</span>;
}

function SeverityBadge({ severity }) {
  const map = { critical: 'critical', high: 'warning', medium: 'info', low: 'muted' };
  const sev = severity != null ? String(severity).toLowerCase() : null;
  const variant = map[sev] || 'muted';
  return <span className={`${styles.badge} ${styles[`badge_${variant}`]}`}>{severity ?? '—'}</span>;
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function DisastersList() {
  const { data: list, isLoading, error } = useDisastersList();
  const createDisaster = useCreateDisaster();
  const activateDisaster = useActivateDisaster();
  const resolveDisaster = useResolveDisaster();
  const [activeFilter, setActiveFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: '', severity: 'high' });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createDisaster.mutate(form, {
      onSuccess: () => {
        setForm({ name: '', type: '', severity: 'high' });
        setShowForm(false);
      },
    });
  };

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
        <button className={styles.actionBtn} onClick={() => setShowForm(!showForm)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'Create Disaster'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form className={styles.inlineForm} onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Disaster name*"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className={styles.formInput}
            required
          />
          <input
            type="text"
            placeholder="Type (flood, fire, earthquake…)"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
            className={styles.formInput}
          />
          <select
            value={form.severity}
            onChange={e => setForm({ ...form, severity: e.target.value })}
            className={styles.select}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button type="submit" className={styles.submitBtn} disabled={createDisaster.isPending}>
            {createDisaster.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
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
                  <td>
                    <div className={styles.actionGroup}>
                      {row.status !== 'active' && (
                        <button
                          className={styles.actionSmall}
                          onClick={() => activateDisaster.mutate(row.id)}
                          disabled={activateDisaster.isPending}
                          title="Activate"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_arrow</span>
                        </button>
                      )}
                      {row.status !== 'resolved' && (
                        <button
                          className={`${styles.actionSmall} ${styles.actionDanger}`}
                          onClick={() => resolveDisaster.mutate(row.id)}
                          disabled={resolveDisaster.isPending}
                          title="Resolve"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                        </button>
                      )}
                    </div>
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
