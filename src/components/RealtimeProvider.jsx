import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';

const RealtimeContext = createContext(null);

export const useRealtime = () => useContext(RealtimeContext);

export function RealtimeProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [toasts, setToasts] = useState([]);
    const { isLoaded, isSignedIn } = useAuth();

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        const newSocket = io(window.location.origin, {
            path: '/socket.io',
            transports: ['websocket'],
        });

        newSocket.on('connect', () => {
            console.log('Realtime System: Connected to backend socket');
        });

        newSocket.on('new_sos_alert', (data) => {
            console.log('Realtime System: EMERGENCY ALERT RECEIVED', data);

            // Add a new toast with an ID and timestamp
            const id = `toast-${Date.now()}-${data.id}`;
            const newToast = {
                id,
                alert: data,
                timestamp: new Date(),
            };

            setToasts(prev => [...prev, newToast]);

            // Auto-remove after 10 seconds
            setTimeout(() => {
                removeToast(id);
            }, 10000);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [isLoaded, isSignedIn]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <RealtimeContext.Provider value={{ socket, toasts, removeToast }}>
            {children}
            {/* Global SOS Overlay */}
            <div style={{
                position: 'fixed',
                top: '24px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxWidth: '400px',
                width: '100%'
            }}>
                {toasts.map(toast => (
                    <EmergencyToast
                        key={toast.id}
                        toast={toast}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </RealtimeContext.Provider>
    );
}

function EmergencyToast({ toast, onClose }) {
    const { alert } = toast;

    return (
        <div style={{
            background: 'rgba(239, 68, 68, 0.95)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.2), 0 8px 10px -6px rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            animation: 'toastIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Pulsing background glow */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)',
                animation: 'pulse 2s infinite'
            }} />

            <div style={{
                width: '48px',
                height: '48px',
                background: 'white',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <span className="material-symbols-outlined" style={{
                    color: '#ef4444',
                    fontSize: '28px',
                    fontVariationSettings: "'FILL' 1"
                }}>emergency</span>
            </div>

            <div style={{ flex: 1, zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                        Emergency SOS triggered
                    </span>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0', display: 'flex' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                </div>
                <h4 style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', lineHeight: '1.2' }}>
                    {alert.reporter_name || 'Anonymous User'}
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>phone</span>
                    {alert.reporter_phone || 'N/A'}
                </p>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes toastIn {
                    from { transform: translateX(100%) scale(0.9); opacity: 0; }
                    to { transform: translateX(0) scale(1); opacity: 1; }
                }
                @keyframes pulse {
                    0% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                    100% { opacity: 0.3; transform: scale(1); }
                }
            `}} />
        </div>
    );
}
