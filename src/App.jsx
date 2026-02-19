import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SosList } from './pages/SosList';
import { DisastersList } from './pages/DisastersList';
import { VolunteersList } from './pages/VolunteersList';
import { SheltersList } from './pages/SheltersList';
import { MissingList } from './pages/MissingList';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  console.warn('Missing VITE_CLERK_PUBLISHABLE_KEY. Set it in .env for Clerk auth.');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const clerkAppearance = {
  variables: {
    colorPrimary: '#34b27b',
    colorText: '#0f172a',
    colorBackground: '#ffffff',
    colorInputBackground: '#f6f8f7',
    colorInputText: '#0f172a',
    borderRadius: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  elements: {
    rootBox: {
      width: '100%',
      maxWidth: '400px',
    },
    card: {
      border: '1px solid #e2e8f0',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.04)',
      borderRadius: '1.5rem',
    },
    headerTitle: {
      fontSize: '20px',
      fontWeight: '800',
    },
    formButtonPrimary: {
      backgroundColor: '#34b27b',
      fontSize: '14px',
      fontWeight: '700',
      borderRadius: '12px',
      textTransform: 'none',
      padding: '11px 16px',
    },
    formFieldInput: {
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      fontSize: '14px',
    },
    footer: { display: 'none' },
    socialButtonsBlockButton: {
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
    },
  },
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="sos" element={<SosList />} />
        <Route path="disasters" element={<DisastersList />} />
        <Route path="volunteers" element={<VolunteersList />} />
        <Route path="shelters" element={<SheltersList />} />
        <Route path="missing" element={<MissingList />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function SignInPage() {
  return (
    <div style={authStyles.wrapper}>
      <div style={authStyles.left}>
        <div style={authStyles.leftInner}>
          {/* Brand */}
          <div style={authStyles.brand}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#34b27b', fontWeight: 700 }}>emergency</span>
            <h1 style={authStyles.brandText}>RESQCONNECT</h1>
          </div>

          <p style={authStyles.tagline}>Emergency Response Command Portal</p>

          <h2 style={authStyles.heroTitle}>
            Rapid coordination.<br />
            Real-time intelligence.<br />
            Lives saved.
          </h2>

          <p style={authStyles.heroDesc}>
            Secure access for emergency responders, volunteers, and coordinators.
            Monitor SOS alerts, deploy teams, and manage disaster zones from a unified command center.
          </p>

          <div style={authStyles.features}>
            <div style={authStyles.featureItem}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#34b27b' }}>sos</span>
              <span>Real-time SOS Monitoring</span>
            </div>
            <div style={authStyles.featureItem}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3b82f6' }}>group</span>
              <span>Volunteer Management</span>
            </div>
            <div style={authStyles.featureItem}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f59e0b' }}>flood</span>
              <span>Disaster Zone Tracking</span>
            </div>
            <div style={authStyles.featureItem}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ef4444' }}>security</span>
              <span>End-to-end Encryption</span>
            </div>
          </div>
        </div>
      </div>
      <div style={authStyles.right}>
        <SignIn
          signUpUrl="/sign-up"
          afterSignInUrl="/"
          signInFallbackRedirectUrl="/"
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div style={authStyles.wrapper}>
      <div style={authStyles.left}>
        <div style={authStyles.leftInner}>
          <div style={authStyles.brand}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#34b27b', fontWeight: 700 }}>emergency</span>
            <h1 style={authStyles.brandText}>RESQCONNECT</h1>
          </div>

          <p style={authStyles.tagline}>Emergency Response Command Portal</p>

          <h2 style={authStyles.heroTitle}>
            Join the response<br />
            network today.
          </h2>

          <p style={authStyles.heroDesc}>
            Create your account to access the disaster response platform.
            Coordinate with teams, manage resources, and save lives.
          </p>

          <div style={authStyles.features}>
            <div style={authStyles.featureItem}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#34b27b' }}>verified</span>
              <span>Verified Access</span>
            </div>
            <div style={authStyles.featureItem}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3b82f6' }}>lock</span>
              <span>256-bit Encryption</span>
            </div>
          </div>
        </div>
      </div>
      <div style={authStyles.right}>
        <SignUp
          signInUrl="/sign-in"
          afterSignUpUrl="/"
          signUpFallbackRedirectUrl="/"
          appearance={clerkAppearance}
        />
      </div>
    </div>
  );
}

const authStyles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  left: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    background: '#ffffff',
    borderRight: '1px solid #e2e8f0',
  },
  leftInner: {
    maxWidth: '480px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '24px',
  },
  brandText: {
    fontSize: '18px',
    fontWeight: '900',
    letterSpacing: '-0.5px',
    color: '#0f172a',
    margin: 0,
  },
  tagline: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    margin: '0 0 32px',
  },
  heroTitle: {
    fontSize: '34px',
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: '1.15',
    margin: '0 0 16px',
    letterSpacing: '-0.5px',
  },
  heroDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: '1.65',
    margin: '0 0 36px',
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    background: '#f6f8f7',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    background: '#f6f8f7',
  },
};

export default function App() {
  return (
    <ClerkProvider
      publishableKey={publishableKey || ''}
      afterSignOutUrl="/sign-in"
    >
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    </ClerkProvider>
  );
}
