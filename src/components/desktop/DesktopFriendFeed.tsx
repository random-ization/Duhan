import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';

import { COMMUNITY } from '../../utils/convexRefs';
import { KT } from '../mobile/ksoft/ksoft';

type LikeOverride = {
  liked: boolean;
  likeCount: number;
};

export function DesktopFriendFeed() {
  const activities = useQuery(COMMUNITY.getRecentFriendActivity, { limit: 6 });
  const likeActivity = useMutation(COMMUNITY.likeActivity);
  const unlikeActivity = useMutation(COMMUNITY.unlikeActivity);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<Record<string, LikeOverride>>({});

  const rows = useMemo(() => {
    if (!activities) return [];
    return activities.map(item => {
      const key = String(item.activityId);
      const override = overrides[key];
      return {
        ...item,
        key,
        liked: override?.liked ?? item.likedByMe,
        likeCount: override?.likeCount ?? item.likeCount,
      };
    });
  }, [activities, overrides]);

  const toggleLike = async (activityId: string) => {
    const key = String(activityId);
    if (pending[key]) return;
    const source = rows.find(item => item.key === key);
    if (!source) return;

    const nextLiked = !source.liked;
    const nextLikeCount = Math.max(0, source.likeCount + (nextLiked ? 1 : -1));
    setPending(current => ({ ...current, [key]: true }));
    setOverrides(current => ({
      ...current,
      [key]: { liked: nextLiked, likeCount: nextLikeCount },
    }));

    try {
      const result = nextLiked
        ? await likeActivity({ activityId, kind: 'event' })
        : await unlikeActivity({ activityId, kind: 'event' });
      setOverrides(current => ({
        ...current,
        [key]: { liked: result.liked, likeCount: result.likeCount },
      }));
    } catch {
      setOverrides(current => ({
        ...current,
        [key]: { liked: source.liked, likeCount: source.likeCount },
      }));
    } finally {
      setPending(current => ({ ...current, [key]: false }));
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
        Community
      </p>
      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        {activities === undefined ? (
          <div style={{ fontSize: 12, color: KT.sub }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 12, color: KT.sub }}>No activity yet.</div>
        ) : (
          rows.map(item => (
            <div
              key={item.key}
              style={{
                border: `1px solid ${KT.line}`,
                borderRadius: 12,
                padding: '8px 10px',
                background: KT.bg2,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: KT.ink }}>{item.actorName}</div>
              <div style={{ fontSize: 12, color: KT.sub, marginTop: 2 }}>
                {item.module} · {item.eventName}
              </div>
              <button
                type="button"
                onClick={() => void toggleLike(String(item.activityId))}
                disabled={pending[item.key]}
                style={{
                  marginTop: 6,
                  border: `1px solid ${KT.line}`,
                  background: item.liked ? `${KT.crimson}18` : KT.card,
                  color: item.liked ? KT.crimson : KT.ink2,
                  borderRadius: 999,
                  padding: '3px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {item.liked ? '♥' : '♡'} {item.likeCount}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
