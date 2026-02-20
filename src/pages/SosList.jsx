import { useState } from 'react';
import { useSosList, useVolunteersList, useCreateTask, useSosTasks } from '../api/hooks';
import styles from './DataList.module.css';

const filters = ['All', 'pending', 'in_progress', 'resolved', 'cancelled'];

function StatusBadge({ status }) {
  return <span className={`${styles.badge} ${styles[`badge_${status}`] || styles.badge_muted}`}>{status?.replace('_', ' ')}</span>;
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function VolunteerActionsModal({ sosId, onClose }) {
  const { data: volunteers } = useVolunteersList();
  const { data: assignedTasks, isLoading: tasksLoading } = useSosTasks(sosId);
  const createTask = useCreateTask();
  
  const [selectedVolunteerId, setSelectedVolunteerId] = useState(null);
  const [instructions, setInstructions] = useState('');

  const allVols = Array.isArray(volunteers) ? volunteers : [];
  const validTasks = Array.isArray(assignedTasks) ? assignedTasks : [];

  // Filter out volunteers who are already assigned to this SOS
  const assignedVolIds = new Set(validTasks.map(t => t.volunteer_id));
  const freeVols = allVols.filter(v => v.is_verified && !assignedVolIds.has(v.id));

  const handleAssignClick = (volId) => {
    if (selectedVolunteerId === volId) {
      setSelectedVolunteerId(null);
      setInstructions('');
    } else {
      setSelectedVolunteerId(volId);
      setInstructions('');
    }
  };

  const handleSubmitAssign = (e, volunteerId) => {
    e.preventDefault();
    createTask.mutate(
      { sosId, volunteerId, instructions: instructions || undefined },
      { onSuccess: () => {
          setSelectedVolunteerId(null);
          setInstructions('');
        } 
      }
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Actions & Assignments</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        
        <div className={styles.modalSplitBody}>
          {/* Assigned Volunteers Section */}
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>Assigned Volunteers</h4>
            {tasksLoading ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Loading...</div>
            ) : validTasks.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No volunteers assigned yet.</div>
            ) : (
              <div className={styles.volunteerList}>
                {validTasks.map(task => (
                  <div key={task.id} className={styles.volunteerItem}>
                    <div className={styles.volunteerHeader}>
                      <div className={styles.volunteerInfo}>
                        <span className={styles.volunteerName}>{task.volunteer_name || 'Unknown'}</span>
                        <span className={styles.volunteerTaskDesc}>
                          {task.instructions ? `Task: ${task.instructions}` : 'No specific description provided'}
                        </span>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Free / Unassigned Volunteers Section */}
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>Free Volunteers</h4>
            {freeVols.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No free verified volunteers available.</div>
            ) : (
              <div className={styles.volunteerList}>
                {freeVols.map(v => {
                  const isSelected = selectedVolunteerId === v.id;
                  return (
                    <div key={v.id} className={styles.volunteerItem}>
                      <div className={styles.volunteerHeader}>
                        <div className={styles.volunteerInfo}>
                          <span className={styles.volunteerName}>{v.full_name || v.email || v.id.slice(0, 8)}</span>
                          <span className={styles.volunteerTaskDesc}>Skills: {v.skills?.join(', ') || 'None listed'}</span>
                        </div>
                        <button 
                          type="button" 
                          className={styles.actionSmall}
                          onClick={() => handleAssignClick(v.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                            {isSelected ? 'close' : 'person_add'}
                          </span>
                          <span style={{ fontSize: 11 }}>{isSelected ? 'Cancel' : 'Assign'}</span>
                        </button>
                      </div>

                      {/* Animated Slide-Down Assignment Form */}
                      <form 
                        className={`${styles.assignForm} ${isSelected ? styles.open : ''}`} 
                        onSubmit={(e) => handleSubmitAssign(e, v.id)}
                      >
                        <label className={styles.formLabel}>Task Description</label>
                        <textarea
                          value={isSelected ? instructions : ''}
                          onChange={e => setInstructions(e.target.value)}
                          className={styles.formTextarea}
                          rows={2}
                          placeholder="Describe the task to be completed..."
                          required
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                          <button 
                            type="submit" 
                            className={styles.submitBtn} 
                            disabled={createTask.isPending}
                            style={{ padding: '6px 14px', fontSize: 12 }}
                          >
                            {createTask.isPending ? 'Assigning…' : 'Confirm Assignment'}
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SosList() {
  const { data: list, isLoading, error } = useSosList();
  const [activeFilter, setActiveFilter] = useState('All');
  const [assigningSos, setAssigningSos] = useState(null);

  if (isLoading) return <div className={styles.loading}>Loading SOS alerts…</div>;
  if (error) return <div className={styles.error}>⚠️ Error: {error.message}</div>;

  const allRows = Array.isArray(list) ? list : [];
  const rows = activeFilter === 'All' ? allRows : allRows.filter(r => r.status === activeFilter);
  const activeCount = allRows.filter(s => s.status !== 'resolved' && s.status !== 'cancelled').length;

  return (
    <div className={styles.page}>
      {assigningSos && <VolunteerActionsModal sosId={assigningSos} onClose={() => setAssigningSos(null)} />}

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
                    <button
                      className={styles.actionSmall}
                      onClick={() => setAssigningSos(row.id)}
                      title="Manage Actions & Assignments"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>manage_accounts</span>
                      <span style={{ fontSize: 11 }}>Actions</span>
                    </button>
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
