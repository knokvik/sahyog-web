import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, apiPaths } from '../../lib/api';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './SituationMonitor.module.css';

// ── Live Clock ──
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const utc = now.toUTCString().replace('GMT', 'UTC');
  return (
    <span className={styles.clockDisplay}>
      <span className={styles.clockUtc}>{utc}</span>
    </span>
  );
}

// ── Map auto-fit to markers ──
function MapFitter({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = markers.map(m => [m.lat, m.lng]);
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 }); } catch (_) {}
    }
  }, [markers, map]);
  return null;
}

// ── Threat Level Logic ──
function getThreatLevel(activeSos, activeDisasters) {
  if (activeSos >= 5 || activeDisasters >= 3) return { label: 'CRITICAL', cls: styles.threatCritical, icon: 'crisis_alert' };
  if (activeSos >= 2 || activeDisasters >= 1) return { label: 'ELEVATED', cls: styles.threatElevated, icon: 'warning' };
  if (activeSos >= 1) return { label: 'MONITORING', cls: styles.threatMonitoring, icon: 'visibility' };
  return { label: 'STABLE', cls: styles.threatStable, icon: 'verified_user' };
}

// ── Format Time ──
function fmtTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  const diff = Math.floor((Date.now() - dt.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Parse location ──
function parseLoc(item) {
  if (item.lat && item.lng) return { lat: +item.lat, lng: +item.lng };
  if (item.location?.coordinates?.length === 2) {
    const [lng, lat] = item.location.coordinates;
    if (lat && lng && !(Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01)) return { lat, lng };
  }
  return null;
}

// ── NEWS DATA ──
const NEWS_CHANNELS = [
  { id: 'ndtv', name: 'NDTV', ytId: 'KMyBHJUDB_I' },
  { id: 'ddnews', name: 'DD NEWS', ytId: 'sLBMgJE3VPM' },
  { id: 'skynews', name: 'SKYNEWS', ytId: '9Auq9mYxFEE' },
  { id: 'aljazeera', name: 'ALJAZEERA', ytId: 'bNyUyrR0PHo' },
  { id: 'imd', name: 'IMD', ytId: null },
  { id: 'reuters', name: 'REUTERS', ytId: null },
];

// ── LAYER CONFIG ──
const LAYERS = [
  { id: 'sos', label: 'SOS HOTSPOTS', color: '#f87171', icon: 'sos' },
  { id: 'zones', label: 'RELIEF ZONES', color: '#fbbf24', icon: 'shield' },
  { id: 'resources', label: 'SUPPLY HUBS', color: '#3ecf8e', icon: 'inventory_2' },
  { id: 'volunteers', label: 'VOLUNTEERS', color: '#60a5fa', icon: 'group' },
  { id: 'medical', label: 'MEDICAL', color: '#c084fc', icon: 'local_hospital' },
];

// ── MAIN COMPONENT ──
export function SituationMonitor() {
  const { getToken, isSignedIn } = useAuth();

  // Fetch live data
  const { data: sosRaw } = useQuery({
    queryKey: ['sit-sos'],
    queryFn: () => apiRequest(apiPaths.sos, {}, getToken),
    enabled: isSignedIn === true,
    refetchInterval: 10000,
  });
  const { data: disastersRaw } = useQuery({
    queryKey: ['sit-disasters'],
    queryFn: () => apiRequest(apiPaths.disasters, {}, getToken),
    enabled: isSignedIn === true,
    refetchInterval: 15000,
  });
  const { data: resourcesRaw } = useQuery({
    queryKey: ['sit-resources'],
    queryFn: () => apiRequest(apiPaths.resources, {}, getToken),
    enabled: isSignedIn === true,
    refetchInterval: 30000,
  });
  const { data: usersRaw } = useQuery({
    queryKey: ['sit-users'],
    queryFn: () => apiRequest(apiPaths.users, {}, getToken),
    enabled: isSignedIn === true,
    refetchInterval: 30000,
  });

  const sosArr = Array.isArray(sosRaw) ? sosRaw : [];
  const disArr = Array.isArray(disastersRaw) ? disastersRaw : [];
  const resArr = Array.isArray(resourcesRaw) ? resourcesRaw : [];
  const usersArr = Array.isArray(usersRaw) ? usersRaw : [];

  const activeSos = sosArr.filter(s => s.status !== 'resolved' && s.status !== 'cancelled');
  const activeDisasters = disArr.filter(d => d.status === 'active');
  const volunteers = usersArr.filter(u => u.role === 'volunteer');

  const threat = getThreatLevel(activeSos.length, activeDisasters.length);

  // ── Map markers ──
  const [layers, setLayers] = useState({ sos: true, zones: true, resources: true, volunteers: false, medical: false });
  const toggleLayer = (id) => setLayers(prev => ({ ...prev, [id]: !prev[id] }));
  const [layersOpen, setLayersOpen] = useState(true);

  const mapMarkers = useMemo(() => {
    const markers = [];
    if (layers.sos) {
      sosArr.forEach(s => {
        const loc = parseLoc(s);
        if (loc) markers.push({ ...loc, type: 'sos', id: s.id, label: s.type || 'SOS', status: s.status, time: s.created_at });
      });
    }
    if (layers.resources) {
      resArr.forEach(r => {
        const loc = parseLoc(r);
        if (loc) markers.push({ ...loc, type: 'resource', id: r.id, label: r.type || 'Resource', status: r.status, time: r.created_at });
      });
    }
    return markers;
  }, [sosArr, resArr, layers]);

  // ── News ──
  const [activeChannel, setActiveChannel] = useState('ndtv');
  const currentChannel = NEWS_CHANNELS.find(c => c.id === activeChannel);

  // ── AI brief ──
  const aiBrief = useMemo(() => {
    const lines = [];
    if (activeSos.length > 0) {
      lines.push(`${activeSos.length} active SOS distress signal${activeSos.length > 1 ? 's' : ''} detected across monitored zones.`);
      const types = [...new Set(activeSos.map(s => s.type).filter(Boolean))];
      if (types.length > 0) lines.push(`Types: ${types.join(', ')}.`);
    }
    if (activeDisasters.length > 0) {
      lines.push(`${activeDisasters.length} active disaster${activeDisasters.length > 1 ? 's' : ''} being monitored.`);
    }
    if (resArr.length > 0) {
      lines.push(`${resArr.length} resource${resArr.length > 1 ? 's' : ''} deployed in the field.`);
    }
    if (volunteers.length > 0) {
      lines.push(`${volunteers.length} volunteer${volunteers.length > 1 ? 's' : ''} registered for deployment.`);
    }
    if (lines.length === 0) lines.push('All systems nominal. No active incidents detected.');
    return lines.join(' ');
  }, [activeSos, activeDisasters, resArr, volunteers]);

  // ── Build incident feed ──
  const incidentFeed = useMemo(() => {
    const items = [];
    sosArr.slice(0, 8).forEach(s => {
      items.push({ id: s.id, type: 'sos', title: `SOS: ${s.type || 'Emergency'}`, status: s.status, time: s.created_at, desc: s.description });
    });
    disArr.slice(0, 4).forEach(d => {
      items.push({ id: d.id, type: 'disaster', title: `Disaster: ${d.name || d.type || 'Unknown'}`, status: d.status, time: d.created_at });
    });
    items.sort((a, b) => new Date(b.time) - new Date(a.time));
    return items.slice(0, 10);
  }, [sosArr, disArr]);

  // ── News ticker ──
  const newsTicker = useMemo(() => {
    const headlines = [];
    activeSos.slice(0, 3).forEach(s => {
      headlines.push({ breaking: true, text: `Emergency ${s.type || 'SOS'} signal detected — Priority ${s.priority_score || 'high'}` });
    });
    activeDisasters.slice(0, 2).forEach(d => {
      headlines.push({ breaking: true, text: `Active disaster zone: ${d.name || d.type} — Status: ${d.status}` });
    });
    if (headlines.length === 0) {
      headlines.push({ breaking: false, text: 'No active emergency alerts at this time. Monitoring all channels.' });
    }
    return headlines;
  }, [activeSos, activeDisasters]);

  return (
    <div className={styles.console}>
      {/* ── Telemetry Bar ── */}
      <div className={styles.telemetryBar}>
        <div className={styles.telemetryLeft}>
          <div className={styles.brandMark}>
            <span className={`material-symbols-outlined ${styles.brandIcon}`}>radar</span>
            SAHYOG MONITOR
          </div>
          <span className={styles.versionTag}>v2.0</span>
          <div className={styles.liveBadge}>
            <span className={styles.livePulse} />
            LIVE
          </div>
        </div>

        <div className={styles.telemetryCenter}>
          <div className={`${styles.threatBadge} ${threat.cls}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{threat.icon}</span>
            {threat.label}
          </div>
          <div className={styles.metricPills}>
            <div className={`${styles.metricPill} ${styles.metricRed}`}>
              <span className={`material-symbols-outlined ${styles.pillIcon}`}>sos</span>
              <span className={styles.val}>{activeSos.length}</span>
              SOS
            </div>
            <div className={`${styles.metricPill} ${styles.metricAmber}`}>
              <span className={`material-symbols-outlined ${styles.pillIcon}`}>flood</span>
              <span className={styles.val}>{activeDisasters.length}</span>
              ZONES
            </div>
            <div className={`${styles.metricPill} ${styles.metricBlue}`}>
              <span className={`material-symbols-outlined ${styles.pillIcon}`}>group</span>
              <span className={styles.val}>{volunteers.length}</span>
              VOL
            </div>
            <div className={`${styles.metricPill} ${styles.metricGreen}`}>
              <span className={`material-symbols-outlined ${styles.pillIcon}`}>inventory_2</span>
              <span className={styles.val}>{resArr.length}</span>
              RES
            </div>
          </div>
        </div>

        <div className={styles.telemetryRight}>
          <LiveClock />
        </div>
      </div>

      {/* ── Central Tactical Map ── */}
      <div className={styles.mapArea}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          className={styles.mapContainer}
          zoomControl={false}
          attributionControl={false}
          style={{ background: '#0d1117' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; CARTO'
          />
          <MapFitter markers={mapMarkers} />
          {mapMarkers.map(m => (
            <CircleMarker
              key={`${m.type}-${m.id}`}
              center={[m.lat, m.lng]}
              radius={m.type === 'sos' ? 8 : 5}
              pathOptions={{
                color: m.type === 'sos' ? '#ef4444' : m.type === 'resource' ? '#3ecf8e' : '#60a5fa',
                fillColor: m.type === 'sos' ? '#ef4444' : m.type === 'resource' ? '#3ecf8e' : '#60a5fa',
                fillOpacity: 0.7,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                  <strong>{m.label}</strong><br />
                  Status: {m.status || 'unknown'}<br />
                  {fmtTime(m.time)}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Layer Panel */}
        {layersOpen && (
          <div className={styles.layerPanel}>
            <div className={styles.layerTitle}>
              LAYERS
              <button className={styles.layerToggleBtn} onClick={() => setLayersOpen(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>
            {LAYERS.map(l => (
              <label key={l.id} className={styles.layerItem}>
                <input
                  type="checkbox"
                  className={styles.layerCheck}
                  checked={layers[l.id]}
                  onChange={() => toggleLayer(l.id)}
                  style={{ color: l.color }}
                />
                <span className={styles.layerDot} style={{ background: l.color }} />
                {l.label}
              </label>
            ))}
          </div>
        )}
        {!layersOpen && (
          <button
            onClick={() => setLayersOpen(true)}
            style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'rgba(17,24,39,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#94a3b8', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>layers</span>
            LAYERS
          </button>
        )}

        {/* Legend */}
        <div className={styles.mapLegend}>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ef4444' }} /> High Alert</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#fbbf24' }} /> Elevated</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#60a5fa' }} /> Monitoring</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#3ecf8e' }} /> Safe</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#c084fc' }} /> Medical</span>
        </div>
      </div>

      {/* ── Bottom 3-Deck ── */}
      <div className={styles.deckGrid}>
        {/* Deck 1: Live Incident Feed */}
        <div className={styles.deck}>
          <div className={styles.deckHeader}>
            <div className={styles.deckTitle}>
              <span className={`material-symbols-outlined ${styles.deckTitleIcon}`}>breaking_news</span>
              LIVE INCIDENT FEED
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className={styles.deckLive}>
                <span className={styles.deckLiveDot} />
                LIVE
              </div>
              <span className={styles.deckCounter}>• {incidentFeed.length}</span>
            </div>
          </div>
          <div className={styles.deckBody}>
            {incidentFeed.length === 0 ? (
              <div className={styles.emptyState}>
                <span className={`material-symbols-outlined ${styles.emptyStateIcon}`}>inbox</span>
                No incidents
              </div>
            ) : (
              incidentFeed.map(item => (
                <div key={item.id} className={styles.incidentItem}>
                  <div className={`${styles.incidentIcon} ${
                    item.type === 'sos' ? styles.incidentSos :
                    item.type === 'disaster' ? styles.incidentDisaster :
                    item.type === 'resource' ? styles.incidentResource :
                    styles.incidentVolunteer
                  }`}>
                    <span className="material-symbols-outlined">
                      {item.type === 'sos' ? 'sos' : item.type === 'disaster' ? 'flood' : item.type === 'resource' ? 'inventory_2' : 'group'}
                    </span>
                  </div>
                  <div className={styles.incidentBody}>
                    <div className={styles.incidentTitle}>{item.title}</div>
                    <div className={styles.incidentMeta}>
                      <span className={`${styles.statusDot} ${
                        item.status === 'triggered' || item.status === 'active' ? styles.statusActive :
                        item.status === 'resolved' ? styles.statusResolved :
                        styles.statusMonitoring
                      }`} />
                      {item.status || 'unknown'}
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtTime(item.time)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Deck 2: AI Crisis Insights */}
        <div className={styles.deck}>
          <div className={styles.deckHeader}>
            <div className={styles.deckTitle}>
              <span className={`material-symbols-outlined ${styles.deckTitleIcon}`}>psychology</span>
              AI INSIGHTS
            </div>
            <div className={styles.deckLive}>
              <span className={styles.deckLiveDot} />
              LIVE
            </div>
          </div>
          <div className={styles.deckBody}>
            <div className={styles.aiSection}>
              <div className={styles.aiSectionTitle}>
                <span className={`material-symbols-outlined ${styles.aiSectionIcon}`}>auto_awesome</span>
                SITUATION BRIEF
              </div>
              <p className={styles.aiBriefText}>{aiBrief}</p>
            </div>

            <div className={styles.aiSection}>
              <div className={styles.aiSectionTitle}>
                <span className={`material-symbols-outlined ${styles.aiSectionIcon}`}>trending_up</span>
                AI FORECASTS
              </div>
              <div className={styles.forecastGrid}>
                <div className={styles.forecastCard}>
                  <div className={styles.forecastLabel}>Active SOS</div>
                  <div className={`${styles.forecastValue} ${styles.forecastRed}`}>{activeSos.length}</div>
                </div>
                <div className={styles.forecastCard}>
                  <div className={styles.forecastLabel}>Disasters</div>
                  <div className={`${styles.forecastValue} ${styles.forecastAmber}`}>{activeDisasters.length}</div>
                </div>
                <div className={styles.forecastCard}>
                  <div className={styles.forecastLabel}>Resources</div>
                  <div className={`${styles.forecastValue} ${styles.forecastGreen}`}>{resArr.length}</div>
                </div>
                <div className={styles.forecastCard}>
                  <div className={styles.forecastLabel}>Volunteers</div>
                  <div className={`${styles.forecastValue} ${styles.forecastBlue}`}>{volunteers.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deck 3: Live News */}
        <div className={styles.deck}>
          <div className={styles.deckHeader}>
            <div className={styles.deckTitle}>
              <span className={`material-symbols-outlined ${styles.deckTitleIcon}`}>live_tv</span>
              LIVE NEWS
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className={styles.deckLive}>
                <span className={styles.deckLiveDot} />
                LIVE
              </div>
              <span className={styles.deckCounter}>• {newsTicker.length}</span>
            </div>
          </div>
          <div className={styles.deckTabs}>
            {NEWS_CHANNELS.map(ch => (
              <button
                key={ch.id}
                className={`${styles.deckTab} ${activeChannel === ch.id ? styles.deckTabActive : ''}`}
                onClick={() => setActiveChannel(ch.id)}
              >
                {ch.name}
              </button>
            ))}
          </div>
          <div className={styles.deckBody}>
            <div className={styles.newsPlayer}>
              {currentChannel?.ytId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${currentChannel.ytId}?autoplay=0&mute=1`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={currentChannel.name}
                />
              ) : (
                <div className={styles.newsPlayerOverlay}>
                  <span className={`material-symbols-outlined ${styles.newsPlayIcon}`}>live_tv</span>
                  {currentChannel?.name || 'Channel'} — Coming Soon
                </div>
              )}
            </div>
            <div className={styles.newsTicker}>
              {newsTicker.map((item, i) => (
                <div key={i} className={styles.newsTickerItem}>
                  <span className={styles.newsTickerBullet} />
                  <span className={styles.newsTickerText}>
                    {item.breaking && <span className={styles.breakingTag}>BREAKING</span>}
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
