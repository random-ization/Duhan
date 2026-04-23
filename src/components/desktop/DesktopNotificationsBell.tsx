import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { NOTIFICATIONS, type NotificationDto } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { formatNotificationTime } from '../../utils/notificationFormat';
import { KT } from '../mobile/ksoft/ksoft';

export function DesktopNotificationsBell({
  enabled = true,
}: Readonly<{
  enabled?: boolean;
}>) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [open, setOpen] = useState(false);

  const unreadCount = useQuery(NOTIFICATIONS.getUnreadCount, enabled ? {} : 'skip') ?? 0;
  const recentNotifications = useQuery(
    NOTIFICATIONS.listRecent,
    enabled && open ? { limit: 10 } : 'skip'
  );
  const markRead = useMutation(NOTIFICATIONS.markRead);
  const markAllRead = useMutation(NOTIFICATIONS.markAllRead);
  const dismissNotification = useMutation(NOTIFICATIONS.dismiss);

  const openNotification = async (notification: NotificationDto) => {
    try {
      if (!notification.readAt) {
        await markRead({ id: notification.id });
      }
    } catch {
      // Non-blocking.
    }
    if (notification.linkPath) {
      navigate(notification.linkPath);
    }
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-label={t('notifications.open', { defaultValue: 'Notifications' })}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          border: `1px solid ${KT.line}`,
          background: KT.card,
          color: KT.ink,
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          boxShadow: KT.shSm,
          position: 'relative',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: 7,
              right: 7,
              width: 8,
              height: 8,
              borderRadius: 4,
              background: KT.crimson,
              boxShadow: `0 0 0 2px ${KT.card}`,
            }}
          />
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 48,
            width: 320,
            maxHeight: 420,
            overflowY: 'auto',
            borderRadius: 18,
            border: `1px solid ${KT.line}`,
            background: KT.card,
            boxShadow: KT.shLg,
            padding: 8,
            zIndex: 50,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px 10px',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                color: KT.sub,
              }}
            >
              {t('notifications.title', { defaultValue: 'Notifications' })}
            </span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead({})}
                style={{
                  border: 'none',
                  background: 'none',
                  color: KT.crimson,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {t('notifications.markAll', { defaultValue: 'Mark all read' })}
              </button>
            ) : null}
          </div>

          {recentNotifications === undefined ? (
            <div style={{ color: KT.sub, fontSize: 12, padding: '10px 8px' }}>
              {t('common.loading', { defaultValue: 'Loading…' })}
            </div>
          ) : recentNotifications.length === 0 ? (
            <div style={{ color: KT.sub, fontSize: 12, padding: '10px 8px' }}>
              {t('notifications.empty', { defaultValue: "You're all caught up." })}
            </div>
          ) : (
            recentNotifications.map(notification => (
              <div
                key={notification.id}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  borderRadius: 12,
                  background: notification.readAt ? 'transparent' : `${KT.pink}33`,
                  padding: '9px 10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => void openNotification(notification)}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    margin: 0,
                    textAlign: 'left',
                    minWidth: 0,
                    flex: 1,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: KT.ink }}>
                    {notification.title}
                  </div>
                  <div style={{ fontSize: 12, color: KT.sub, marginTop: 2 }}>
                    {notification.body}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: KT.sub,
                      marginTop: 4,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    {formatNotificationTime(notification.createdAt, defaultLabel =>
                      t('time.now', { defaultValue: defaultLabel })
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void dismissNotification({ id: notification.id })}
                  aria-label={t('notifications.dismiss', { defaultValue: 'Dismiss' })}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: KT.sub,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    lineHeight: 1,
                    padding: '2px 4px',
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
