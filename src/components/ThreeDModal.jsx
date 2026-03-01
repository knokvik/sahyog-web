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

                // --- 🎮 INTUITIVE CONTROL OPTIMIZATION (Google Maps Style) ---
                const controller = viewer.scene.screenSpaceCameraController;

                // Set mouse controls: Left = Rotate/Orbit, Right/Middle = Pan
                controller.lookEventTypes = [Cesium.CameraEventType.LEFT_DRAG];
                controller.rotateEventTypes = [Cesium.CameraEventType.LEFT_DRAG];
                controller.translateEventTypes = [
                    Cesium.CameraEventType.RIGHT_DRAG,
                    Cesium.CameraEventType.MIDDLE_DRAG
                ];
                controller.tiltEventTypes = [
                    Cesium.CameraEventType.RIGHT_DRAG,
                    Cesium.CameraEventType.MIDDLE_DRAG
                ];

                // Smooth settings for realistic feel
                controller.maximumZoomDistance = 1500;
                controller.minimumZoomDistance = 5;
                controller.inertiaSpin = 0.8;
                controller.inertiaTranslate = 0.8;
                controller.inertiaZoom = 0.7;
                controller.enableCollisionDetection = true;

                // Visual Finish
                viewer.scene.fog.enabled = true;
                viewer.scene.fog.density = 0.00015;
                viewer.scene.globe.enableLighting = true;
                viewer.scene.highDynamicRange = true;
                viewer.scene.postProcessStages.fxaa.enabled = true;

                // --- 🧱 GOOGLE PHOTOREALISTIC 3D TILES ---
                const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2275207);
                viewer.scene.primitives.add(tileset);

                setIsLoading(false);

                // --- 📍 PRIMARY SOS TARGET ---
                const targetPos = Cesium.Cartesian3.fromDegrees(lng, lat, 10);

                const sosEntity = viewer.entities.add({
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

                // --- 🎥 INITIAL TARGETED ANIMATION ---
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 150),
                    orientation: {
                        heading: Cesium.Math.toRadians(0),
                        pitch: Cesium.Math.toRadians(-35.0),
                        roll: 0.0
                    },
                    duration: 3,
                    easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
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

    // --- 🕹️ TARGET-FOCUSED NAVIGATION ---

    const flyToReset = () => {
        if (!viewerRef.current) return;
        const target = Cesium.Cartesian3.fromDegrees(lng, lat, 10);
        viewerRef.current.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lng, lat, 120),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-30),
                roll: 0
            },
            duration: 1.5
        });
    };

    const zoomIn = () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.zoomIn(viewerRef.current.camera.positionCartographic.height * 0.3);
    };

    const zoomOut = () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.zoomOut(viewerRef.current.camera.positionCartographic.height * 0.3);
    };

    // FOCAL ROTATION: Orbit around the target marker
    const setFocalHeading = (degrees) => {
        if (!viewerRef.current) return;
        const viewer = viewerRef.current;
        const target = Cesium.Cartesian3.fromDegrees(lng, lat, 10);

        // Calculate the current distance from target
        const distance = Cesium.Cartesian3.distance(viewer.camera.position, target);

        viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, distance), {
            offset: new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(degrees),
                viewer.camera.pitch,
                distance
            ),
            duration: 1.0
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-2 md:p-6 lg:p-8 font-sans">
            <div className="relative w-full h-full max-w-[1400px] bg-zinc-950 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col border border-white/5">

                {/* 🏷️ PREMIMUM HEADER */}
                <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-6 pointer-events-none">
                    <div className="flex flex-col gap-1 pointer-events-auto">
                        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-3xl p-2.5 px-5 rounded-2xl border border-white/10 shadow-2xl">
                            <span className="material-symbols-outlined text-red-500 animate-pulse">emergency</span>
                            <span className="text-white font-black tracking-widest text-[11px] uppercase">Virtual Command</span>
                            <div className="w-[1px] h-4 bg-white/10 mx-1" />
                            <span className="text-zinc-400 text-[10px] font-bold uppercase truncate max-w-[180px]">{alertInfo?.reporter_name || 'LIVE SOS FEED'}</span>
                        </div>
                    </div>

                    <div className="flex gap-4 pointer-events-auto items-center">
                        <div className="flex bg-black/80 backdrop-blur-3xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
                            <button
                                onClick={() => setViewMode('aerial')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === 'aerial' ? 'bg-red-500 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <span className="material-symbols-outlined text-[16px]">satellite_alt</span>
                                3D AERIAL
                            </button>
                            <button
                                onClick={() => setViewMode('street')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === 'street' ? 'bg-blue-600 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <span className="material-symbols-outlined text-[16px]">streetview</span>
                                STREET VIEW
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center bg-zinc-900/80 backdrop-blur-3xl hover:bg-red-500 transition-all rounded-2xl border border-white/5 shadow-xl group"
                        >
                            <span className="material-symbols-outlined text-white/70 group-hover:text-white transition-all">close</span>
                        </button>
                    </div>
                </div>

                {/* 🕹️ TARGETED NAVIGATION HUD (Aerial Only) */}
                {viewMode === 'aerial' && (
                    <div className="absolute left-6 bottom-10 z-30 flex flex-col gap-3 pointer-events-auto">
                        <div className="bg-black/80 backdrop-blur-3xl rounded-3xl p-2 border border-white/10 shadow-2xl flex flex-col gap-2">
                            <button onClick={zoomIn} className="nav-icon-btn"><span className="material-symbols-outlined">add</span></button>
                            <button onClick={zoomOut} className="nav-icon-btn"><span className="material-symbols-outlined">remove</span></button>
                            <div className="h-[1px] bg-white/5 mx-2" />
                            <div className="flex flex-col items-center gap-2 py-2">
                                <span className="text-[8px] text-zinc-500 font-black tracking-widest uppercase">Target Orbit</span>
                                <div className="grid grid-cols-2 gap-1.5 px-1">
                                    <button onClick={() => setFocalHeading(0)} className="nav-orbit-btn">N</button>
                                    <button onClick={() => setFocalHeading(90)} className="nav-orbit-btn">E</button>
                                    <button onClick={() => setFocalHeading(180)} className="nav-orbit-btn">S</button>
                                    <button onClick={() => setFocalHeading(270)} className="nav-orbit-btn">W</button>
                                </div>
                            </div>
                            <div className="h-[1px] bg-white/5 mx-2" />
                            <button
                                onClick={flyToReset}
                                className="w-11 h-11 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all shadow-inner active:scale-95 group"
                                title="Snap to Emergency"
                            >
                                <span className="material-symbols-outlined group-hover:animate-spin">radar</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* 🏢 MAIN VIEWER ENGINE */}
                <div className="flex-1 relative bg-black">
                    {viewMode === 'aerial' ? (
                        <>
                            <div ref={containerRef} className="w-full h-full" />
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-zinc-950/95 z-50">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-2 border-red-500/10 border-t-red-500 rounded-full animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-red-500 text-3xl animate-pulse">view_in_ar</span>
                                        </div>
                                    </div>
                                    <p className="text-zinc-600 font-black tracking-[0.5em] text-[10px] uppercase animate-pulse">Initializing Virtual Scan</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full bg-zinc-950">
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
                                <div className="h-full flex flex-col items-center justify-center gap-10 p-20 text-center">
                                    <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                                        <span className="material-symbols-outlined text-zinc-700 text-5xl">api</span>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <h3 className="text-zinc-200 font-black text-2xl tracking-tight">STREET VIEW RESTRICTED</h3>
                                        <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed font-medium">
                                            VITE_GOOGLE_MAPS_API_KEY is missing. Add your API key to the environment configuration to enable secure embedded panorama viewing.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`, '_blank')}
                                        className="px-10 py-4 bg-zinc-100 hover:bg-white text-black font-black text-xs rounded-2xl transition-all shadow-2xl active:scale-95"
                                    >
                                        ACTIVATE NATIVE STREET VIEW
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 🏷️ INFO HUD OVERLAY */}
                <div className="absolute bottom-6 right-6 z-30 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur-3xl p-4 px-7 rounded-3xl border border-white/10 flex gap-10 shadow-2xl pointer-events-auto">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Target Position</span>
                            <span className="text-zinc-100 text-sm font-mono tracking-tighter">{lat.toFixed(6)}°N, {lng.toFixed(6)}°E</span>
                        </div>
                        <div className="w-[1px] h-10 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Active Units</span>
                            <span className="text-red-500 text-sm font-black tabular-nums">{extraMarkers.length + 1} SENSORS</span>
                        </div>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .nav-icon-btn {
                        width: 44px;
                        height: 44px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 14px;
                        color: rgba(255, 255, 255, 0.5);
                        transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    }
                    .nav-icon-btn:hover {
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        transform: scale(1.05);
                    }
                    .nav-orbit-btn {
                        width: 22px;
                        height: 22px;
                        font-size: 9px;
                        font-weight: 900;
                        color: rgba(255, 255, 255, 0.4);
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 7px;
                        transition: all 0.2s;
                    }
                    .nav-orbit-btn:hover {
                        background: rgba(239, 68, 68, 0.6);
                        color: white;
                        border-color: rgba(239, 68, 68, 0.4);
                        transform: translateY(-1px);
                    }
                ` }} />
            </div>
        </div>
    );
};

export default ThreeDModal;
