import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';
import { apiRequest, apiPaths } from '../lib/api';
import ThreeDModal from '../components/ThreeDModal';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const sosIcon = L.divIcon({
    className: 'sos-radar-blip-marker',
    html: `
    <div class="sos-radar-blip-container">
      <div class="sos-radar-blip"></div>
    </div>
  `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

function MapController({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || 15, { animate: true, duration: 2 });
        }
    }, [center, zoom, map]);
    return null;
}

const SOSDashboard = () => {
    const [alerts, setAlerts] = useState({});
    const [volunteers, setVolunteers] = useState({});
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [selectedAlertFor3D, setSelectedAlertFor3D] = useState(null);
    const [mapCenter, setMapCenter] = useState([18.5204, 73.8567]);
    const { getToken, isLoaded, isSignedIn } = useAuth();

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        // Fetch initial SOS alerts
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

        // Fetch responders (volunteers & coordinators)
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

        // Socket logic
        const socket = io(window.location.origin, {
            path: '/socket.io',
            transports: ['websocket'],
        });

        socket.on('new_sos_alert', (data) => {
            setAlerts(prev => ({ ...prev, [data.id]: data }));
        });

        socket.on('sos_resolved', (data) => {
            setAlerts(prev => {
                const next = { ...prev };
                delete next[data.id];
                return next;
            });
        });

        socket.on('volunteer_location_update', (data) => {
            if (data.role === 'volunteer' || data.role === 'coordinator') {
                setVolunteers(prev => ({ ...prev, [data.id]: data }));
            }
        });

        return () => socket.disconnect();
    }, [isLoaded, isSignedIn, getToken]);

    const alertList = Object.values(alerts).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const volList = Object.values(volunteers);

    const handleSelectAlert = (alert) => {
        setSelectedAlert(alert);
        if (alert.lat && alert.lng) {
            setMapCenter([alert.lat, alert.lng]);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full bg-zinc-950 overflow-hidden text-white">
            {/* Left Sidebar: SOS List */}
            <div className="w-80 md:w-96 flex flex-col border-r border-white/10 bg-zinc-900 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500">notifications_active</span>
                        Active SOS Calls
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">{alertList.length} Emergencies identified</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {alertList.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-white/5 rounded-xl">
                            <span className="material-symbols-outlined text-4xl mb-2">radar</span>
                            <p className="text-sm">Scanning for alerts...</p>
                        </div>
                    ) : (
                        alertList.map(alert => (
                            <div
                                key={alert.id}
                                onClick={() => handleSelectAlert(alert)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedAlert?.id === alert.id
                                    ? 'bg-red-500/10 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-[10px] font-bold uppercase tracking-wider">
                                        {alert.type || 'Emergency'}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 uppercase font-mono">
                                        {new Date(alert.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                                <h4 className="font-bold text-base">{alert.reporter_name || 'Anonymous User'}</h4>
                                <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                                    <span className="material-symbols-outlined text-sm">location_on</span>
                                    {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                                </div>

                                {selectedAlert?.id === alert.id && (
                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedAlertFor3D(alert);
                                            }}
                                            className="flex-1 py-1.5 px-3 bg-white text-black text-xs font-bold rounded-lg flex items-center justify-center gap-1 hover:bg-zinc-200 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">3d_rotation</span>
                                            3D View
                                        </button>
                                        <button className="flex-1 py-1.5 px-3 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-500 transition-colors">
                                            Manage
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Side: Map View */}
            <div className="flex-1 relative">
                <MapContainer
                    center={[18.5204, 73.8567]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController center={mapCenter} />

                    {alertList.map(alert => (
                        <Marker
                            key={alert.id}
                            position={[alert.lat, alert.lng]}
                            icon={sosIcon}
                            eventHandlers={{
                                click: () => handleSelectAlert(alert)
                            }}
                        >
                            <Popup className="custom-popup">
                                <div className="p-1 min-w-[150px]">
                                    <h4 className="font-bold text-red-500 m-0 text-sm">EMERGENCY SOS</h4>
                                    <p className="m-0 text-xs text-zinc-600 mt-1">{alert.reporter_name || 'Anonymous'}</p>
                                    <button
                                        onClick={() => setSelectedAlertFor3D(alert)}
                                        className="mt-3 w-full py-2 bg-black text-white text-xs font-bold rounded-md flex items-center justify-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">3d_rotation</span>
                                        Open 3D Viewer
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Legend / Overlay */}
                <div className="absolute top-6 right-6 z-[1000] p-4 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Live Feed Status</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
                        </div>
                        <span className="text-sm font-medium">System Online</span>
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
                extraMarkers={[...alertList, ...volList]}
            />
        </div>
    );
};

export default SOSDashboard;
