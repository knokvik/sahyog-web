import { useSelector } from 'react-redux';
import { useMe, useBackendHealth, useSosList, useDisastersList, useVolunteersList, useSheltersList } from '../api/hooks';
import { selectProfile } from '../store/slices/authSlice';
import styles from './Dashboard.module.css';

function StatCard({ icon, label, value, sub, accent = 'primary' }) {
  return (
    <div className={`${styles.statCard} ${styles[`stat_${accent}`]}`}>
      <div className={styles.statIconWrap}>
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div className={styles.statBody}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
        {sub && <span className={styles.statSub}>{sub}</span>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colorMap = {
    pending: 'amber',
    in_progress: 'blue',
    resolved: 'green',
    cancelled: 'muted',
    active: 'red',
    contained: 'amber',
    critical: 'red',
  };
  const variant = colorMap[status] || 'muted';
  return <span className={`${styles.badge} ${styles[`badge_${variant}`]}`}>{status?.replace('_', ' ')}</span>;
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function Dashboard() {
  const { data: me, isLoading, error } = useMe();
  const { data: backendReachable, isLoading: healthLoading } = useBackendHealth();
  const { data: sosList } = useSosList();
  const { data: disastersList } = useDisastersList();
  const { data: volunteersList } = useVolunteersList();
  const { data: sheltersList } = useSheltersList();
  const profile = useSelector(selectProfile);

  const sosArr = Array.isArray(sosList) ? sosList : [];
  const disArr = Array.isArray(disastersList) ? disastersList : [];
  const volArr = Array.isArray(volunteersList) ? volunteersList : [];
  const shelArr = Array.isArray(sheltersList) ? sheltersList : [];

  const activeSos = sosArr.filter(s => s.status !== 'resolved' && s.status !== 'cancelled').length;
  const activeDisasters = disArr.filter(d => d.status === 'active').length;
  const availableVol = volArr.filter(v => v.is_available).length;

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4].map(i => <div key={i} className={styles.skeletonCard} />)}
        </div>
        <div className={styles.skeletonTable} />
      </div>
    );
  }

  if (error) {
    const is401 = error.status === 401;
    const is500 = error.status === 500;
    const serverDetail = error.detail || error.details?.detail;
    return (
      <div className={styles.page}>
        <div className={styles.errorCard}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#ef4444' }}>error</span>
          <h2 className={styles.errorTitle}>Failed to load dashboard</h2>
          <p className={styles.errorMsg}>{error.message}</p>
          {!healthLoading && (
            <p className={styles.errorConnect}>
              Backend: <strong>{backendReachable ? '✅ Reachable' : '❌ Unreachable'}</strong>
              {!backendReachable && <span className={styles.errorHint}>Run <code>npm run dev</code> in the project root and refresh.</span>}
            </p>
          )}
          {serverDetail && <p className={styles.errorDetail}>Server: {serverDetail}</p>}
          {is401 && <p className={styles.errorHint}>No valid token. Complete sign-in and refresh.</p>}
          {is500 && <p className={styles.errorHint}>Check backend terminal for the full error stack.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Stats */}
      <div className={styles.statsGrid}>
        <StatCard icon="sos" label="Active SOS" value={activeSos} sub={`${sosArr.length} total`} accent="danger" />
        <StatCard icon="flood" label="Active Zones" value={activeDisasters} sub={activeDisasters > 0 ? 'Monitoring' : 'All clear'} accent="warning" />
        <StatCard icon="group" label="Volunteers" value={volArr.length} sub={`${availableVol} available`} accent="primary" />
        <StatCard icon="night_shelter" label="Shelters" value={shelArr.length} sub="Registered locations" accent="info" />
      </div>

      {/* Main Grid */}
      <div className={styles.contentGrid}>
        {/* Recent SOS Alerts */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.sectionTitle}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sos</span>
              Recent SOS Alerts
            </h3>
            <a href="/sos" className={styles.viewAll}>View All →</a>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {sosArr.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyRow}>
                      <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.3 }}>inbox</span>
                      <p>No SOS reports yet</p>
                    </td>
                  </tr>
                ) : (
                  sosArr.slice(0, 5).map(row => (
                    <tr key={row.id}>
                      <td><code className={styles.mono}>#{row.id?.slice(0, 8)}</code></td>
                      <td><StatusBadge status={row.status} /></td>
                      <td>{row.type ?? '—'}</td>
                      <td>
                        <div className={styles.priorityBar}>
                          <div className={styles.priorityFill} style={{ width: `${Math.min((row.priority_score || 0) * 10, 100)}%` }} />
                        </div>
                      </td>
                      <td className={styles.timeCell}>{formatTime(row.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel */}
        <div className={styles.sidePanel}>
          {/* System Status */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.sectionTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>monitor_heart</span>
                System Status
              </h3>
            </div>
            <div className={styles.statusBody}>
              <div className={styles.statusRow}>
                <span className={`${styles.statusDot} pulse-green`} />
                <span>All systems operational</span>
              </div>
              <div className={styles.statusMeta}>
                <div className={styles.statusItem}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>cloud_done</span>
                  <span>Backend: Connected</span>
                </div>
                <div className={styles.statusItem}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>database</span>
                  <span>Database: Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.sectionTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
                Your Profile
              </h3>
            </div>
            <dl className={styles.profileDl}>
              <dt>Email</dt>
              <dd>{profile?.email ?? me?.email ?? '—'}</dd>
              <dt>Role</dt>
              <dd><code className={styles.roleCode}>{profile?.role ?? me?.role ?? '—'}</code></dd>
              <dt>User ID</dt>
              <dd><code className={styles.idMono}>{(profile?.id ?? me?.id ?? '—').slice(0, 20)}…</code></dd>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.sectionTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
                Quick Actions
              </h3>
            </div>
            <div className={styles.quickActions}>
              <a href="/sos" className={styles.quickBtn}>
                <span className="material-symbols-outlined">sos</span>
                <span>SOS Alerts</span>
              </a>
              <a href="/disasters" className={styles.quickBtn}>
                <span className="material-symbols-outlined">flood</span>
                <span>Disasters</span>
              </a>
              <a href="/volunteers" className={styles.quickBtn}>
                <span className="material-symbols-outlined">group</span>
                <span>Volunteers</span>
              </a>
              <a href="/shelters" className={styles.quickBtn}>
                <span className="material-symbols-outlined">night_shelter</span>
                <span>Shelters</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
