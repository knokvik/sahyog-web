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

                // --- 🏢 LOCALIZED CONSTRAINTS & REALISM ---
                viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1500;
                viewer.scene.screenSpaceCameraController.minimumZoomDistance = 5;

                viewer.scene.fog.enabled = true;
                viewer.scene.fog.density = 0.00015;
                viewer.scene.globe.enableLighting = true;
                viewer.scene.highDynamicRange = true;
                viewer.scene.postProcessStages.fxaa.enabled = true;

                // --- 🧱 GOOGLE PHOTOREALISTIC 3D TILES ---
                // Asset ID 2275207 is the standard ID for Google's official Photorealistic 3D Tiles on Cesium Ion
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

                // --- 🎥 CAMERA INITIALIZATION ---
                viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 600),
                    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }
                });

                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 100),
                    orientation: {
                        heading: Cesium.Math.toRadians(0),
                        pitch: Cesium.Math.toRadians(-25.0),
                        roll: 0.0
                    },
                    duration: 3
                });

            } catch (error) {
                console.error('Cesium Google Integration Error:', error);
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
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, 100),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-25), roll: 0 },
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

    const openStreetView = () => {
        const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
        window.open(url, '_blank');
    };

    const setHeading = (degrees) => {
        if (!viewerRef.current) return;
        const camera = viewerRef.current.camera;
        viewerRef.current.camera.flyTo({
            destination: camera.position,
            orientation: { heading: Cesium.Math.toRadians(degrees), pitch: camera.pitch, roll: 0 },
            duration: 0.8,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 md:p-6 lg:p-8">
            <div className="relative w-full h-full max-w-[1400px] bg-zinc-950 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col border border-white/5">

                {/* 🏷️ PREMIMUM HEADER */}
                <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-6 pointer-events-none">
                    <div className="flex flex-col gap-1 pointer-events-auto">
                        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-xl p-2 px-4 rounded-xl border border-white/10 shadow-xl">
                            <span className="material-symbols-outlined text-red-500 animate-pulse">emergency</span>
                            <span className="text-white font-black tracking-widest text-xs">VIRTUAL COMMAND</span>
                            <div className="w-[1px] h-4 bg-white/20 mx-1" />
                            <span className="text-zinc-300 text-xs font-medium uppercase tracking-wider">{alertInfo?.reporter_name || 'ACTIVE SOS'}</span>
                        </div>
                    </div>
                    <div className="flex gap-3 pointer-events-auto">
                        <button
                            onClick={openStreetView}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-4 rounded-xl border border-white/20 transition-all shadow-lg active:scale-95 group"
                        >
                            <span className="material-symbols-outlined text-sm group-hover:animate-bounce">streetview</span>
                            OFFICIAL STREET VIEW
                        </button>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center bg-black/60 backdrop-blur-xl hover:bg-red-500/80 rounded-xl border border-white/10 transition-all group shadow-lg"
                        >
                            <span className="material-symbols-outlined text-white/70 group-hover:text-white group-hover:rotate-90 transition-all text-sm">close</span>
                        </button>
                    </div>
                </div>

                {/* 🎮 FLOATING NAVIGATION BAR */}
                <div className="absolute left-6 bottom-10 z-20 flex flex-col gap-3 pointer-events-auto">
                    <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 shadow-2xl flex flex-col gap-2">
                        <button onClick={zoomIn} className="nav-btn" title="Zoom In"><span className="material-symbols-outlined text-lg">add</span></button>
                        <button onClick={zoomOut} className="nav-btn" title="Zoom Out"><span className="material-symbols-outlined text-lg">remove</span></button>
                        <div className="h-[1px] bg-white/5 mx-2" />
                        <button onClick={rotateLeft} className="nav-btn" title="Rotate Left"><span className="material-symbols-outlined text-lg">rotate_left</span></button>
                        <button onClick={rotateRight} className="nav-btn" title="Rotate Right"><span className="material-symbols-outlined text-lg">rotate_right</span></button>
                        <div className="h-[1px] bg-white/5 mx-2" />
                        <div className="flex flex-col items-center gap-1.5 py-2">
                            <span className="text-[9px] text-zinc-500 font-bold tracking-[0.2em] uppercase">Dir</span>
                            <div className="grid grid-cols-2 gap-1 px-1">
                                <button onClick={() => setHeading(0)} className="nav-comp-btn">N</button>
                                <button onClick={() => setHeading(90)} className="nav-comp-btn">E</button>
                                <button onClick={() => setHeading(180)} className="nav-comp-btn">S</button>
                                <button onClick={() => setHeading(270)} className="nav-comp-btn">W</button>
                            </div>
                        </div>
                        <div className="h-[1px] bg-white/5 mx-2" />
                        <button onClick={flyToReset} title="Reset to SOS" className="w-10 h-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all active:scale-95">
                            <span className="material-symbols-outlined text-lg">my_location</span>
                        </button>
                    </div>
                </div>

                {/* 🏢 CESIUM CONTAINER */}
                <div className="flex-1 relative bg-black">
                    <div ref={containerRef} className="w-full h-full" />

                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-zinc-950/95 z-50">
                            <div className="relative">
                                <div className="w-16 h-16 border-2 border-red-500/10 border-t-red-500 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-500 text-2xl animate-pulse">satellite_alt</span>
                                </div>
                            </div>
                            <p className="text-zinc-500 font-bold tracking-[0.3em] uppercase text-[10px]">Streaming Photorealistic 3D</p>
                        </div>
                    )}
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .nav-btn {
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 12px;
                        color: rgba(255, 255, 255, 0.6);
                        transition: all 0.2s ease;
                    }
                    .nav-btn:hover {
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                    }
                    .nav-comp-btn {
                        width: 18px;
                        height: 18px;
                        font-size: 8px;
                        font-weight: 800;
                        color: rgba(255, 255, 255, 0.5);
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 4px;
                        transition: all 0.2s;
                    }
                    .nav-comp-btn:hover {
                        background: rgba(59, 130, 246, 0.5);
                        color: white;
                        border-color: rgba(59, 130, 246, 0.5);
                    }
                ` }} />
            </div>
        </div>
    );
};

export default ThreeDModal;
