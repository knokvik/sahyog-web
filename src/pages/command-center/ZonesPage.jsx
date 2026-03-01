import { useNavigate } from 'react-router-dom';
import { useZonesSummary } from '../../api/useCommandCenter';
import { useCommandCenterRealtime } from '../../hooks/useCommandCenterRealtime';
import { ZoneCard } from '../../components/command-center/ZoneCard';
import styles from '../../components/command-center/CommandCenter.module.css';

export function ZonesPage() {
  const navigate = useNavigate();
  useCommandCenterRealtime(true);
  const { data, isLoading, error } = useZonesSummary();
  const zones = Array.isArray(data) ? data : [];

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Zone Control Board</h1>
          <p className={styles.subtitle}>Operational overview by zone with severity and workload indicators.</p>
        </div>
      </div>

      {isLoading && (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${styles.card} ${styles.skeleton}`} style={{ height: 220 }} />
          ))}
        </div>
      )}

      {error && (
        <div className={styles.card} style={{ color: 'var(--color-danger)' }}>
          Failed to load zone summary: {error.message}
        </div>
      )}

      {!isLoading && !error && (
        <div className={styles.grid}>
          {zones.map((zone) => (
            <ZoneCard
              key={zone.zone_id || zone.id || zone.zone_name}
              zone={zone}
              onClick={() => navigate(`/zones/${zone.zone_id || zone.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
