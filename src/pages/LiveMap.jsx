import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLiveLocations } from '../hooks/useLiveLocations';
import HeatmapMap from '../components/HeatmapMap';

// Role → marker config
const ROLE_STYLES = {
  volunteer: { color: '#2563eb', label: 'Volunteer', icon: '🔵' },
  coordinator: { color: '#10b981', label: 'Coordinator', icon: '🟢' },
  citizen: { color: '#f59e0b', label: 'Citizen', icon: '🟠' },
  unknown: { color: '#94a3b8', label: 'User', icon: '⚪' },
};

function roleDivIcon(role) {
  const s = ROLE_STYLES[role] || ROLE_STYLES.unknown;
  return L.divIcon({
    className: 'live-loc-marker',
    html: `<div style="
      width:14px;height:14px;border-radius:999px;
      background:${s.color};border:2.5px solid #fff;
      box-shadow:0 0 6px ${s.color}88;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function LiveMap() {
  const { all, volunteers, coordinators, citizens, count } = useLiveLocations();

  const markers = useMemo(() => all.map((loc, i) => {
    const style = ROLE_STYLES[loc.role] || ROLE_STYLES.unknown;
    const icon = roleDivIcon(loc.role);
    return (
      <Marker key={loc.userId || i} position={[loc.lat, loc.lng]} icon={icon}>
        <Popup>
          <div style={{ minWidth: 140 }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: style.color, display: 'inline-block' }} />
              {style.label}
            </strong>
            {loc.name && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{loc.name}</div>}
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
              {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
            </div>
          </div>
        </Popup>
      </Marker>
    );
  }), [all]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Live Map</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)' }}>
            Real-time user positions &amp; heatmap view
          </p>
        </div>

        {/* Live tracking stats */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Volunteers', count: volunteers.length, color: '#2563eb' },
            { label: 'Coordinators', count: coordinators.length, color: '#10b981' },
            { label: 'Citizens', count: citizens.length, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 999,
              background: `${s.color}14`, border: `1px solid ${s.color}30`,
              fontSize: 13, fontWeight: 600, color: s.color,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
              {s.count} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Map with live markers */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <MapContainer center={[18.5204, 73.8567]} zoom={12} style={{ height: 'calc(100vh - 190px)', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers}
        </MapContainer>

        {/* Live pulse indicator */}
        {count > 0 && (
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            fontSize: 12, fontWeight: 700, color: '#0f172a',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#10b981',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            {count} LIVE
          </div>
        )}
      </div>

      {/* Heatmap section */}
      <div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Citizen Heatmap</h2>
        <HeatmapMap viewMode="public" height="400px" />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
