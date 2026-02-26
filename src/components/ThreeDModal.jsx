import React, { useEffect, useRef } from 'react';
import { Viewer, Cesium3DTileset, CameraFlyTo, Entity, PointGraphics } from 'resium';
import * as Cesium from 'cesium';

const ThreeDModal = ({ isOpen, onClose, lat, lng, alertInfo }) => {
    const viewerRef = useRef(null);

    useEffect(() => {
        if (import.meta.env.VITE_CESIUM_ACCESS_TOKEN) {
            Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ACCESS_TOKEN;
        }
    }, []);

    if (!isOpen) return null;

    // Google Photorealistic 3D Tiles Asset ID
    // 2275207 is the default asset ID for Google Photorealistic 3D Tiles in Cesium Ion
    const googleAssetId = 2275207;

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
                        terrainProvider={Cesium.createWorldTerrain()}
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
                        {/* Note: This requires a Cesium Ion token or Google API Key */}
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

                        <Entity
                            position={Cesium.Cartesian3.fromDegrees(lng, lat, 0)}
                            name="SOS Location"
                        >
                            <PointGraphics pixelSize={20} color={Cesium.Color.RED} outlineColor={Cesium.Color.WHITE} outlineWidth={2} />
                        </Entity>
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
