import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import io from 'socket.io-client';
import 'mapbox-gl/dist/mapbox-gl.css';

const SOURCE_ID = 'live-heatmap-source';
const SHELTER_SOURCE_ID = 'shelter-source';
const HEATMAP_LAYER_ID = 'live-heatmap-layer';
const DETAIL_LAYER_ID = 'heatmap-detail-layer';
const SHELTER_LAYER_ID = 'shelter-pin-layer';
const SHELTER_LABEL_LAYER_ID = 'shelter-label-layer';

const EMPTY_COLLECTION = {
  type: 'FeatureCollection',
  features: [],
};

const fallbackStyle = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-raster-layer',
      type: 'raster',
      source: 'osm-raster',
    },
  ],
};

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePoint(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const lat = asNumber(raw.lat ?? raw.latitude ?? raw.location?.coordinates?.[1]);
  const lng = asNumber(raw.lng ?? raw.longitude ?? raw.location?.coordinates?.[0]);

  if (lat === null || lng === null) return null;

  const count = Math.max(1, asNumber(raw.count) ?? 1);
  const severity = Math.max(1, Math.min(10, asNumber(raw.severity) ?? 1));

  return { lat, lng, count, severity };
}

function normalizeShelter(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const lat = asNumber(raw.lat ?? raw.latitude ?? raw.location?.coordinates?.[1]);
  const lng = asNumber(raw.lng ?? raw.longitude ?? raw.location?.coordinates?.[0]);

  if (lat === null || lng === null) return null;

  return {
    id: raw.id || `${lat}-${lng}`,
    name: raw.name || 'Shelter',
    lat,
    lng,
    occupancy: raw.occupancy,
    capacity: raw.capacity,
  };
}

function toHeatmapGeoJson(points = []) {
  return {
    type: 'FeatureCollection',
    features: points.map((point) => ({
      type: 'Feature',
      properties: {
        count: point.count,
        severity: point.severity,
      },
      geometry: {
        type: 'Point',
        coordinates: [point.lng, point.lat],
      },
    })),
  };
}

function toShelterGeoJson(shelters = []) {
  return {
    type: 'FeatureCollection',
    features: shelters.map((shelter) => ({
      type: 'Feature',
      properties: {
        id: shelter.id,
        name: shelter.name,
        occupancy: shelter.occupancy,
        capacity: shelter.capacity,
      },
      geometry: {
        type: 'Point',
        coordinates: [shelter.lng, shelter.lat],
      },
    })),
  };
}

function addHeatmapLayers(map, viewMode) {
  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: EMPTY_COLLECTION,
  });

  map.addLayer({
    id: HEATMAP_LAYER_ID,
    type: 'heatmap',
    source: SOURCE_ID,
    maxzoom: 18,
    paint: {
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['+', ['coalesce', ['get', 'count'], 1], ['coalesce', ['get', 'severity'], 1]],
        2,
        0.2,
        12,
        1,
      ],
      'heatmap-intensity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        viewMode === 'public' ? 0.55 : 0.8,
        15,
        viewMode === 'public' ? 0.85 : 1.25,
      ],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(22, 163, 74, 0)',
        0.2,
        'rgba(34, 197, 94, 0.4)',
        0.45,
        'rgba(249, 115, 22, 0.65)',
        0.75,
        'rgba(239, 68, 68, 0.8)',
        1,
        'rgba(185, 28, 28, 0.92)',
      ],
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        viewMode === 'public' ? 28 : 18,
        12,
        viewMode === 'public' ? 52 : 30,
        18,
        viewMode === 'public' ? 82 : 44,
      ],
      'heatmap-opacity': viewMode === 'public' ? 0.75 : 0.92,
    },
  });

  if (viewMode === 'admin') {
    map.addLayer({
      id: DETAIL_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      minzoom: 6,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'count'], 1],
          1,
          4,
          10,
          10,
          30,
          16,
        ],
        'circle-color': [
          'step',
          ['coalesce', ['get', 'severity'], 1],
          '#22c55e',
          5,
          '#f97316',
          8,
          '#ef4444',
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
        'circle-opacity': 0.75,
      },
    });
  }
}

function addShelterLayers(map) {
  map.addSource(SHELTER_SOURCE_ID, {
    type: 'geojson',
    data: EMPTY_COLLECTION,
  });

  map.addLayer({
    id: SHELTER_LAYER_ID,
    type: 'circle',
    source: SHELTER_SOURCE_ID,
    paint: {
      'circle-radius': 6,
      'circle-color': '#2563eb',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.95,
    },
  });

  map.addLayer({
    id: SHELTER_LABEL_LAYER_ID,
    type: 'symbol',
    source: SHELTER_SOURCE_ID,
    minzoom: 11,
    layout: {
      'text-field': ['coalesce', ['get', 'name'], 'Shelter'],
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      'text-size': 11,
      'text-offset': [0, 1.2],
      'text-anchor': 'top',
    },
    paint: {
      'text-color': '#0f172a',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1,
    },
  });
}

