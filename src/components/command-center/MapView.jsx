import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './CommandCenter.module.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const volunteerIcon = L.divIcon({
  className: 'cc-volunteer-marker',
  html: '<div style="width:12px;height:12px;border-radius:999px;background:#2563eb;border:2px solid #fff"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function urgencyColor(need = {}) {
  const urgency = Number(need.urgency ?? need.priority_score ?? 0);
  if (urgency >= 70) return '#ef4444';
  if (urgency >= 40) return '#f59e0b';
  return '#22c55e';
}

function parsePoint(item) {
  const lat = Number(item.lat ?? item.latitude ?? item.location?.coordinates?.[1]);
  const lng = Number(item.lng ?? item.longitude ?? item.location?.coordinates?.[0]);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  return null;
}

export function MapView({ zoneGeoJson, volunteers = [], needs = [] }) {
  const features = zoneGeoJson?.features ?? zoneGeoJson ?? [];

  return (
    <div className={styles.mapCard}>
      <div className={styles.mapLegend}>
        <span><i className={styles.legendDot} style={{ background: '#2563eb' }} /> Volunteers</span>
        <span><i className={styles.legendDot} style={{ background: '#22c55e' }} /> Low urgency need</span>
        <span><i className={styles.legendDot} style={{ background: '#f59e0b' }} /> Medium urgency need</span>
        <span><i className={styles.legendDot} style={{ background: '#ef4444' }} /> High urgency need</span>
      </div>

      <MapContainer center={[18.5204, 73.8567]} zoom={11} style={{ height: '66vh', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {Array.isArray(features) && features.length > 0 && (
          <GeoJSON
            data={{ type: 'FeatureCollection', features }}
            style={() => ({ color: '#0ea5e9', weight: 2, fillOpacity: 0.05 })}
          />
        )}

        {volunteers.map((vol) => {
          const point = parsePoint(vol);
          if (!point) return null;
          return (
            <Marker key={vol.id || `${point[0]}-${point[1]}`} position={point} icon={volunteerIcon}>
              <Popup>
                <strong>{vol.full_name || vol.name || 'Volunteer'}</strong>
                <div>Zone: {vol.zone_name || '—'}</div>
                <div>Status: {vol.status || 'active'}</div>
              </Popup>
            </Marker>
          );
        })}

        {needs.map((need) => {
          const point = parsePoint(need);
          if (!point) return null;
          const color = urgencyColor(need);
          const needIcon = L.divIcon({
            className: 'cc-need-marker',
            html: `<div style="width:14px;height:14px;border-radius:999px;background:${color};border:2px solid #fff"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
          return (
            <Marker key={need.id || `${point[0]}-${point[1]}`} position={point} icon={needIcon}>
              <Popup>
                <strong>{need.title || need.type || 'Need'}</strong>
                <div>Urgency: {need.urgency ?? need.priority_score ?? '—'}</div>
                <div>Status: {need.status || 'active'}</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
