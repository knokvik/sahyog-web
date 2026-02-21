import { useState, useEffect, useRef, useCallback } from 'react';
import { useDisastersList } from '../api/hooks';
import {
  useReliefZones, useCreateZone, useDeleteZone,
  useDisasterRequests, useCreateRequest, useAllOrganizations,
} from '../api/useReliefCoordination';
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './DataList.module.css';

const SEVERITY_COLORS = { red: '#ef4444', yellow: '#f59e0b', blue: '#3b82f6' };
const SEVERITY_LABELS = { red: 'Emergency', yellow: 'Delayed Help', blue: 'Risk Area' };
const DEFAULT_ITEMS = [
  { resource_type: 'Water Bottles', quantity_needed: 100, is_default: true },
  { resource_type: 'Food Packets', quantity_needed: 100, is_default: true },
  { resource_type: 'Medical Supplies', quantity_needed: 100, is_default: true },
];

/* ─── Map click handler component ──────────────────────────── */
function MapClickHandler({ onMapClick, drawing }) {
  useMapEvents({
    click(e) { if (drawing) onMapClick(e.latlng); },
    mousemove() {},
  });
  return null;
}

/* ─── Zone Map Tab ─────────────────────────────────────────── */
function ZoneMapTab({ disasterId }) {
  const { data: zones = [], isLoading } = useReliefZones(disasterId);
  const createZone = useCreateZone(disasterId);
  const deleteZone = useDeleteZone(disasterId);

  const [drawing, setDrawing] = useState(false);
  const [severity, setSeverity] = useState('red');
  const [clickCenter, setClickCenter] = useState(null);
  const [radius, setRadius] = useState(500);
  const [zoneName, setZoneName] = useState('');

  const handleMapClick = useCallback((latlng) => {
    setClickCenter(latlng);
    setZoneName(`Zone ${(zones?.length || 0) + 1}`);
  }, [zones]);

  const handleCreateZone = () => {
    if (!clickCenter || !zoneName) return;
    createZone.mutate({
      name: zoneName,
      severity,
      center_lng: clickCenter.lng,
      center_lat: clickCenter.lat,
      radius_meters: radius,
    }, {
      onSuccess: () => { setClickCenter(null); setZoneName(''); },
    });
  };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className={styles.submitBtn}
          style={{ background: drawing ? '#64748b' : 'var(--color-primary)' }}
          onClick={() => { setDrawing(!drawing); setClickCenter(null); }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{drawing ? 'close' : 'draw'}</span>
          {drawing ? 'Cancel Drawing' : 'Draw Zone'}
        </button>

        {drawing && (
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
                <button key={key} onClick={() => setSeverity(key)} style={{
                  padding: '6px 14px', borderRadius: 8, border: severity === key ? `2px solid ${color}` : '1px solid var(--color-border)',
                  background: severity === key ? color + '20' : 'var(--color-surface)',
                  color: color, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}>
                  {SEVERITY_LABELS[key]}
                </button>
              ))}
            </div>
            <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              Radius: {radius}m
              <input type="range" min={100} max={5000} step={100} value={radius} onChange={e => setRadius(+e.target.value)}
                style={{ width: 120 }} />
            </label>
          </>
        )}
      </div>

      {/* Map */}
      <div style={{ height: 450, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
        <MapContainer center={[19.076, 72.877]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <MapClickHandler onMapClick={handleMapClick} drawing={drawing} />

          {/* Existing zones */}
          {zones.map(z => {
            if (z.center_lat == null || z.center_lng == null) return null;
            return (
              <Circle key={z.id} center={[z.center_lat, z.center_lng]}
                radius={z.radius_meters}
                pathOptions={{
                  color: SEVERITY_COLORS[z.severity] || '#888',
                  fillColor: SEVERITY_COLORS[z.severity] || '#888',
                  fillOpacity: 0.15, dashArray: '8 4', weight: 2,
                }}
              />
            );
          })}

          {/* Preview zone */}
          {clickCenter && (
            <Circle center={[clickCenter.lat, clickCenter.lng]} radius={radius}
              pathOptions={{
                color: SEVERITY_COLORS[severity], fillColor: SEVERITY_COLORS[severity],
                fillOpacity: 0.25, dashArray: '6 4', weight: 2,
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Create zone form */}
      {clickCenter && (
        <div style={{ marginTop: 12, padding: 16, background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="Zone Name"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontSize: 14 }} />
          <span style={{ fontSize: 12, color: SEVERITY_COLORS[severity], fontWeight: 700 }}>{SEVERITY_LABELS[severity]}</span>
          <button className={styles.submitBtn} onClick={handleCreateZone} disabled={createZone.isPending}>
            {createZone.isPending ? 'Creating...' : 'Create Zone'}
          </button>
        </div>
      )}

      {/* Zone list */}
      <div style={{ marginTop: 16 }}>
        <h4 style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
          Created Zones ({zones.length})
        </h4>
        {zones.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No zones created yet. Click "Draw Zone" and click on the map to create one.</p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {zones.map(z => (
              <div key={z.id} style={{
                padding: '8px 14px', borderRadius: 8, background: 'var(--color-surface)',
                border: `1px solid ${SEVERITY_COLORS[z.severity] || 'var(--color-border)'}`,
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: SEVERITY_COLORS[z.severity] }} />
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{z.name}</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{z.radius_meters}m</span>
                <button onClick={() => deleteZone.mutate(z.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-muted)' }}
                  title="Delete zone">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Request Form Tab ──────────────────────────────────────── */
function RequestFormTab({ disasterId }) {
  const { data: orgs = [] } = useAllOrganizations();
  const createRequest = useCreateRequest(disasterId);

  const [items, setItems] = useState(DEFAULT_ITEMS.map(i => ({ ...i })));
  const [customType, setCustomType] = useState('');
  const [customQty, setCustomQty] = useState(50);
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [notes, setNotes] = useState('');

  const updateItemQty = (idx, val) => {
    const next = [...items];
    next[idx].quantity_needed = val;
    setItems(next);
  };

  const addCustomItem = () => {
    if (!customType.trim()) return;
    setItems([...items, { resource_type: customType.trim(), quantity_needed: customQty, is_default: false }]);
    setCustomType('');
    setCustomQty(50);
  };

  const removeItem = (idx) => {
    if (items[idx].is_default) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const toggleOrg = (orgId) => {
    setSelectedOrgs(prev => prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]);
  };

  const handleSubmit = () => {
    if (selectedOrgs.length === 0) return alert('Select at least one organization');
    createRequest.mutate({
      notes,
      items: items.filter(i => i.quantity_needed > 0),
      org_ids: selectedOrgs,
    }, {
      onSuccess: () => alert('Request sent to organizations!'),
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Left: Requirements */}
      <div>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--color-text-secondary)' }}>Resource Requirements</h4>
        {items.map((item, idx) => (
          <div key={idx} style={{
            padding: '12px 16px', marginBottom: 8, borderRadius: 10,
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                {item.is_default && <span style={{ color: 'var(--color-primary)', marginRight: 4 }}>●</span>}
                {item.resource_type}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-primary)', minWidth: 40, textAlign: 'right' }}>
                  {item.quantity_needed}
                </span>
                {!item.is_default && (
                  <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                )}
              </div>
            </div>
            <input type="range" min={10} max={2000} step={10} value={item.quantity_needed}
              onChange={e => updateItemQty(idx, +e.target.value)}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
          </div>
        ))}

        {/* Add custom */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Custom resource (e.g. Blankets)"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontSize: 13 }} />
          <input type="number" value={customQty} onChange={e => setCustomQty(+e.target.value)} min={1}
            style={{ width: 70, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontSize: 13 }} />
          <button className={styles.submitBtn} onClick={addCustomItem} style={{ padding: '8px 14px', fontSize: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Add
          </button>
        </div>

        {/* Notes */}
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes for organizations..."
          rows={3} style={{
            width: '100%', marginTop: 12, padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--color-border)', background: 'var(--color-bg)',
            color: 'var(--color-text-primary)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
          }} />
      </div>

      {/* Right: Org selection */}
      <div>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Select Organizations ({selectedOrgs.length} selected)
        </h4>
        {orgs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No organizations registered yet.</p>
        ) : (
          <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {orgs.map(org => {
              const isSelected = selectedOrgs.includes(org.id);
              return (
                <div key={org.id} onClick={() => toggleOrg(org.id)} style={{
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: isSelected ? 'var(--color-primary-10)' : 'var(--color-surface)',
                  border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: isSelected ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{org.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {[org.district, org.state].filter(Boolean).join(', ') || org.email || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button className={styles.submitBtn} onClick={handleSubmit}
          disabled={createRequest.isPending || selectedOrgs.length === 0}
          style={{ marginTop: 16, width: '100%', padding: '12px 0', fontSize: 14 }}>
          {createRequest.isPending ? 'Sending...' : `Send Request to ${selectedOrgs.length} Organization(s)`}
        </button>
      </div>
    </div>
  );
}

/* ─── Progress Tab ──────────────────────────────────────────── */
function ProgressTab({ disasterId }) {
  const { data: requests = [], isLoading } = useDisasterRequests(disasterId);

  if (isLoading) return <div style={{ color: 'var(--color-text-muted)' }}>Loading...</div>;
  if (requests.length === 0) return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No requests sent yet.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {requests.map(req => (
        <div key={req.id} style={{ padding: 20, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Request by {req.created_by_name}</span>
              {req.notes && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{req.notes}</p>}
            </div>
            <span className={`${styles.badge} ${req.status === 'fulfilled' ? styles.badge_info : styles.badge_muted}`}>
              {req.status}
            </span>
          </div>

          {/* Progress Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {req.items?.map(item => {
              const pct = Math.min(100, Math.round((item.quantity_fulfilled / item.quantity_needed) * 100));
              return (
                <div key={item.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.resource_type}</span>
                    <span style={{ color: pct >= 100 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {item.quantity_fulfilled} / {item.quantity_needed} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${pct}%`,
                      background: pct >= 100 ? 'var(--color-primary)' : pct > 50 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Org assignments */}
          <div style={{ marginTop: 14 }}>
            <h5 style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Organizations</h5>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {req.assignments?.map(a => (
                <span key={a.id} style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: a.status === 'accepted' ? 'var(--badge-green-bg)' : a.status === 'rejected' ? 'var(--badge-red-bg)' : a.status === 'cancelled' ? 'var(--badge-muted-bg)' : 'var(--badge-amber-bg)',
                  color: a.status === 'accepted' ? 'var(--badge-green-fg)' : a.status === 'rejected' ? 'var(--badge-red-fg)' : a.status === 'cancelled' ? 'var(--badge-muted-fg)' : 'var(--badge-amber-fg)',
                }}>
                  {a.org_name}: {a.status}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export function ReliefCoordination() {
  const { data: disasters = [], isLoading: loadingDisasters } = useDisastersList();
  const [selectedDisaster, setSelectedDisaster] = useState('');
  const [activeTab, setActiveTab] = useState('map');

  const activeDisasters = disasters.filter(d => d.status === 'active' || d.status === 'monitoring');

  useEffect(() => {
    if (activeDisasters.length > 0 && !selectedDisaster) {
      setSelectedDisaster(activeDisasters[0].id);
    }
  }, [activeDisasters]);

  const tabs = [
    { id: 'map', label: 'Zone Map', icon: 'map' },
    { id: 'request', label: 'Send Request', icon: 'send' },
    { id: 'progress', label: 'Progress', icon: 'monitoring' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <h1 className={styles.title}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--color-primary)' }}>volunteer_activism</span>
            Relief Coordination
          </h1>
          <p className={styles.subtitle}>Manage disaster zones, send resource requests to NGOs, and track fulfillment</p>
        </div>
      </div>

      {/* Disaster selector */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Disaster:</label>
        <select value={selectedDisaster} onChange={e => setSelectedDisaster(e.target.value)} className={styles.select}
          style={{ minWidth: 250 }}>
          {loadingDisasters ? <option>Loading...</option> : activeDisasters.length === 0 ? <option>No active disasters</option> :
            activeDisasters.map(d => <option key={d.id} value={d.id}>{d.name} ({d.type})</option>)
          }
        </select>
      </div>

      {/* Tabs */}
      <div className={styles.filterRow} style={{ marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id}
            className={`${styles.filterPill} ${activeTab === t.id ? styles.filterPillActive : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {!selectedDisaster ? (
        <div className={styles.emptyState}>
          <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.3 }}>warning</span>
          <p className={styles.emptyText}>Select or create an active disaster first</p>
        </div>
      ) : (
        <>
          {activeTab === 'map' && <ZoneMapTab disasterId={selectedDisaster} />}
          {activeTab === 'request' && <RequestFormTab disasterId={selectedDisaster} />}
          {activeTab === 'progress' && <ProgressTab disasterId={selectedDisaster} />}
        </>
      )}
    </div>
  );
}
