import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar, toggleTheme, selectTheme } from '../store/slices/uiSlice';
import io from 'socket.io-client';
import { useMe } from '../api/hooks';
import { SearchResultsPopup } from './SearchResultsPopup';
import { SettingsPanel } from './SettingsPanel';
import { NotificationsPanel } from './NotificationsPanel';
import BrandIcon from '../assets/favicon.svg';
import styles from './Layout.module.css';

const navItems = [
  { to: '/', label: 'Home', icon: 'home', highlight: true },
  { to: '/orchestrator', label: 'Orchestrator', icon: 'cell_tower', highlight: true },
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', highlight: true },
  { to: '/zones', label: 'Zone Control', icon: 'hub', highlight: true },
  { to: '/escalations', label: 'Escalations', icon: 'priority_high', highlight: true },
  { to: '/map', label: 'Deployment Map', icon: 'map', highlight: true },
  { to: '/coordinators', label: 'Coordinators', icon: 'insights' },
  { to: '/reports', label: 'Reports', icon: 'summarize' },
  { to: '/needs', label: 'Needs / SOS', icon: 'sos' },
  { to: '/disasters', label: 'Disaster Zones', icon: 'flood' },
  { to: '/relief', label: 'Relief Coordination', icon: 'volunteer_activism' },
  { to: '/resources', label: 'Resources', icon: 'inventory_2' },
  { to: '/missing', label: 'Missing Persons', icon: 'person_search' },
  { to: '/users', label: 'User Management', icon: 'admin_panel_settings' },
  { to: '/server', label: 'Server Monitor', icon: 'monitor_heart' },
  { to: '/live-map', label: 'Legacy Live Map', icon: 'radar' },
];

export function Layout() {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);
  const theme = useSelector(selectTheme);
  const { data: me } = useMe();
  const { user: clerkUser } = useUser();
  const role = me?.role ?? '—';
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  // Socket listener to auto-open notifications panel on orchestrator signals
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('orchestrator:update', (payload) => {
      // Auto-open notifications panel when a new dispatch/signal triggers
      setIsNotificationsOpen(true);
      // Optional: Add to a global notification array state if you build out the panel more
    });

    return () => socket.disconnect();
  }, []);

  const displayName = clerkUser
    ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.primaryEmailAddress?.emailAddress || 'Admin User'
    : 'Admin User';

  const roleLabelMap = {
    'admin': 'System Admin',
    'coordinator': 'Coordinator',
    'volunteer': 'Volunteer',
    'organization': 'Organization',
  };

  return (
    <div className={styles.wrapper}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <img src={BrandIcon} style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
          {sidebarOpen && (
            <h2 className={styles.brandName}>ResQConnect</h2>
          )}
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {sidebarOpen && <span className={styles.navLabel}>NAVIGATION</span>}
          {navItems.map(({ to, label, icon, highlight }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''} ${highlight ? styles.navHighlight : ''}`
              }
              end={to === '/'}
              title={label}
            >
              <span className={`material-symbols-outlined ${styles.navIcon}`}>{icon}</span>
              {sidebarOpen && <span className={styles.navText}>{label}</span>}
              {highlight && sidebarOpen && (
                <span className={styles.navDot} />
              )}
            </NavLink>
          ))}
        </nav>

        {/* User at bottom */}
        <div className={styles.userSection}>
          {sidebarOpen ? (
            <div className={styles.userInfo}>
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: { avatarBox: { width: '36px', height: '36px' } },
                }}
              />
              <div className={styles.userMeta}>
                <span className={styles.userName}>{displayName}</span>
                <span className={styles.userRole}>{roleLabelMap[role] || role}</span>
              </div>
            </div>
          ) : (
            <div className={styles.userCollapsed}>
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: { avatarBox: { width: '32px', height: '32px' } },
                }}
              />
            </div>
          )}
        </div>
      </aside>

      <main className={styles.main}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.menuBtn}
              onClick={() => dispatch(toggleSidebar())}
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>menu</span>
            </button>
            <div className={styles.searchBox} ref={searchContainerRef} style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>search</span>
              <input
                type="text"
                placeholder="Search incidents, units..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
              />
              <SearchResultsPopup
                query={searchQuery}
                isVisible={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
              />
            </div>
          </div>
          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.headerIcon}
              onClick={() => dispatch(toggleTheme())}
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button type="button" className={styles.headerIcon} aria-label="Notifications" onClick={() => setIsNotificationsOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
              <span className={styles.notifDot} />
            </button>
            <button type="button" className={styles.headerIcon} aria-label="Settings" onClick={() => setIsSettingsOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
            </button>
            <div className={styles.divider} />
            <div className={styles.headerUser}>
              <div className={styles.headerAvatar}>
                <UserButton
                  afterSignOutUrl="/sign-in"
                  appearance={{
                    elements: { avatarBox: { width: '32px', height: '32px' } },
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Live News Ticker */}
        <div className={styles.newsTickerWrapper}>
          <div className={styles.newsTickerBadge}>
            <span className={styles.pulseDot}></span>
            LIVE NEWS
          </div>
          <div className={styles.newsTickerContent}>
            <div className={styles.newsTickerTrack}>
              <span>🚨 NDRF teams deployed to Sector 4 affected by flash floods.</span>
              <span className={styles.tickerSeparator}>|</span>
              <span>⚠️ Heavy rainfall alert issued for the coastal regions over the next 48 hours.</span>
              <span className={styles.tickerSeparator}>|</span>
              <span>🚁 Medical supplies airdropped in remote areas.</span>
              <span className={styles.tickerSeparator}>|</span>
              <span>🟢 Communication mesh networking is fully active in rural offline zones.</span>
              {/* Duplicate for infinite scroll loop */}
              <span className={styles.tickerSeparator}>|</span>
              <span>🚨 NDRF teams deployed to Sector 4 affected by flash floods.</span>
              <span className={styles.tickerSeparator}>|</span>
              <span>⚠️ Heavy rainfall alert issued for the coastal regions over the next 48 hours.</span>
              <span className={styles.tickerSeparator}>|</span>
              <span>🚁 Medical supplies airdropped in remote areas.</span>
              <span className={styles.tickerSeparator}>|</span>
              <span>🟢 Communication mesh networking is fully active in rural offline zones.</span>
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <Outlet />
        </div>
      </main>

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </div>
  );
}
