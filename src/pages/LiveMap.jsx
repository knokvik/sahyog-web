import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import io from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';
import { apiRequest, apiPaths } from '../lib/api';
import 'leaflet/dist/leaflet.css';
import ThreeDModal from '../components/ThreeDModal';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const shelterIcon = L.divIcon({
    className: 'heatmap-shelter-marker',
    html: '<div style="width:14px;height:14px;border-radius:999px;background:#2563eb;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.35)"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

function asNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeHeatPoint(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const lat = asNumber(raw.lat ?? raw.latitude ?? raw.location?.coordinates?.[1]);
    const lng = asNumber(raw.lng ?? raw.longitude ?? raw.location?.coordinates?.[0]);
    if (lat === null || lng === null) return null;

    return {
        lat,
        lng,
        count: Math.max(1, asNumber(raw.count) ?? 1),
        severity: Math.max(1, Math.min(10, asNumber(raw.severity) ?? 1)),
    };
}

function normalizeShelter(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const lat = asNumber(raw.lat ?? raw.latitude ?? raw.location?.coordinates?.[1]);
    const lng = asNumber(raw.lng ?? raw.longitude ?? raw.location?.coordinates?.[0]);
    if (lat === null || lng === null) return null;

    return {
        id: raw.id || `${lat}-${lng}`,
        name: raw.name || 'Shelter',
        lat,
        lng,
        capacity: raw.capacity,
        occupancy: raw.occupancy,
    };
}

function heatColor(severity) {
    if (severity >= 8) return '#ef4444';
    if (severity >= 5) return '#f97316';
    return '#22c55e';
}

// Dynamic Icon for SOS Alerts
function getSosIcon(isLive) {
    if (isLive) {
        return L.divIcon({
            className: 'sos-live-marker',
            html: `
            <div style="position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 100%; height: 100%; background-color: #ef4444; border-radius: 50%; opacity: 0.8; animation: livePulse 1s ease-out infinite;"></div>
              <div style="position: absolute; background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(239, 68, 68, 0.8);"></div>
            </div>
            <style>
              @keyframes livePulse {
                0% { transform: scale(1); opacity: 0.8; }
                100% { transform: scale(4); opacity: 0; }
              }
            </style>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });
    }

    return L.divIcon({
        className: 'sos-radar-blip-marker',
        html: `
        <div class="sos-radar-blip-container">
          <div class="sos-radar-blip"></div>
        </div>
      `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
}

// Dynamic Icon for Responders (with Live Pulse)
function getResponderIcon(role, isLive) {
    const color = role === 'coordinator' ? '#10b981' : '#3b82f6';
    if (isLive) {
        return L.divIcon({
            className: 'live-responder-marker',
            html: `
            <div style="position: relative; width: 14px; height: 14px;">
              <div style="position: absolute; width: 100%; height: 100%; background-color: ${color}; border-radius: 50%; opacity: 0.8; animation: livePulse 1.5s ease-out infinite;"></div>
              <div style="position: absolute; background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.3);"></div>
            </div>
            <style>
              @keyframes livePulse {
                0% { transform: scale(1); opacity: 0.8; }
                100% { transform: scale(3.5); opacity: 0; }
              }
            </style>
          `,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });
    } else {
        return L.divIcon({
            className: 'static-responder-marker',
            html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.3); opacity: 0.8;"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });
    }
}

function MapRecenter({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom(), { animate: true, duration: 2 });
        }
    }, [center, map]);
    return null;
}

function ZoomDisplay() {
    const [zoom, setZoom] = useState(13);
    const map = useMapEvents({
        zoomend: () => {
            setZoom(map.getZoom());
        },
    });

    const maxZoom = map.getMaxZoom() || 18;
    const zoomPercent = Math.round((zoom / maxZoom) * 100);

    return (
        <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            zIndex: 1000,
            background: 'var(--color-surface)',
            padding: '6px 12px',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--color-border)',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-primary)' }}>zoom_in</span>
            {zoomPercent >= 100 ? '100% ZOOM' : `${zoomPercent}% ZOOM`}
        </div>
    );
}

function LiveHeatLayer({ points }) {
    const map = useMap();

    useEffect(() => {
        if (!map || typeof L.heatLayer !== 'function') return undefined;

        const weighted = points.map((point) => {
            const severityWeight = point.severity / 10;
            const countBoost = Math.min(point.count, 10) / 20;
            const intensity = Math.min(1, severityWeight * 0.7 + countBoost);
            return [point.lat, point.lng, intensity];
        });

        if (!weighted.length) return undefined;

        const layer = L.heatLayer(weighted, {
            radius: 34,
            blur: 30,
            maxZoom: 17,
            minOpacity: 0.55,
            gradient: {
                0.2: 'rgba(255, 240, 100, 0.40)',
                0.4: 'rgba(255, 160, 50, 0.70)',
                0.6: 'rgba(255, 80, 30, 0.85)',
                0.8: 'rgba(220, 0, 30, 0.95)',
                1.0: 'rgba(180, 0, 40, 1.00)',
            },
        }).addTo(map);

        return () => {
            map.removeLayer(layer);
        };
    }, [map, points]);

    return null;
}

export function LiveMap() {
    const [alerts, setAlerts] = useState({}); // { id: alertData }
    const [volunteers, setVolunteers] = useState({}); // { id: userData }
    const [heatmapPoints, setHeatmapPoints] = useState([]);
    const [shelters, setShelters] = useState([]);
    const [heatmapUpdatedAt, setHeatmapUpdatedAt] = useState(null);
    const [mapCenter, setMapCenter] = useState(null);
    const [selectedAlertFor3D, setSelectedAlertFor3D] = useState(null);
    const { getToken, isLoaded, isSignedIn } = useAuth();

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        // Initial fetch of active SOS alerts
        apiRequest(apiPaths.sos, {}, getToken)
            .then(data => {
                if (Array.isArray(data)) {
                    const activeAlerts = {};
                    data.forEach(alert => {
                        if (alert.status !== 'resolved' && alert.status !== 'cancelled') {
                            activeAlerts[alert.id] = alert;
                        }
                    });
                    setAlerts(activeAlerts);
                }
            })
            .catch(err => console.error('Failed to fetch initial SOS alerts:', err));

        // Initial fetch of responders (volunteers & coordinators)
        apiRequest(apiPaths.users, {}, getToken)
            .then(data => {
                if (Array.isArray(data)) {
                    const liveResponders = {};
                    data.forEach(user => {
                        if ((user.role === 'volunteer' || user.role === 'coordinator') && user.lat && user.lng) {
                            liveResponders[user.id] = user;
                        }
                    });
                    setVolunteers(liveResponders);
                }
            })
            .catch(err => console.error('Failed to fetch responders:', err));

        // Socket.io connection
        const socket = io(window.location.origin, {
            path: '/socket.io',
            transports: ['websocket'],
        });

        socket.on('new_sos_alert', (data) => {
            console.log('New SOS Alert received on Map:', data);
            setAlerts(prev => ({ ...prev, [data.id]: data }));

            // Auto-pan to new emergency
            if (data.lat && data.lng) {
                setMapCenter([data.lat, data.lng]);
            }
        });

        socket.on('sos_resolved', (data) => {
            setAlerts(prev => {
                const next = { ...prev };
                delete next[data.id];
                return next;
            });
        });

        const handleLocationUpdate = (data) => {
            const id = data.id || data.userId;
            if (!id) return;

            // Check if it's a responder
            if (data.role === 'volunteer' || data.role === 'coordinator') {
                setVolunteers(prev => ({
                    ...prev,
                    [id]: { ...prev[id], ...data, id, last_active: new Date().toISOString() }
                }));
            }

            // Allow any role to update an active SOS alert location if they are the reporter
            setAlerts(prev => {
                let foundAlertId = null;
                for (const key in prev) {
                    if (prev[key].reporter_id === id || prev[key].reporterId === id || prev[key].userId === id) {
                        foundAlertId = key;
                        break;
                    }
                }
                if (foundAlertId) {
                    return {
                        ...prev,
                        [foundAlertId]: { ...prev[foundAlertId], lat: data.lat, lng: data.lng, last_active: new Date().toISOString() }
                    };
                }
                return prev;
            });
        };

        socket.on('volunteer_location_update', handleLocationUpdate);
        socket.on('location.update', handleLocationUpdate);
        socket.on('heatmap:update', (payload = {}) => {
            const points = Array.isArray(payload.points)
                ? payload.points.map(normalizeHeatPoint).filter(Boolean)
                : [];
            const sheltersData = Array.isArray(payload.shelters)
                ? payload.shelters.map(normalizeShelter).filter(Boolean)
                : [];

            setHeatmapPoints(points);
            setShelters(sheltersData);
            setHeatmapUpdatedAt(payload.updatedAt || new Date().toISOString());

            if (!mapCenter && points.length > 0) {
                setMapCenter([points[0].lat, points[0].lng]);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [isLoaded, isSignedIn, getToken]);

    const alertList = Object.values(alerts);
    const volList = Object.values(volunteers);

    return (
        <div style={{
            height: 'calc(100vh - 64px)',
            width: 'calc(100% + 48px)',
            margin: '-24px -24px -24px -24px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <MapContainer
                center={[18.5204, 73.8567]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapRecenter center={mapCenter} />
                <ZoomDisplay />

                {/* Smooth Heatmap Layer */}
                <LiveHeatLayer points={heatmapPoints} />

                {/* Critical Hotspot Pins (Severity >= 8) */}
                {heatmapPoints
                    .filter((point) => point.severity >= 8)
                    .map((point, index) => {
                    const color = heatColor(point.severity);
                    return (
                        <CircleMarker
                            key={`hm-critical-${index}-${point.lat}-${point.lng}`}
                            center={[point.lat, point.lng]}
                            radius={7}
                            pathOptions={{
                                color: '#ffffff',
                                weight: 2,
                                fillColor: color,
                                fillOpacity: 0.95,
                            }}
                        >
                            <Popup>
                                <div style={{ minWidth: '160px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Critical Heat Zone</h4>
                                    <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Count:</strong> {point.count}</p>
                                    <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Severity:</strong> {point.severity}</p>
                                    <p style={{ margin: '4px 0', fontSize: '12px' }}><strong>Band:</strong> Red (8-10)</p>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}

                {/* Shelter Pins */}
                {shelters.map((shelter) => (
                    <Marker key={shelter.id} position={[shelter.lat, shelter.lng]} icon={shelterIcon}>
                        <Popup>
                            <div style={{ minWidth: '150px' }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#2563eb' }}>{shelter.name}</h4>
                                {shelter.occupancy != null && shelter.capacity != null && (
                                    <p style={{ margin: '4px 0', fontSize: '12px' }}>
                                        <strong>Occupancy:</strong> {shelter.occupancy}/{shelter.capacity}
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* SOS Alerts */}
                {alertList.map(alert => {
                    const lat = alert.lat || (alert.location?.coordinates ? alert.location.coordinates[1] : null);
                    const lng = alert.lng || (alert.location?.coordinates ? alert.location.coordinates[0] : null);

                    if (!lat || !lng) return null;

                    const lastActive = alert.last_active ? new Date(alert.last_active).getTime() : 0;
                    const isLive = (Date.now() - lastActive) < 60000;

                    return (
                        <Marker key={alert.id} position={[lat, lng]} icon={getSosIcon(isLive)}>
                            <Popup>
                                <div style={{ minWidth: '180px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>emergency</span>
                                        SOS ALERT
                                    </h4>
                                    <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>Type:</strong> {alert.type || 'Emergency'}</p>
                                    <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>Reporter:</strong> {alert.reporter_name || 'Anonymous'}</p>
                                    <p style={{ margin: '4px 0', fontSize: '13px' }}><strong>Phone:</strong> {alert.reporter_phone || '—'}</p>
                                    <p style={{ margin: '4px 0', fontSize: '11px', color: '#64748b' }}>{new Date(alert.created_at).toLocaleString()}</p>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                        <button
                                            style={{ flex: 1, padding: '6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                            onClick={() => window.location.href = `/sos`}
                                        >
                                            Manage
                                        </button>
                                        <button
                                            style={{ flex: 1, padding: '6px', background: '#1e1e1e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                            onClick={() => setSelectedAlertFor3D({ ...alert, lat, lng })}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>3d_rotation</span>
                                            3D View
                                        </button>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Live Responders */}
                {volList.map(vol => {
                    const lastActive = vol.last_active ? new Date(vol.last_active).getTime() : 0;
                    const isLive = (Date.now() - lastActive) < 60000; // pulse if updated in the last 60 seconds
                    return (
                        <Marker key={vol.id} position={[vol.lat, vol.lng]} icon={getResponderIcon(vol.role, isLive)}>
                            <Popup>
                                <div style={{ minWidth: '120px' }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: vol.role === 'coordinator' ? '#10b981' : '#3b82f6' }}>{vol.full_name || vol.name || 'Responder'}</h4>
                                    <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>{vol.role.charAt(0).toUpperCase() + vol.role.slice(1)}</p>
                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Last Active: {new Date(vol.last_active || Date.now()).toLocaleTimeString()}</span>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Summary Overlay */}
            <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000, background: 'rgba(255,255,255,0.9)', padding: '12px', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)', backdropFilter: 'blur(8px)', minWidth: '180px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ef4444' }}>radar</span>
                    Emergency Center
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>SOS Status:</span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: alertList.length > 0 ? '#ef4444' : '#34b27b' }}>
                            {alertList.length} Active
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Responders:</span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#3b82f6' }}>
                            {volList.length} Online
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Heat Zones:</span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f97316' }}>
                            {heatmapPoints.length}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Shelters:</span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb' }}>
                            {shelters.length}
                        </span>
                    </div>
                    {heatmapUpdatedAt && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                            Heatmap updated: {new Date(heatmapUpdatedAt).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            {/* 3D Viewer Modal */}
            <ThreeDModal
                isOpen={!!selectedAlertFor3D}
                onClose={() => setSelectedAlertFor3D(null)}
                lat={selectedAlertFor3D?.lat}
                lng={selectedAlertFor3D?.lng}
                alertInfo={selectedAlertFor3D}
                extraMarkers={[...alertList, ...volList]}
            />
        </div>
    );
}
