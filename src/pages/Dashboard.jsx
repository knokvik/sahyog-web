import { useSelector } from 'react-redux';
import { useMe, useBackendHealth, useNeedsList, useDisastersList, useUsersList, useResourcesList, useServerStats, useMyAssignments, useRespondAssignment } from '../api/hooks';
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

function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function GaugeBar({ label, value, max, unit, color, icon }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : color || '#34b27b';
  return (
    <div className={styles.gaugeRow}>
      <div className={styles.gaugeHeader}>
        <span className={styles.gaugeLabel}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
          {label}
        </span>
        <span className={styles.gaugeValue}>{value}{unit} <span className={styles.gaugeMuted}>/ {max}{unit}</span></span>
      </div>
      <div className={styles.gaugeTrack}>
        <div
          className={styles.gaugeFill}
          style={{ width: `${pct}%`, background: barColor, transition: 'width 0.6s ease' }}
        />
      </div>
      <span className={styles.gaugePct} style={{ color: barColor }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

function ServerStatsPanel() {
  const { data: stats, isLoading, error } = useServerStats();

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.sectionTitle}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>monitor_heart</span>
          Server Performance
        </h3>
        <span className={`${styles.liveDot} pulse-green`} title="Auto-refreshing every 5s" />
      </div>

      {isLoading && !stats && (
        <div className={styles.statusBody}>
          <p className={styles.gaugeLabel} style={{ textAlign: 'center', padding: 16 }}>Loading metrics…</p>
        </div>
      )}

      {error && !stats && (
        <div className={styles.statusBody}>
          <p style={{ color: '#ef4444', fontSize: 13, padding: 12 }}>Failed to load stats: {error.message}</p>
        </div>
      )}

      {stats && (
        <div className={styles.statusBody}>
          {/* CPU */}
          <GaugeBar
            label="CPU Usage"
            value={stats.cpu?.usagePercent || 0}
            max={100}
            unit="%"
            icon="speed"
            color="#3b82f6"
          />

          {/* Memory */}
          <GaugeBar
            label="Memory"
            value={stats.memory?.usedMB || 0}
            max={stats.memory?.totalMB || 1}
            unit=" MB"
            icon="memory"
            color="#8b5cf6"
          />

          {/* Node Heap */}
          <GaugeBar
            label="Node Heap"
            value={stats.process?.heapUsedMB || 0}
            max={stats.process?.heapTotalMB || 1}
            unit=" MB"
            icon="data_object"
            color="#06b6d4"
          />

          {/* Load Averages */}
          <div className={styles.gaugeRow}>
            <div className={styles.gaugeHeader}>
              <span className={styles.gaugeLabel}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>equalizer</span>
                Load Average
              </span>
            </div>
            <div className={styles.loadAvgRow}>
              <div className={styles.loadAvgItem}>
                <span className={styles.loadAvgVal}>{stats.cpu?.loadAvg?.['1m'] ?? '—'}</span>
                <span className={styles.loadAvgLabel}>1 min</span>
              </div>
              <div className={styles.loadAvgItem}>
                <span className={styles.loadAvgVal}>{stats.cpu?.loadAvg?.['5m'] ?? '—'}</span>
                <span className={styles.loadAvgLabel}>5 min</span>
              </div>
              <div className={styles.loadAvgItem}>
                <span className={styles.loadAvgVal}>{stats.cpu?.loadAvg?.['15m'] ?? '—'}</span>
                <span className={styles.loadAvgLabel}>15 min</span>
              </div>
            </div>
          </div>

          {/* System Info Row */}
          <div className={styles.statusMeta} style={{ marginTop: 8 }}>
            <div className={styles.statusItem}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
              <span>Uptime: {formatUptime(stats.system?.uptimeSeconds)}</span>
            </div>
            <div className={styles.statusItem}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{stats.db?.connected ? 'cloud_done' : 'cloud_off'}</span>
              <span>DB: {stats.db?.connected ? `Online (${stats.db.totalUsers} users)` : 'Offline'}</span>
            </div>
            <div className={styles.statusItem}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>terminal</span>
              <span>Node {stats.system?.nodeVersion}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const { data: me, isLoading, error } = useMe();
  const { data: backendReachable, isLoading: healthLoading } = useBackendHealth();
  const { data: needsList } = useNeedsList();
  const { data: disastersList } = useDisastersList();
  const { data: usersList } = useUsersList();
  const { data: resourcesList } = useResourcesList();
  const { data: assignments } = useMyAssignments();
  const respondAssignment = useRespondAssignment();
  const profile = useSelector(selectProfile);

  const needsArr = Array.isArray(needsList) ? needsList : [];
  const disArr = Array.isArray(disastersList) ? disastersList : [];
  const usersArr = Array.isArray(usersList) ? usersList : [];
  const resArr = Array.isArray(resourcesList) ? resourcesList : [];

  const activeNeeds = needsArr.filter(s => s.status !== 'resolved' && s.status !== 'cancelled').length;
  const activeDisasters = disArr.filter(d => d.status === 'active').length;
  const availableVol = usersArr.filter(v => v.role === 'volunteer').length;

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
        <StatCard icon="sos" label="Active Needs" value={activeNeeds} sub={`${needsArr.length} total`} accent="danger" />
        <StatCard icon="flood" label="Active Zones" value={activeDisasters} sub={activeDisasters > 0 ? 'Monitoring' : 'All clear'} accent="warning" />
        <StatCard icon="group" label="Volunteers" value={usersArr.length} sub={`${availableVol} volunteers`} accent="primary" />
        <StatCard icon="night_shelter" label="Resources" value={resArr.length} sub="Registered resources" accent="info" />
      </div>

      {/* Main Grid */}
      <div className={styles.contentGrid}>

        {/* Volunteer Assignments (Visible only if there are assignments or if user is a volunteer with assignments) */}
        {assignments && assignments.length > 0 && (
          <div className={styles.card} style={{ gridColumn: '1 / -1', background: 'var(--color-primary-10)', borderColor: 'var(--color-primary)' }}>
            <div className={styles.cardHeader}>
              <h3 className={styles.sectionTitle} style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>assignment_ind</span>
                My Disaster Assignments
              </h3>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '0 20px 20px' }}>
              {assignments.map(a => (
                <div key={a.id} style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid var(--color-border)', flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 15, color: 'var(--color-text-primary)' }}>{a.disaster_name}</h4>
                    <StatusBadge status={a.status} />
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                    Assigned around {formatTime(a.created_at)}
                    {a.coordinator_name && <><br />Coordinator: {a.coordinator_name} ({a.coordinator_phone || 'N/A'})</>}
                  </div>
                  {a.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => respondAssignment.mutate({ id: a.id, status: 'accepted' })}
                        disabled={respondAssignment.isPending}
                        style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#34b27b', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                      >Accept</button>
                      <button
                        onClick={() => respondAssignment.mutate({ id: a.id, status: 'rejected' })}
                        disabled={respondAssignment.isPending}
                        style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                      >Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent SOS Alerts */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.sectionTitle}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sos</span>
              Recent Needs
            </h3>
            <a href="/needs" className={styles.viewAll}>View All →</a>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Urgency</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {needsArr.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyRow}>
                      <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.3 }}>inbox</span>
                      <p>No Needs reported yet</p>
                    </td>
                  </tr>
                ) : (
                  needsArr.slice(0, 5).map(row => (
                    <tr key={row.id}>
                      <td><code className={styles.mono}>#{row.id?.slice(0, 8)}</code></td>
                      <td><StatusBadge status={row.status} /></td>
                      <td>{row.type ?? '—'}</td>
                      <td>{row.urgency ?? 'medium'}</td>
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
          {/* Server Performance (Live) */}
          <ServerStatsPanel />

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
              <a href="/needs" className={styles.quickBtn}>
                <span className="material-symbols-outlined">sos</span>
                <span>Needs / SOS</span>
              </a>
              <a href="/disasters" className={styles.quickBtn}>
                <span className="material-symbols-outlined">flood</span>
                <span>Disasters</span>
              </a>
              <a href="/users" className={styles.quickBtn}>
                <span className="material-symbols-outlined">group</span>
                <span>Users</span>
              </a>
              <a href="/resources" className={styles.quickBtn}>
                <span className="material-symbols-outlined">night_shelter</span>
                <span>Resources</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
