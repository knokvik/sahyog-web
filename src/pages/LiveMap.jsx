import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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

// Custom Icon for SOS Alerts
const sosIcon = L.divIcon({
    className: 'sos-radar-blip-marker', // Changed from generic to more specific
    html: `
    <div class="sos-radar-blip-container">
      <div class="sos-radar-blip"></div>
    </div>
  `,
    iconSize: [20, 20], // Smaller base size to center the blip properly
    iconAnchor: [10, 10],
});

// Custom Icon for Volunteers
const volunteerIcon = new L.divIcon({
    className: 'volunteer-marker-icon',
    html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

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

export function LiveMap() {
    const [alerts, setAlerts] = useState({}); // { id: alertData }
    const [volunteers, setVolunteers] = useState({}); // { id: userData }
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

        // Initial fetch of volunteers
        apiRequest(apiPaths.users, {}, getToken)
            .then(data => {
                if (Array.isArray(data)) {
                    const liveVols = {};
                    data.forEach(user => {
                        if (user.role === 'volunteer' && user.lat && user.lng) {
                            liveVols[user.id] = user;
                        }
                    });
                    setVolunteers(liveVols);
                }
            })
            .catch(err => console.error('Failed to fetch volunteers:', err));

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

        socket.on('volunteer_location_update', (data) => {
            console.log('Volunteer moved:', data);
            if (data.role === 'volunteer') {
                setVolunteers(prev => ({
                    ...prev,
                    [data.id]: data
                }));
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

                {/* SOS Alerts */}
                {alertList.map(alert => {
                    const lat = alert.lat || (alert.location?.coordinates ? alert.location.coordinates[1] : null);
                    const lng = alert.lng || (alert.location?.coordinates ? alert.location.coordinates[0] : null);

                    if (!lat || !lng) return null;

                    return (
                        <Marker key={alert.id} position={[lat, lng]} icon={sosIcon}>
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

                {/* Live Volunteers */}
                {volList.map(vol => (
                    <Marker key={vol.id} position={[vol.lat, vol.lng]} icon={volunteerIcon}>
                        <Popup>
                            <div style={{ minWidth: '120px' }}>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#3b82f6' }}>{vol.full_name}</h4>
                                <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>Volunteer (Reserving)</p>
                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>Last Active: {new Date(vol.last_active).toLocaleTimeString()}</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
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
                </div>
            </div>

            {/* 3D Viewer Modal */}
            <ThreeDModal
                isOpen={!!selectedAlertFor3D}
                onClose={() => setSelectedAlertFor3D(null)}
                lat={selectedAlertFor3D?.lat}
                lng={selectedAlertFor3D?.lng}
                alertInfo={selectedAlertFor3D}
            />
        </div>
    );
}
