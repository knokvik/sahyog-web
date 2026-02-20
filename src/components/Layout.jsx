import { Outlet, NavLink } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar, toggleTheme, selectTheme } from '../store/slices/uiSlice';
import { useMe } from '../api/hooks';
import styles from './Layout.module.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/sos', label: 'SOS Alerts', icon: 'sos', highlight: true },
  { to: '/disasters', label: 'Disaster Zones', icon: 'flood' },
  { to: '/volunteers', label: 'Volunteers', icon: 'group' },
  { to: '/shelters', label: 'Shelters', icon: 'night_shelter' },
  { to: '/missing', label: 'Missing Persons', icon: 'person_search' },
  { to: '/users', label: 'User Management', icon: 'admin_panel_settings' },
  { to: '/server', label: 'Server Monitor', icon: 'monitor_heart' },
];

export function Layout() {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((s) => s.ui.sidebarOpen);
  const theme = useSelector(selectTheme);
  const { data: me } = useMe();
  const { user: clerkUser } = useUser();
  const role = me?.role ?? '—';

  const displayName = clerkUser
    ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.primaryEmailAddress?.emailAddress || 'Admin User'
    : 'Admin User';

  const roleLabelMap = {
    'org:admin': 'System Admin',
    'org:volunteer_head': 'Volunteer Head',
    'org:volunteer': 'Volunteer',
    'org:member': 'Member',
    'org:user': 'User',
  };

  return (
    <div className={styles.wrapper}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <img src="../assets/favicon.svg" style={{ width: '1.5rem', height: '1.5rem' }} />
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
            <div className={styles.searchBox}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>search</span>
              <input
                type="text"
                placeholder="Search incidents, units..."
                className={styles.searchInput}
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
            <button type="button" className={styles.headerIcon} aria-label="Notifications">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
              <span className={styles.notifDot} />
            </button>
            <button type="button" className={styles.headerIcon} aria-label="Settings">
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

        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
