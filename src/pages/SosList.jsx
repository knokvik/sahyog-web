import { useState } from 'react';
import { useSosList, useUpdateSosStatus, useVolunteersList, useCreateTask } from '../api/hooks';
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

function AssignModal({ sosId, onClose }) {
  const { data: volunteers } = useVolunteersList();
  const createTask = useCreateTask();
  const [volunteerId, setVolunteerId] = useState('');
  const [instructions, setInstructions] = useState('');

  const verifiedVols = (Array.isArray(volunteers) ? volunteers : []).filter(v => v.is_verified);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!volunteerId) return;
    createTask.mutate(
      { sosId, volunteerId, instructions: instructions || undefined },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Assign Volunteer</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <label className={styles.formLabel}>Volunteer</label>
          <select value={volunteerId} onChange={e => setVolunteerId(e.target.value)} className={styles.select} required style={{ width: '100%', marginBottom: 12 }}>
            <option value="">Select a volunteer…</option>
            {verifiedVols.map(v => (
              <option key={v.id} value={v.id}>{v.full_name || v.email || v.id.slice(0, 8)}</option>
            ))}
          </select>
          <label className={styles.formLabel}>Instructions (optional)</label>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            className={styles.formTextarea}
            rows={3}
            placeholder="Describe the task…"
          />
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={createTask.isPending || !volunteerId}>
              {createTask.isPending ? 'Assigning…' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SosList() {
  const { data: list, isLoading, error } = useSosList();
  const updateStatus = useUpdateSosStatus();
  const [activeFilter, setActiveFilter] = useState('All');
  const [assigningSos, setAssigningSos] = useState(null);

  if (isLoading) return <div className={styles.loading}>Loading SOS alerts…</div>;
  if (error) return <div className={styles.error}>⚠️ Error: {error.message}</div>;

  const allRows = Array.isArray(list) ? list : [];
  const rows = activeFilter === 'All' ? allRows : allRows.filter(r => r.status === activeFilter);
  const activeCount = allRows.filter(s => s.status !== 'resolved' && s.status !== 'cancelled').length;

  return (
    <div className={styles.page}>
      {assigningSos && <AssignModal sosId={assigningSos} onClose={() => setAssigningSos(null)} />}

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
              <th>Status</th>
              <th>Assign</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
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
                  <td>
                    {(row.status === 'pending' || row.status === 'in_progress') && (
                      <button
                        className={styles.actionSmall}
                        onClick={() => setAssigningSos(row.id)}
                        title="Assign volunteer"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                        <span style={{ fontSize: 11 }}>Assign</span>
                      </button>
                    )}
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
