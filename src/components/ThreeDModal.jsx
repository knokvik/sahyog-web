import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";

const ThreeDModal = ({ isOpen, onClose, lat, lng, alertInfo, extraMarkers = [] }) => {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !containerRef.current) return;

        let viewer;

        // Initialize Cesium
        if (import.meta.env.VITE_CESIUM_ACCESS_TOKEN) {
            Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ACCESS_TOKEN;
        }

        const initCesium = async () => {
            try {
                // Determine if we should use legacy or modern terrain
                const terrainProvider = await Cesium.createWorldTerrainAsync?.() || undefined;

                viewer = new Cesium.Viewer(containerRef.current, {
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
                    terrainProvider: terrainProvider,
                    skyAtmosphere: new Cesium.SkyAtmosphere(),
                    shouldAnimate: true,
                    // Prevent the "global globe" view by limiting maximum zoom distance
                    scene3DOnly: true,
                });

                viewerRef.current = viewer;

                // --- 🏢 LOCALIZED CONSTRAINTS & REALISM ---

                // Set camera height constraints to prevent zooming out to global earth view
                viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1200; // Limit zoom out to local city scale
                viewer.scene.screenSpaceCameraController.minimumZoomDistance = 10;   // Allow close-up street view

                // Enable atmospheric effects for urban realism
                viewer.scene.fog.enabled = true;
                viewer.scene.fog.density = 0.0001;
                viewer.scene.fog.screenSpaceErrorFactor = 2.0;

                viewer.scene.globe.enableLighting = true;
                viewer.scene.highDynamicRange = true;
                viewer.scene.postProcessStages.fxaa.enabled = true;

                // Add 3D Tiles using modern async static method
                const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
                viewer.scene.primitives.add(tileset);

                setIsLoading(false);

                // --- 📍 MARKERS ---

                // Add Primary SOS Marker
                viewer.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(lng, lat, 15),
                    name: 'EMERGENCY SOS',
                    point: {
                        pixelSize: 24,
                        color: Cesium.Color.RED,
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 4,
                        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                    },
                    label: {
                        text: alertInfo?.reporter_name || 'Emergency',
                        font: 'bold 14pt Inter, sans-serif',
                        fillColor: Cesium.Color.WHITE,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 3,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -30),
                        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 1000.0)
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
                        position: Cesium.Cartesian3.fromDegrees(mLng, mLat, 8),
                        name: m.full_name || m.reporter_name || 'Responder',
                        point: {
                            pixelSize: 14,
                            color: color,
                            outlineColor: Cesium.Color.WHITE,
                            outlineWidth: 2,
                            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                        }
                    });
                });

                // --- 🎥 CAMERA INITIALIZATION ---

                // Set initial camera view to avoid showing the whole globe during initialization
                viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 800),
                    orientation: {
                        heading: Cesium.Math.toRadians(0),
                        pitch: Cesium.Math.toRadians(-90),
                        roll: 0.0
                    }
                });

                // Fast cinematic transition to human-level perspective
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 45),
                    orientation: {
                        heading: Cesium.Math.toRadians(0),
                        pitch: Cesium.Math.toRadians(-12.0),
                        roll: 0.0
                    },
                    duration: 2.5,
                    easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
                });

            } catch (error) {
                console.error('Cesium Initialization Error:', error);
                setIsLoading(false);
            }
        };

        initCesium();

        return () => {
            if (viewer && !viewer.isDestroyed()) {
                viewer.destroy();
                viewerRef.current = null;
            }
        };
    }, [isOpen, lat, lng]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10">
            <div className="relative w-full h-full max-w-6xl bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500">3d_rotation</span>
                            3D Immersive View
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

                <div className="flex-1 relative bg-black">
                    <div ref={containerRef} className="w-full h-full" />

                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950/50 backdrop-blur-sm transition-opacity duration-500">
                            <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin"></div>
                            <p className="text-sm font-medium text-zinc-400 animate-pulse">Establishing Immersive View...</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-zinc-900 border-t border-white/10 flex justify-between items-center text-[10px] uppercase tracking-widest text-zinc-500">
                    <div className="flex gap-4">
                        <span>LAT: {lat.toFixed(6)}</span>
                        <span>LNG: {lng.toFixed(6)}</span>
                    </div>
                    <span>Localized Urban Context Focus</span>
                </div>
            </div>
        </div>
    );
};

export default ThreeDModal;
