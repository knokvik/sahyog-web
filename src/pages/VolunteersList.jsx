import { useState } from 'react';
import { useVolunteersList } from '../api/hooks';
import styles from './DataList.module.css';

const filters = ['All', 'Verified', 'Unverified', 'Available'];

function renderStars(rating) {
  if (rating == null) return '—';
  const full = Math.round(rating);
  return <span className={styles.ratingStars}>{'★'.repeat(full)}{'☆'.repeat(Math.max(0, 5 - full))}</span>;
}

export function VolunteersList() {
  const { data: list, isLoading, error } = useVolunteersList();
  const [activeFilter, setActiveFilter] = useState('All');

  if (isLoading) return <div className={styles.loading}>Loading volunteers…</div>;
  if (error) return <div className={styles.error}>⚠️ Error: {error.message}</div>;

  const allRows = Array.isArray(list) ? list : [];

  let rows = allRows;
  if (activeFilter === 'Verified') rows = allRows.filter(r => r.is_verified);
  else if (activeFilter === 'Unverified') rows = allRows.filter(r => !r.is_verified);
  else if (activeFilter === 'Available') rows = allRows.filter(r => r.is_available);

  const availableCount = allRows.filter(v => v.is_available).length;
  const verifiedCount = allRows.filter(v => v.is_verified).length;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.title}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#34b27b' }}>group</span>
            Volunteers
          </h1>
          <p className={styles.subtitle}>{verifiedCount} verified · {availableCount} available · {allRows.length} total</p>
        </div>
      </div>

      <div className={styles.filterRow}>
        {filters.map(f => (
          <button
            key={f}
            className={`${styles.filterPill} ${activeFilter === f ? styles.filterPillActive : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Verified</th>
              <th>Available</th>
              <th>Rating</th>
              <th>Tasks</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className={styles.emptyState}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.3 }}>group_off</span>
                    <p className={styles.emptyText}>No volunteers found</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id}>
                  <td>
                    <span className={`${styles.badge} ${row.is_verified ? styles.badge_success : styles.badge_pending}`}>
                      {row.is_verified ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    {row.is_verified ? (
                      <span className={styles.boolYes}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                        Verified
                      </span>
                    ) : (
                      <span className={styles.boolNo}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>pending</span>
                        Unverified
                      </span>
                    )}
                  </td>
                  <td>
                    {row.is_available ? (
                      <span className={styles.boolYes}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>radio_button_checked</span>
                        Online
                      </span>
                    ) : (
                      <span className={styles.boolNo}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>radio_button_unchecked</span>
                        Offline
                      </span>
                    )}
                  </td>
                  <td>{renderStars(row.rating)}</td>
                  <td style={{ fontWeight: 700 }}>{row.total_tasks ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
