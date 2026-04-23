import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '../../../convex/_generated/dataModel';
import { PARTNERSHIPS } from '../../utils/convexRefs';
import { KT } from '../mobile/ksoft/ksoft';

export function DesktopStudyBuddyCard() {
  const activePartnership = useQuery(PARTNERSHIPS.getActivePartnership, {});
  const pendingPartnerships = useQuery(PARTNERSHIPS.listPending, {});
  const acceptPartnership = useMutation(PARTNERSHIPS.acceptPartnership);
  const declinePartnership = useMutation(PARTNERSHIPS.declinePartnership);
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});

  const incoming = (pendingPartnerships ?? []).filter(item => item.role === 'invitee');

  const runAction = async (
    partnershipId: Id<'studyPartnerships'>,
    action: 'accept' | 'decline'
  ) => {
    if (pendingActions[partnershipId]) return;
    setPendingActions(current => ({ ...current, [partnershipId]: true }));
    try {
      if (action === 'accept') {
        await acceptPartnership({ partnershipId });
      } else {
        await declinePartnership({ partnershipId });
      }
    } finally {
      setPendingActions(current => ({ ...current, [partnershipId]: false }));
    }
  };

  return (
    <section
      style={{
        border: `1px solid ${KT.line}`,
        background: KT.card,
        borderRadius: 18,
        padding: 16,
        boxShadow: KT.shSm,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: KT.sub,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        Study buddy
      </p>

      {activePartnership ? (
        <div style={{ marginTop: 10, display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: KT.ink }}>
            {activePartnership.partner.name ?? 'Learner'}
          </div>
          <div style={{ fontSize: 12, color: KT.sub }}>
            {activePartnership.sharedMinutesToday} min today · streak{' '}
            {activePartnership.combinedStreak}
          </div>
        </div>
      ) : null}

      {!activePartnership && incoming.length > 0 ? (
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {incoming.map(item => {
            const key = String(item.id);
            return (
              <div
                key={key}
                style={{
                  border: `1px solid ${KT.line}`,
                  borderRadius: 12,
                  background: KT.bg2,
                  padding: '8px 10px',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: KT.ink }}>
                  {item.partner.name ?? 'Learner'}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    disabled={pendingActions[key]}
                    onClick={() => void runAction(item.id, 'accept')}
                    style={{
                      border: 'none',
                      borderRadius: 8,
                      background: KT.crimson,
                      color: KT.card,
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={pendingActions[key]}
                    onClick={() => void runAction(item.id, 'decline')}
                    style={{
                      border: `1px solid ${KT.line}`,
                      borderRadius: 8,
                      background: KT.card,
                      color: KT.ink,
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {!activePartnership && incoming.length === 0 ? (
        <div style={{ marginTop: 10, fontSize: 12, color: KT.sub }}>No active buddy.</div>
      ) : null}
    </section>
  );
}
