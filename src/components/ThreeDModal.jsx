import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";

const ThreeDModal = ({ isOpen, onClose, lat, lng, alertInfo, extraMarkers = [] }) => {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !containerRef.current) return;

        // Initialize Cesium
        if (import.meta.env.VITE_CESIUM_ACCESS_TOKEN) {
            Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ACCESS_TOKEN;
        }

        const viewer = new Cesium.Viewer(containerRef.current, {
            terrainProvider: Cesium.createWorldTerrain ? Cesium.createWorldTerrain() : undefined,
            animation: false,
            timeline: false,
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            selectionIndicator: false,
            navigationHelpButton: false,
            sceneModePicker: false,
            fullscreenButton: false,
        });

        viewerRef.current = viewer;

        // Add 3D Tiles
        const tileset = viewer.scene.primitives.add(
            new Cesium.Cesium3DTileset({
                url: Cesium.IonResource.fromAssetId(2275207),
            })
        );

        tileset.readyPromise.then(() => {
            console.log('3D Tiles Ready');
            setIsLoading(false);
        }).catch(err => {
            console.error('Tileset error:', err);
            setIsLoading(false);
        });

        // Add Primary SOS Marker
        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lng, lat, 10),
            name: 'EMERGENCY SOS',
            point: {
                pixelSize: 20,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 3,
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
            },
            label: {
                text: alertInfo?.reporter_name || 'Emergency',
                font: 'bold 12pt Inter, sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -20),
                heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
            }
        });

        // Add Extra Markers (Responders, etc)
        extraMarkers.forEach(m => {
            const mLat = m.lat || (m.location?.coordinates ? m.location.coordinates[1] : null);
            const mLng = m.lng || (m.location?.coordinates ? m.location.coordinates[0] : null);

            if (!mLat || !mLng || (Math.abs(mLat - lat) < 0.0001 && Math.abs(mLng - lng) < 0.0001)) return;

            const color = m.role === 'coordinator' ? Cesium.Color.LIME :
                m.role === 'volunteer' ? Cesium.Color.DODGERBLUE :
                    Cesium.Color.YELLOW;

            viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(mLng, mLat, 5),
                name: m.full_name || m.reporter_name || 'Responder',
                point: {
                    pixelSize: 12,
                    color: color,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                }
            });
        });

        // Camera Fly To
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, 150),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-45),
                roll: 0
            },
            duration: 4
        });

        return () => {
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                viewerRef.current.destroy();
                viewerRef.current = null;
            }
        };
    }, [isOpen, lat, lng]);

    if (!isOpen) return null;

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

                {/* Cesium Viewer Container */}
                <div className="flex-1 relative bg-black">
                    <div ref={containerRef} className="w-full h-full" />

                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950/50 backdrop-blur-sm transition-opacity duration-500">
                            <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                            <p className="text-sm font-medium text-zinc-400 animate-pulse">Initializing 3D Engine...</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-zinc-900 border-t border-white/10 flex justify-between items-center text-[10px] uppercase tracking-widest text-zinc-500">
                    <div className="flex gap-4">
                        <span>LAT: {lat.toFixed(6)}</span>
                        <span>LNG: {lng.toFixed(6)}</span>
                    </div>
                    <span>Direct CesiumJS Engine (Fast Mode)</span>
                </div>
            </div>
        </div>
    );
};

export default ThreeDModal;
