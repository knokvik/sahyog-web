import HeatmapMap from '../../components/HeatmapMap';
import styles from '../../components/command-center/CommandCenter.module.css';

export function DeploymentMapPage() {
  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Live Heatmap (Admin/Coordinator)</h1>
          <p className={styles.subtitle}>
            Detailed live density with severity color bands and shelter visibility.
          </p>
        </div>
      </div>

      <HeatmapMap viewMode="admin" height="66vh" />
    </div>
  );
}
