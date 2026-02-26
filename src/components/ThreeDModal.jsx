import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import "cesium/Build/Cesium/Widgets/widgets.css";

const ThreeDModal = ({ isOpen, onClose, lat, lng, alertInfo, extraMarkers = [] }) => {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('aerial'); // 'aerial' | 'street'

    const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (!isOpen || !containerRef.current || viewMode !== 'aerial') return;

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
                viewer.scene.screenSpaceCameraController.maximumZoomDistance = 1500;
                viewer.scene.screenSpaceCameraController.minimumZoomDistance = 5;

                viewer.scene.fog.enabled = true;
                viewer.scene.fog.density = 0.00015;
                viewer.scene.globe.enableLighting = true;
                viewer.scene.highDynamicRange = true;
                viewer.scene.postProcessStages.fxaa.enabled = true;

                // --- 🧱 GOOGLE PHOTOREALISTIC 3D TILES ---
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
                        font: 'bold 12pt Inter, sans-serif',
                        fillColor: Cesium.Color.WHITE,
                        outlineColor: Cesium.Color.BLACK,
                        outlineWidth: 3,
                        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        pixelOffset: new Cesium.Cartesian2(0, -30),
                        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                    }
                });

                // --- 🎥 INITIAL ANIMATION ---
                viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 600),
                    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }
                });

                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 120),
                    orientation: {
                        heading: Cesium.Math.toRadians(0),
                        pitch: Cesium.Math.toRadians(-30.0),
                        roll: 0.0
                    },
                    duration: 3
                });

            } catch (error) {
                console.error('Cesium Integration Error:', error);
                setIsLoading(false);
            }
        };

        if (viewMode === 'aerial') {
            initCesium();
        }

        return () => {
            if (viewer && !viewer.isDestroyed()) {
                viewer.destroy();
                viewerRef.current = null;
            }
        };
    }, [isOpen, lat, lng, viewMode]);

    // --- 🕹️ NAVIGATION HELPERS ---

    const flyToReset = () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, 120),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-30), roll: 0 },
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-2 md:p-6 lg:p-8 font-sans">
            <div className="relative w-full h-full max-w-[1400px] bg-zinc-950 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col border border-white/5">

                {/* 🏷️ PREMIMUM HEADER */}
                <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-6 pointer-events-none">
                    <div className="flex flex-col gap-1 pointer-events-auto">
                        <div className="flex items-center gap-3 bg-black/70 backdrop-blur-2xl p-2 px-4 rounded-2xl border border-white/10 shadow-2xl">
                            <span className="material-symbols-outlined text-red-500 animate-pulse">emergency</span>
                            <span className="text-white font-black tracking-widest text-[10px]">VIRTUAL COMMAND</span>
                            <div className="w-[1px] h-4 bg-white/10 mx-1" />
                            <span className="text-zinc-400 text-[10px] font-bold uppercase truncate max-w-[150px]">{alertInfo?.reporter_name || 'ACTIVE SOS'}</span>
                        </div>
                    </div>

                    {/* View Mode Switcher */}
                    <div className="flex bg-black/70 backdrop-blur-2xl p-1 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
                        <button
                            onClick={() => setViewMode('aerial')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${viewMode === 'aerial' ? 'bg-red-500 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <span className="material-symbols-outlined text-sm">satellite_alt</span>
                            AERIAL 3D
                        </button>
                        <button
                            onClick={() => setViewMode('street')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${viewMode === 'street' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <span className="material-symbols-outlined text-sm">streetview</span>
                            STREET LEVEL
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-black/70 backdrop-blur-2xl hover:bg-red-500 transition-colors rounded-xl border border-white/10"
                    >
                        <span className="material-symbols-outlined text-white text-sm">close</span>
                    </button>
                </div>

                {/* 🕹️ AERIAL CONTROLS (Only visible in aerial mode) */}
                {viewMode === 'aerial' && (
                    <div className="absolute left-6 bottom-10 z-30 flex flex-col gap-3 pointer-events-auto">
                        <div className="bg-black/70 backdrop-blur-2xl rounded-2xl p-1.5 border border-white/10 shadow-2xl flex flex-col gap-1.5">
                            <button onClick={zoomIn} className="nav-btn"><span className="material-symbols-outlined">add</span></button>
                            <button onClick={zoomOut} className="nav-btn"><span className="material-symbols-outlined">remove</span></button>
                            <div className="h-[1px] bg-white/5 mx-2" />
                            <div className="grid grid-cols-2 gap-1 p-1">
                                <button onClick={() => setHeading(0)} className="nav-dir-btn">N</button>
                                <button onClick={() => setHeading(90)} className="nav-dir-btn">E</button>
                                <button onClick={() => setHeading(180)} className="nav-dir-btn">S</button>
                                <button onClick={() => setHeading(270)} className="nav-dir-btn">W</button>
                            </div>
                            <div className="h-[1px] bg-white/5 mx-2" />
                            <button onClick={flyToReset} className="w-10 h-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all active:scale-90">
                                <span className="material-symbols-outlined">radar</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 🏢 MAIN VIEWER AREA */}
                <div className="flex-1 relative bg-black">
                    {viewMode === 'aerial' ? (
                        <>
                            <div ref={containerRef} className="w-full h-full" />
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-zinc-950/95 z-50">
                                    <div className="w-12 h-12 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                                    <p className="text-zinc-500 font-black tracking-[0.4em] text-[10px] uppercase">Mapping Terrain</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full bg-zinc-950 flex flex-col">
                            {googleApiKey ? (
                                <iframe
                                    title="Street View"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    src={`https://www.google.com/maps/embed/v1/streetview?key=${googleApiKey}&location=${lat},${lng}&heading=0&pitch=0&fov=90`}
                                    allowFullScreen
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-6">
                                    <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/5">
                                        <span className="material-symbols-outlined text-zinc-700 text-4xl">no_photography</span>
                                    </div>
                                    <div className="flex flex-col gap-2 max-w-sm">
                                        <h4 className="text-white font-black tracking-wide text-lg">STREET VIEW RESTRICTED</h4>
                                        <p className="text-zinc-500 text-xs leading-relaxed">
                                            The official Google integration requires a valid API key. Please check your system configuration or contact your administrator.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`, '_blank')}
                                        className="mt-4 px-6 py-2.5 bg-zinc-100 hover:bg-white text-black font-black text-[10px] rounded-xl transition-all"
                                    >
                                        OPEN STREET VIEW NATIVE
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 📊 FOOTER HUD */}
                <div className="absolute bottom-6 right-6 z-30 pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-2xl p-3 px-5 rounded-2xl border border-white/10 flex gap-6 shadow-2xl pointer-events-auto">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em]">Live Feed</span>
                            <span className="text-white text-xs font-bold tracking-tight">{viewMode === 'aerial' ? 'Streaming Photorealistic 3D' : 'Official Street Panorama'}</span>
                        </div>
                        <div className="w-[1px] h-6 bg-white/5" />
                        <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em]">Coordinates</span>
                            <span className="text-white text-xs font-mono tracking-tighter">{lat.toFixed(6)}°N, {lng.toFixed(6)}°E</span>
                        </div>
                    </div>
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
                        color: rgba(255, 255, 255, 0.5);
                        transition: all 0.2s;
                    }
                    .nav-btn:hover {
                        background: rgba(255, 255, 255, 0.08);
                        color: white;
                    }
                    .nav-dir-btn {
                        width: 20px;
                        height: 20px;
                        font-size: 8px;
                        font-weight: 900;
                        color: rgba(255, 255, 255, 0.4);
                        background: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 6px;
                        transition: all 0.2s;
                    }
                    .nav-dir-btn:hover {
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border-color: rgba(255, 255, 255, 0.2);
                    }
                ` }} />
            </div>
        </div>
    );
};

export default ThreeDModal;
