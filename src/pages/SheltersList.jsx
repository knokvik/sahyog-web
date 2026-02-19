import { useSheltersList } from '../api/hooks';
import styles from './DataList.module.css';

export function SheltersList() {
  const { data: list, isLoading, error } = useSheltersList();

  if (isLoading) return <div className={styles.loading}>Loading shelters…</div>;
  if (error) return <div className={styles.error}>⚠️ Error: {error.message}</div>;

  const rows = Array.isArray(list) ? list : [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.title}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#3b82f6' }}>night_shelter</span>
            Shelters
          </h1>
          <p className={styles.subtitle}>{rows.length} registered shelter locations</p>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Capacity</th>
              <th>Facilities</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <div className={styles.emptyState}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.3 }}>home_work</span>
                    <p className={styles.emptyText}>No shelters registered</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#34b27b' }}>location_on</span>
                      {row.name}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.capacity ?? '—'}</span>
                    {row.capacity && <span style={{ color: 'var(--color-text-muted)', marginLeft: 4 }}>people</span>}
                  </td>
                  <td>
                    {Array.isArray(row.facilities) && row.facilities.length > 0 ? (
                      <div className={styles.tagList}>
                        {row.facilities.map((f, i) => (
                          <span key={i} className={styles.tag}>{f}</span>
                        ))}
                      </div>
                    ) : '—'}
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