function updateSourceData(map, sourceId, collection) {
  const source = map.getSource(sourceId);
  if (source) {
    source.setData(collection);
  }
}

function pointPopupHtml(feature) {
  const count = feature?.properties?.count ?? 0;
  const severity = feature?.properties?.severity ?? 0;
  return `<div style="font-size:12px"><strong>Live Density</strong><br/>Count: ${count}<br/>Severity: ${severity}</div>`;
}

function shelterPopupHtml(feature) {
  const name = feature?.properties?.name || 'Shelter';
  const occupancy = feature?.properties?.occupancy;
  const capacity = feature?.properties?.capacity;
  const occupancyLine = occupancy != null && capacity != null
    ? `<br/>Occupancy: ${occupancy}/${capacity}`
    : '';

  return `<div style="font-size:12px"><strong>${name}</strong>${occupancyLine}</div>`;
}

export function HeatmapMap({ viewMode = 'public', height = '66vh' }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const [points, setPoints] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const heatmapGeoJson = useMemo(() => toHeatmapGeoJson(points), [points]);
  const shelterGeoJson = useMemo(() => toShelterGeoJson(shelters), [shelters]);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socket.on('heatmap:update', (payload = {}) => {
      const incomingPoints = Array.isArray(payload.points)
        ? payload.points.map(normalizePoint).filter(Boolean)
        : [];

      const incomingShelters = Array.isArray(payload.shelters)
        ? payload.shelters.map(normalizeShelter).filter(Boolean)
        : [];

      setPoints(incomingPoints);
      setShelters(incomingShelters);
      setLastUpdated(payload.updatedAt || new Date().toISOString());
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: fallbackStyle,
      center: [73.8567, 18.5204],
      zoom: 11,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      addHeatmapLayers(map, viewMode);
      addShelterLayers(map);
      updateSourceData(map, SOURCE_ID, heatmapGeoJson);
      updateSourceData(map, SHELTER_SOURCE_ID, shelterGeoJson);

      if (viewMode === 'admin') {
        map.on('click', DETAIL_LAYER_ID, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;

          new mapboxgl.Popup()
            .setLngLat(feature.geometry.coordinates)
            .setHTML(pointPopupHtml(feature))
            .addTo(map);
        });
      }

      map.on('click', SHELTER_LAYER_ID, (event) => {
        const feature = event.features?.[0];
        if (!feature) return;

        new mapboxgl.Popup()
          .setLngLat(feature.geometry.coordinates)
          .setHTML(shelterPopupHtml(feature))
          .addTo(map);
      });

      if (viewMode === 'admin') {
        map.on('mouseenter', DETAIL_LAYER_ID, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', DETAIL_LAYER_ID, () => {
          map.getCanvas().style.cursor = '';
        });
      }

      map.on('mouseenter', SHELTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', SHELTER_LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [viewMode, heatmapGeoJson, shelterGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    updateSourceData(map, SOURCE_ID, heatmapGeoJson);
  }, [heatmapGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    updateSourceData(map, SHELTER_SOURCE_ID, shelterGeoJson);
  }, [shelterGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onResize = () => map.resize();
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div
        ref={mapContainerRef}
        style={{
          height: '100%',
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          padding: '8px 10px',
          fontSize: 12,
          color: 'var(--color-text-primary)',
          lineHeight: 1.45,
        }}
      >
        <strong>{viewMode === 'admin' ? 'Detailed Live Heatmap' : 'Public Live Heatmap'}</strong>
        <div>Updates every 3 seconds</div>
        {lastUpdated && <div>Updated: {new Date(lastUpdated).toLocaleTimeString()}</div>}
      </div>

      {viewMode === 'admin' && (
        <div
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '8px 10px',
            fontSize: 12,
            color: 'var(--color-text-primary)',
            lineHeight: 1.45,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, background: '#ef4444', borderRadius: 10, display: 'inline-block' }} /> Red: 8-10</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, background: '#f97316', borderRadius: 10, display: 'inline-block' }} /> Orange: 5-7</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, background: '#22c55e', borderRadius: 10, display: 'inline-block' }} /> Green: &lt;5</div>
        </div>
      )}
    </div>
  );
}

export default HeatmapMap;
