import { useOrgZones } from '../../api/useOrg';
import s from './Org.module.css';

export function OrgZones() {
  const { data: zones = [], isLoading } = useOrgZones();

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className={s.pageTitleSm}>Assigned Zones</h1>
        <p className={s.pageDesc}>Zones where your organization has active resources or volunteers.</p>
      </div>

      {isLoading ? (
        <p className={s.loadingText}>Loading...</p>
      ) : zones.length === 0 ? (
        <div className={s.empty}>
          <span className={`material-symbols-outlined ${s.emptyIcon}`}>map</span>
          <p className={s.emptyText}>No active zones</p>
          <p className={s.emptyHint}>Zones will appear when your resources or volunteers are assigned to disaster zones.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {zones.map(z => (
            <div key={z.id} className={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-info-10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3b82f6' }}>location_on</span>
                </div>
                <div>
                  <h3 className={s.zoneCardTitle}>{z.name}</h3>
                  <span className={s.zoneCardSub}>{z.code}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <span className={s.zoneCardSub}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{z.disaster_name}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#3b82f6' }}>group</span>
                  <span className={s.zoneStat}>{z.org_volunteers || 0} volunteers</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10b981' }}>inventory_2</span>
                  <span className={s.zoneStat}>{z.org_resources || 0} resources</span>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <span style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: z.status === 'active' ? 'var(--badge-green-bg)' : 'var(--badge-muted-bg)',
                  color: z.status === 'active' ? 'var(--badge-green-fg)' : 'var(--badge-muted-fg)',
                }}>{z.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
