import { useState } from 'react';
import { useOrgRequests, useAcceptOrgRequest, useRejectOrgRequest, useAssignCoordinator, useOrgVolunteers } from '../../api/useOrg';
import s from './Org.module.css';

const STATUS_COLORS = {
  pending: { bg: 'var(--badge-amber-bg)', fg: 'var(--badge-amber-fg)' },
  accepted: { bg: 'var(--badge-green-bg)', fg: 'var(--badge-green-fg)' },
  rejected: { bg: 'var(--badge-red-bg)', fg: 'var(--badge-red-fg)' },
  cancelled: { bg: 'var(--badge-muted-bg)', fg: 'var(--badge-muted-fg)' },
};

function formatTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function RequestCard({ req, onAccept, onReject, onAssignCoord, acceptMutation, rejectMutation }) {
  const [showAccept, setShowAccept] = useState(false);
  const [contributions, setContributions] = useState(
    (req.items || []).map(item => ({ item_id: item.id, quantity_committed: Math.min(100, item.quantity_needed), resource_type: item.resource_type }))
  );
  const [showCoord, setShowCoord] = useState(false);
  const [coordId, setCoordId] = useState('');
  const { data: volunteers = [] } = useOrgVolunteers();

  const coordinators = (Array.isArray(volunteers) ? volunteers : []).filter(v => (v.role || '').toLowerCase() === 'coordinator');

  const updateContribution = (idx, val) => {
    const next = [...contributions];
    next[idx].quantity_committed = val;
    setContributions(next);
  };

  const isPending = req.assignment_status === 'pending';
  const isAccepted = req.assignment_status === 'accepted';
  const statusColor = STATUS_COLORS[req.assignment_status] || STATUS_COLORS.pending;

  return (
    <div style={{
      padding: 20, borderRadius: 14, background: 'var(--color-surface)',
      border: '1px solid var(--color-border)', marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ef4444' }}>flood</span>
            {req.disaster_name}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            {req.disaster_type} · Severity {req.disaster_severity || '—'} · Requested by {req.requested_by}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {formatTime(req.created_at)}
          </div>
          {req.notes && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>{req.notes}</p>}
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
          background: statusColor.bg, color: statusColor.fg, textTransform: 'uppercase',
        }}>
          {req.assignment_status}
        </span>
      </div>

      {/* Resource items */}
      <div style={{ marginBottom: 14 }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Required Resources</h4>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(req.items || []).map(item => (
            <div key={item.id} style={{
              padding: '8px 14px', borderRadius: 8, background: 'var(--color-bg)',
              border: '1px solid var(--color-border)', fontSize: 13,
            }}>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.resource_type}</span>
              <span style={{ marginLeft: 8, color: 'var(--color-primary)', fontWeight: 700 }}>{item.quantity_needed}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isPending && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setShowAccept(!showAccept)} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#34b27b', color: '#fff', fontWeight: 600, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
            Accept & Commit Resources
          </button>
          <button onClick={() => onReject(req.assignment_id)} disabled={rejectMutation.isPending} style={{
            padding: '9px 18px', borderRadius: 8, border: '1px solid var(--color-border)',
            cursor: 'pointer', background: 'var(--color-surface)', color: '#ef4444',
            fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
            Reject
          </button>
        </div>
      )}

      {/* Accept form */}
      {showAccept && isPending && (
        <div style={{ marginTop: 14, padding: 16, borderRadius: 10, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Commit your stock for each resource:
          </h4>
          {contributions.map((c, idx) => (
            <div key={c.item_id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{c.resource_type}</span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{c.quantity_committed}</span>
              </div>
              <input type="range" min={0} max={req.items[idx]?.quantity_needed || 500}
                value={c.quantity_committed} onChange={e => updateContribution(idx, +e.target.value)}
                style={{ width: '100%', accentColor: '#34b27b' }} />
            </div>
          ))}
          <button onClick={() => onAccept(req.assignment_id, contributions)}
            disabled={acceptMutation.isPending}
            style={{
              marginTop: 8, padding: '10px 20px', borderRadius: 8, border: 'none',
              cursor: 'pointer', background: '#34b27b', color: '#fff', fontWeight: 700, fontSize: 13,
            }}>
            {acceptMutation.isPending ? 'Submitting...' : 'Confirm & Accept'}
          </button>
        </div>
      )}

      {/* Assign Coordinator per Zone (after accepting) */}
      {isAccepted && req.zones && req.zones.length > 0 && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>Assign Coordinator to Zones</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {req.zones.map(zone => (
              <div key={zone.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 8, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: zone.severity === 'red' ? '#ef4444' : zone.severity === 'yellow' ? '#f59e0b' : '#3b82f6' }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{zone.name}</span>
                </div>
                
                {zone.assigned_coordinator_name ? (
                  <div style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--color-info-10)', border: '1px solid var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--color-primary)' }}>check_circle</span>
                    <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>{zone.assigned_coordinator_name}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <select id={`coord-${zone.id}`} defaultValue=""
                      style={{
                        flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)',
                        background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontSize: 12,
                      }}>
                      <option value="">Select coordinator...</option>
                      {coordinators.map(c => (
                        <option key={c.id} value={c.id} disabled={c.is_assigned}>
                          {c.full_name || c.email} {c.is_assigned ? '(Busy)' : ''}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => {
                        const selectEl = document.getElementById(`coord-${zone.id}`);
                        if (selectEl && selectEl.value) {
                          onAssignCoord(req.assignment_id, selectEl.value, zone.id);
                        }
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: '#34b27b', color: '#fff', fontWeight: 600, fontSize: 12,
                      }}>
                      Assign
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {coordinators.length === 0 && (
            <p style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)' }}>
              No coordinators linked to your organization yet. Add coordinators via your Volunteers page.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function OrgRequests() {
  const { data: requests = [], isLoading, error } = useOrgRequests();
  const acceptMutation = useAcceptOrgRequest();
  const rejectMutation = useRejectOrgRequest();
  const coordMutation = useAssignCoordinator();

  const handleAccept = (assignmentId, contributions) => {
    acceptMutation.mutate({ assignmentId, contributions });
  };
  const handleReject = (assignmentId) => {
    if (confirm('Are you sure you want to reject this request?')) {
      rejectMutation.mutate(assignmentId);
    }
  };
  const handleAssignCoord = (assignmentId, coordinator_id, zone_id) => {
    coordMutation.mutate({ assignmentId, coordinator_id, zone_id });
  };

  const allReqs = Array.isArray(requests) ? requests : [];
  const pendingCount = allReqs.filter(r => r.assignment_status === 'pending').length;

  if (isLoading) return <div className={s.pageTitle} style={{ padding: 40 }}>Loading requests...</div>;
  if (error) return <div style={{ padding: 40, color: '#ef4444' }}>Error: {error.message}</div>;

  return (
    <div style={{ padding: '28px 32px' }}>
      <h2 className={s.pageTitleSm} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--color-primary)' }}>assignment_ind</span>
        Disaster Requests
        {pendingCount > 0 && (
          <span style={{
            padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: '#fef3c7', color: '#92400e', marginLeft: 8,
          }}>
            {pendingCount} pending
          </span>
        )}
      </h2>
      <p className={s.pageDesc}>Review and respond to disaster relief requests from the admin. Accept to commit resources, then assign a coordinator.</p>

      {allReqs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3 }}>inbox</span>
          <p style={{ marginTop: 8 }}>No requests received yet</p>
        </div>
      ) : (
        allReqs.map(req => (
          <RequestCard key={req.assignment_id} req={req}
            onAccept={handleAccept} onReject={handleReject} onAssignCoord={handleAssignCoord}
            acceptMutation={acceptMutation} rejectMutation={rejectMutation}
          />
        ))
      )}
    </div>
  );
}
