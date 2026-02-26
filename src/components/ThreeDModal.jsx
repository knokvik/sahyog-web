import React, { useEffect, useRef } from 'react';
import { Viewer, Cesium3DTileset, CameraFlyTo, Entity, PointGraphics } from 'resium';
import * as Cesium from 'cesium';

const ThreeDModal = ({ isOpen, onClose, lat, lng, alertInfo, extraMarkers = [] }) => {
    const viewerRef = useRef(null);

    useEffect(() => {
        if (import.meta.env.VITE_CESIUM_ACCESS_TOKEN) {
            Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ACCESS_TOKEN;
        }
    }, []);

    if (!isOpen) return null;

    const destination = Cesium.Cartesian3.fromDegrees(lng, lat, 150); // Fly to 150m height

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10">
            <div className="relative w-full h-full max-w-6xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500">3d_rotation</span>
                            3D Emergency View
                        </h3>
                        <p className="text-sm text-zinc-400">
                            {alertInfo?.reporter_name || 'Anonymous'} • {alertInfo?.type || 'Emergency'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Cesium Viewer */}
                <div className="flex-1 relative">
                    <Viewer
                        full
                        ref={viewerRef}
                        animation={false}
                        timeline={false}
                        baseLayerPicker={false}
                        geocoder={false}
                        homeButton={false}
                        infoBox={false}
                        selectionIndicator={false}
                        navigationHelpButton={false}
                        sceneModePicker={false}
                    >
                        {/* Google Photorealistic 3D Tileset */}
                        <Cesium3DTileset url={Cesium.IonResource.fromAssetId(2275207)} />

                        <CameraFlyTo
                            destination={destination}
                            duration={5}
                            orientation={{
                                heading: Cesium.Math.toRadians(0),
                                pitch: Cesium.Math.toRadians(-45),
                                roll: 0
                            }}
                        />

                        {/* Primary SOS Marker */}
                        <Entity
                            position={Cesium.Cartesian3.fromDegrees(lng, lat, 2)}
                            name="EMERGENCY SOS"
                        >
                            <PointGraphics pixelSize={25} color={Cesium.Color.RED} outlineColor={Cesium.Color.WHITE} outlineWidth={3} />
                        </Entity>

                        {/* Extra markers (Volunteers, Coordinators, other SOS) */}
                        {extraMarkers.map((m, idx) => {
                            if (!m.lat || !m.lng || (m.lat === lat && m.lng === lng)) return null;
                            const color = m.role === 'volunteer' ? Cesium.Color.DODGERBLUE : Cesium.Color.LIME;
                            return (
                                <Entity
                                    key={`extra-${idx}`}
                                    position={Cesium.Cartesian3.fromDegrees(m.lng, m.lat, 2)}
                                    name={m.name || m.full_name || 'Responder'}
                                >
                                    <PointGraphics pixelSize={15} color={color} outlineColor={Cesium.Color.WHITE} outlineWidth={2} />
                                </Entity>
                            );
                        })}
                    </Viewer>
                </div>

                {/* Footer / Stats */}
                <div className="p-4 bg-zinc-900 border-t border-white/10 flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="text-xs">
                            <span className="text-zinc-500 block uppercase">Latitude</span>
                            <span className="text-white font-mono">{lat.toFixed(6)}</span>
                        </div>
                        <div className="text-xs">
                            <span className="text-zinc-500 block uppercase">Longitude</span>
                            <span className="text-white font-mono">{lng.toFixed(6)}</span>
                        </div>
                    </div>
                    <div className="text-xs text-zinc-500">
                        Powered by CesiumJS & Google Photorealistic 3D Tiles
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThreeDModal;
