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

        if (import.meta.env.VITE_CESIUM_ACCESS_TOKEN) {
            Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ACCESS_TOKEN;
        }

        const initCesium = async () => {
            try {
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
                    scene3DOnly: true,
                });

                viewerRef.current = viewer;

                // --- 🎮 ADVANCED CONTROL OPTIMIZATION ---
                viewer.scene.screenSpaceCameraController.lookEventTypes = [Cesium.CameraEventType.LEFT_DRAG];
                viewer.scene.screenSpaceCameraController.rotateEventTypes = [Cesium.CameraEventType.LEFT_DRAG];
                viewer.scene.screenSpaceCameraController.translateEventTypes = [
                    Cesium.CameraEventType.RIGHT_DRAG,
                    Cesium.CameraEventType.MIDDLE_DRAG
                ];

                viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1500;
                viewer.scene.screenSpaceCameraController.minimumZoomDistance = 5;

                viewer.scene.fog.enabled = true;
                viewer.scene.fog.density = 0.00015;
                viewer.scene.globe.enableLighting = true;
                viewer.scene.highDynamicRange = true;
                viewer.scene.postProcessStages.fxaa.enabled = true;

                const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
                viewer.scene.primitives.add(tileset);

                setIsLoading(false);

                // --- 📍 MARKERS ---
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
                        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                    }
                });

                extraMarkers.forEach(m => {
                    const mLat = m.lat || (m.location?.coordinates ? m.location.coordinates[1] : null);
                    const mLng = m.lng || (m.location?.coordinates ? m.location.coordinates[0] : null);
                    if (!mLat || !mLng || (Math.abs(mLat - lat) < 0.0001 && Math.abs(mLng - lng) < 0.0001)) return;

                    const color = m.role === 'coordinator' ? Cesium.Color.LIME :
                        m.role === 'volunteer' ? Cesium.Color.DODGERBLUE : Cesium.Color.YELLOW;

                    viewer.entities.add({
                        position: Cesium.Cartesian3.fromDegrees(mLng, mLat, 8),
                        name: m.full_name || m.reporter_name || 'Responder',
                        point: { pixelSize: 14, color: color, outlineColor: Cesium.Color.WHITE, outlineWidth: 2, heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND }
                    });
                });

                // --- 🎥 INITIAL ANIMATION ---
                viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 500),
                    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }
                });

                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 60),
                    orientation: {
                        heading: Cesium.Math.toRadians(0),
                        pitch: Cesium.Math.toRadians(-20.0),
                        roll: 0.0
                    },
                    duration: 3
                });

            } catch (error) {
                console.error('Cesium UX Error:', error);
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

    // --- 🕹️ NAVIGATION HELPERS ---

    const flyToReset = () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, 60),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-20), roll: 0 },
            duration: 1.5
        });
    };

    const zoomIn = () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.zoomIn(viewerRef.current.camera.positionCartographic.height * 0.4);
    };

    const zoomOut = () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.zoomOut(viewerRef.current.camera.positionCartographic.height * 0.4);
    };

    const rotateLeft = () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.rotateLeft(Cesium.Math.toRadians(45));
    };

    const rotateRight = () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.rotateRight(Cesium.Math.toRadians(45));
    };

    const resetNorth = () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.flyTo({
            destination: viewerRef.current.camera.position,
            orientation: { heading: 0, pitch: viewerRef.current.camera.pitch, roll: 0 },
            duration: 0.8
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 md:p-6 lg:p-8">
            <div className="relative w-full h-full max-w-[1400px] bg-zinc-950 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col border border-white/5">

                {/* 🏷️ PREMIMUM HEADER */}
                <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6 pointer-events-none">
                    <div className="flex flex-col gap-1 pointer-events-auto">
                        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md p-2 px-4 rounded-xl border border-white/10">
                            <span className="material-symbols-outlined text-red-500 animate-pulse">emergency</span>
                            <span className="text-white font-bold tracking-tight">VIRTUAL COMMAND</span>
                            <div className="w-[1px] h-4 bg-white/20 mx-1" />
                            <span className="text-zinc-400 text-sm">{alertInfo?.reporter_name || 'ACTIVE SOS'}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="pointer-events-auto w-12 h-12 flex items-center justify-center bg-black/40 backdrop-blur-md hover:bg-red-500/80 rounded-2xl border border-white/10 transition-all duration-300 group"
                    >
                        <span className="material-symbols-outlined text-white/70 group-hover:text-white group-hover:rotate-90 transition-transform">close</span>
                    </button>
                </div>

                {/* 🎮 FLOATING NAVIGATION BAR */}
                <div className="absolute left-6 bottom-20 z-20 flex flex-col gap-3 pointer-events-auto">
                    <button onClick={zoomIn} className="nav-btn" title="Zoom In"><span className="material-symbols-outlined">add</span></button>
                    <button onClick={zoomOut} className="nav-btn" title="Zoom Out"><span className="material-symbols-outlined">remove</span></button>
                    <div className="w-8 h-[1px] bg-white/10 mx-auto my-1" />
                    <button onClick={rotateLeft} className="nav-btn" title="Rotate Left"><span className="material-symbols-outlined">rotate_left</span></button>
                    <button onClick={rotateRight} className="nav-btn" title="Rotate Right"><span className="material-symbols-outlined">rotate_right</span></button>
                    <div className="w-8 h-[1px] bg-white/10 mx-auto my-1" />
                    <button onClick={resetNorth} className="nav-btn" title="Reset North"><span className="material-symbols-outlined">explore</span></button>
                    <button onClick={flyToReset} title="Reset to SOS" className="w-12 h-12 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-2xl border border-red-500/30 transition-all backdrop-blur-md">
                        <span className="material-symbols-outlined">my_location</span>
                    </button>
                </div>

                {/* 🏢 CESIUM CONTAINER */}
                <div className="flex-1 relative">
                    <div ref={containerRef} className="w-full h-full" />

                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-zinc-950/90 z-50">
                            <div className="relative">
                                <div className="w-20 h-20 border-4 border-red-500/10 border-t-red-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-500 text-3xl animate-pulse">radar</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-zinc-200 font-bold tracking-[0.2em] uppercase text-xs">Initializing Neural Map</p>
                            </div>
                        </div>
                    )}
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .nav-btn {
                        width: 48px;
                        height: 48px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(0, 0, 0, 0.4);
                        backdrop-filter: blur(12px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 16px;
                        color: rgba(255, 255, 255, 0.7);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .nav-btn:hover {
                        background: rgba(255, 255, 255, 0.15);
                        color: white;
                        transform: translateY(-2px);
                        border-color: rgba(255, 255, 255, 0.2);
                    }
                ` }} />
            </div>
        </div>
    );
};

export default ThreeDModal;
