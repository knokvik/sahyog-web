import { useActiveNeeds, useVolunteerLocations, useZonesGeoJson } from '../../api/useCommandCenter';
import { useCommandCenterRealtime } from '../../hooks/useCommandCenterRealtime';
import { MapView } from '../../components/command-center/MapView';
import styles from '../../components/command-center/CommandCenter.module.css';

export function DeploymentMapPage() {
  useCommandCenterRealtime(true);

  const { data: zonesData, isLoading: zonesLoading, error: zonesError } = useZonesGeoJson();
  const { data: volunteersData, isLoading: volunteersLoading, error: volunteersError } = useVolunteerLocations();
  const { data: needsData, isLoading: needsLoading, error: needsError } = useActiveNeeds();

  const loading = zonesLoading || volunteersLoading || needsLoading;
  const error = zonesError || volunteersError || needsError;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Volunteer Deployment Map</h1>
          <p className={styles.subtitle}>Live zone boundaries, volunteer markers and active urgency-coded needs.</p>
        </div>
      </div>

      {loading && <div className={`${styles.card} ${styles.skeleton}`} style={{ height: '66vh' }} />}
      {error && <div className={styles.card} style={{ color: 'var(--color-danger)' }}>{error.message}</div>}

      {!loading && !error && (
        <MapView
          zoneGeoJson={zonesData}
          volunteers={Array.isArray(volunteersData) ? volunteersData : []}
          needs={Array.isArray(needsData) ? needsData : []}
        />
      )}
    </div>
  );
}
