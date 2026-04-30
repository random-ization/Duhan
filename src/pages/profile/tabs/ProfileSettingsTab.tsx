import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  Check,
  Globe2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { isValidLanguage } from '../../../components/LanguageRouter';
import { Card, HanjaSeal, KT, SectionHead } from '../../../components/mobile/ksoft/ksoft';
import { safeSetLocalStorageItem } from '../../../utils/browserStorage';
import type { ProfileLabels } from '../types';
import {
  NOTIFICATIONS,
  type NotificationDto,
  type NotificationPreferencesDto,
} from '../../../utils/convexRefs';
import { notify } from '../../../utils/notify';
import { formatNotificationTime } from '../../../utils/notificationFormat';
import {
  ensurePushSubscription,
  getPushPermissionState,
  hasPushRegistration,
  requestPushPermission,
  unsubscribeCurrentPushSubscription,
} from '../../../pwa/pushNotifications';

interface ProfileSettingsTabProps {
  labels: ProfileLabels;
}

type SettingsLanguage = 'zh' | 'en' | 'vi' | 'mn';

type LanguageOption = {
  code: SettingsLanguage;
  label: string;
  nativeName: string;
  seal: string;
};

type SettingsCopy = {
  notificationTitle: string;
  notificationSub: string;
  languageTitle: string;
  languageSub: string;
  totalNotifications: string;
  totalNotificationsDesc: string;
  pwaPush: string;
  pwaPushDesc: string;
  dailyReminder: string;
  dailyReminderDesc: string;
  examCountdown: string;
  examCountdownDesc: string;
  communityActivity: string;
  communityActivityDesc: string;
  quietHours: string;
  quietHoursDesc: string;
  reminderTime: string;
  timezone: string;
  selected: string;
  on: string;
  off: string;
  unsupportedPush: string;
  deniedPush: string;
  permissionPending: string;
  recentTitle: string;
  recentEmpty: string;
  markAllRead: string;
  viewAll: string;
  viewLess: string;
  dismiss: string;
  saved: string;
  saveFailed: string;
};

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: 'zh', label: 'Chinese', nativeName: '中文', seal: '中' },
  { code: 'en', label: 'English', nativeName: 'English', seal: '英' },
  { code: 'vi', label: 'Vietnamese', nativeName: 'Tiếng Việt', seal: '越' },
  { code: 'mn', label: 'Mongolian', nativeName: 'Монгол', seal: '蒙' },
];

const COPY_BY_LANG: Record<SettingsLanguage, SettingsCopy> = {
  zh: {
    notificationTitle: '提醒与通知',
    notificationSub: '控制学习提醒、考试倒计时和好友动态。',
    languageTitle: '语言设置',
    languageSub: '切换界面语言，当前页面会立即更新。',
    totalNotifications: '通知总开关',
    totalNotificationsDesc: '关闭后将暂停所有站内提醒。',
    pwaPush: 'PWA 推送',
    pwaPushDesc: '离开页面后仍可接收通知（需浏览器授权）。',
    dailyReminder: '每日学习提醒',
    dailyReminderDesc: '在你设定的时间提醒你处理待复习内容。',
    examCountdown: 'TOPIK 倒计时',
    examCountdownDesc: '考试前 7 天、1 天和 1 小时提醒。',
    communityActivity: '好友动态',
    communityActivityDesc: '好友/小组学习动态以摘要形式提醒。',
    quietHours: '免打扰时段',
    quietHoursDesc: '免打扰开启后，普通通知将在该时段静默。',
    reminderTime: '提醒时间',
    timezone: '时区',
    selected: '已选择',
    on: '开',
    off: '关',
    unsupportedPush: '当前环境不支持推送通知。',
    deniedPush: '浏览器已拒绝通知权限，请在系统设置中开启。',
    permissionPending: '尚未授予通知权限。',
    recentTitle: '通知中心',
    recentEmpty: '暂无通知',
    markAllRead: '全部标记已读',
    viewAll: '查看全部通知',
    viewLess: '收起',
    dismiss: '删除',
    saved: '通知设置已更新',
    saveFailed: '更新通知设置失败，请稍后重试',
  },
  en: {
    notificationTitle: 'Notifications',
    notificationSub: 'Control reminders, exam nudges, and friend activity.',
    languageTitle: 'Language',
    languageSub: 'Switch the interface language immediately.',
    totalNotifications: 'Notifications master switch',
    totalNotificationsDesc: 'Disable to pause all in-app alerts.',
    pwaPush: 'PWA push',
    pwaPushDesc: 'Receive alerts when the app is in background.',
    dailyReminder: 'Daily study reminders',
    dailyReminderDesc: 'Remind me at my preferred time when reviews are pending.',
    examCountdown: 'TOPIK countdown',
    examCountdownDesc: 'Notify me 7 days, 1 day and 1 hour before exams.',
    communityActivity: 'Friend activity',
    communityActivityDesc: 'Friend/group activity is sent as a digest.',
    quietHours: 'Quiet hours',
    quietHoursDesc: 'Normal-priority notifications are muted during this window.',
    reminderTime: 'Reminder time',
    timezone: 'Time zone',
    selected: 'Selected',
    on: 'ON',
    off: 'OFF',
    unsupportedPush: 'Push notifications are not supported in this environment.',
    deniedPush: 'Notification permission is denied. Enable it in browser settings.',
    permissionPending: 'Notification permission not granted yet.',
    recentTitle: 'Notification center',
    recentEmpty: 'No notifications yet.',
    markAllRead: 'Mark all read',
    viewAll: 'View all notifications',
    viewLess: 'Show less',
    dismiss: 'Dismiss',
    saved: 'Notification settings updated',
    saveFailed: 'Could not update notification settings',
  },
  vi: {
    notificationTitle: 'Thông báo',
    notificationSub: 'Điều chỉnh nhắc học, đếm ngược thi và hoạt động bạn bè.',
    languageTitle: 'Ngôn ngữ',
    languageSub: 'Đổi ngôn ngữ giao diện ngay lập tức.',
    totalNotifications: 'Công tắc thông báo',
    totalNotificationsDesc: 'Tắt để dừng toàn bộ thông báo trong ứng dụng.',
    pwaPush: 'Đẩy PWA',
    pwaPushDesc: 'Nhận thông báo ngay cả khi ứng dụng ở nền.',
    dailyReminder: 'Nhắc học hằng ngày',
    dailyReminderDesc: 'Nhắc vào thời gian bạn chọn khi còn nội dung cần ôn.',
    examCountdown: 'Đếm ngược TOPIK',
    examCountdownDesc: 'Nhắc trước kỳ thi 7 ngày, 1 ngày và 1 giờ.',
    communityActivity: 'Hoạt động bạn bè',
    communityActivityDesc: 'Hoạt động bạn bè/nhóm sẽ gửi theo bản tóm tắt.',
    quietHours: 'Giờ yên lặng',
    quietHoursDesc: 'Thông báo ưu tiên thường sẽ im lặng trong khung giờ này.',
    reminderTime: 'Giờ nhắc',
    timezone: 'Múi giờ',
    selected: 'Đã chọn',
    on: 'Bật',
    off: 'Tắt',
    unsupportedPush: 'Môi trường hiện tại không hỗ trợ thông báo đẩy.',
    deniedPush: 'Trình duyệt đã chặn quyền thông báo. Hãy bật lại trong cài đặt.',
    permissionPending: 'Chưa cấp quyền thông báo.',
    recentTitle: 'Trung tâm thông báo',
    recentEmpty: 'Chưa có thông báo',
    markAllRead: 'Đánh dấu đã đọc',
    viewAll: 'Xem tất cả thông báo',
    viewLess: 'Thu gọn',
    dismiss: 'Xóa',
    saved: 'Đã cập nhật cài đặt thông báo',
    saveFailed: 'Không thể cập nhật cài đặt thông báo',
  },
  mn: {
    notificationTitle: 'Мэдэгдэл',
    notificationSub: 'Суралцах сануулга, шалгалтын тоолол, найзуудын идэвхийг тохируулна.',
    languageTitle: 'Хэл',
    languageSub: 'Интерфэйсийн хэлийг шууд солино.',
    totalNotifications: 'Ерөнхий мэдэгдэл',
    totalNotificationsDesc: 'Унтраавал апп доторх бүх мэдэгдэл түр зогсоно.',
    pwaPush: 'PWA push',
    pwaPushDesc: 'Апп хаалттай байсан ч мэдэгдэл хүлээн авна.',
    dailyReminder: 'Өдөр тутмын сануулга',
    dailyReminderDesc: 'Давтах контент үлдсэн үед таны сонгосон цагаар сануулна.',
    examCountdown: 'TOPIK тоолол',
    examCountdownDesc: 'Шалгалтаас 7 хоног, 1 өдөр, 1 цагийн өмнө сануулна.',
    communityActivity: 'Найзуудын идэвх',
    communityActivityDesc: 'Найз/бүлгийн идэвхийг өдрийн товчоогоор мэдэгдэнэ.',
    quietHours: 'Тайван цаг',
    quietHoursDesc: 'Энэ хугацаанд ердийн түвшний мэдэгдэл дуугүй байна.',
    reminderTime: 'Сануулгын цаг',
    timezone: 'Цагийн бүс',
    selected: 'Сонгосон',
    on: 'Асаалттай',
    off: 'Унтраалттай',
    unsupportedPush: 'Энэ орчин push мэдэгдлийг дэмжихгүй.',
    deniedPush: 'Хөтөч мэдэгдлийн зөвшөөрлийг хаасан байна.',
    permissionPending: 'Мэдэгдлийн зөвшөөрөл олгоогүй байна.',
    recentTitle: 'Мэдэгдлийн төв',
    recentEmpty: 'Одоогоор мэдэгдэл алга',
    markAllRead: 'Бүгдийг уншсанд тэмдэглэх',
    viewAll: 'Бүх мэдэгдэл харах',
    viewLess: 'Хураах',
    dismiss: 'Устгах',
    saved: 'Мэдэгдлийн тохиргоо шинэчлэгдлээ',
    saveFailed: 'Мэдэгдлийн тохиргоог шинэчилж чадсангүй',
  },
};

function normalizeLanguage(value: string | undefined): SettingsLanguage {
  const normalized = (value || 'zh').split('-')[0];
  return normalized === 'zh' || normalized === 'en' || normalized === 'vi' || normalized === 'mn'
    ? normalized
    : 'zh';
}

function timeZoneLabel() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
  } catch {
    return 'Asia/Seoul';
  }
}

export const ProfileSettingsTab: React.FC<ProfileSettingsTabProps> = ({ labels }) => {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const firstSegment = location.pathname.split('/').find(Boolean);
  const activeLanguage = normalizeLanguage(
    firstSegment && isValidLanguage(firstSegment)
      ? firstSegment
      : i18n.resolvedLanguage || i18n.language
  );
  const copy = COPY_BY_LANG[activeLanguage];

  const preferences = useQuery(NOTIFICATIONS.getPreferences, {});
  const recentNotifications = useQuery(NOTIFICATIONS.listRecent, { limit: 15 });
  const vapidPublicKey = useQuery(NOTIFICATIONS.getVapidPublicKey, {});
  const updatePreferences = useMutation(NOTIFICATIONS.updatePreferences);
  const subscribePush = useMutation(NOTIFICATIONS.subscribePush);
  const unsubscribePush = useMutation(NOTIFICATIONS.unsubscribePush);
  const markRead = useMutation(NOTIFICATIONS.markRead);
  const markAllRead = useMutation(NOTIFICATIONS.markAllRead);
  const dismissNotification = useMutation(NOTIFICATIONS.dismiss);

  const [localPrefs, setLocalPrefs] = useState<NotificationPreferencesDto | null>(null);
  const [permissionState, setPermissionState] = useState(getPushPermissionState());
  const [saving, setSaving] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const timezoneSyncedRef = useRef(false);

  useEffect(() => {
    if (!preferences) return;
    setLocalPrefs(preferences);
  }, [preferences]);

  useEffect(() => {
    setPermissionState(getPushPermissionState());
  }, []);

  const notificationItems = useMemo(
    () => [
      {
        key: 'learning' as const,
        title: copy.dailyReminder,
        description: copy.dailyReminderDesc,
      },
      {
        key: 'exam' as const,
        title: copy.examCountdown,
        description: copy.examCountdownDesc,
      },
      {
        key: 'social' as const,
        title: copy.communityActivity,
        description: copy.communityActivityDesc,
      },
    ],
    [copy]
  );

  const renderNotificationTypeIcon = (notification: Pick<NotificationDto, 'kind' | 'category'>) => {
    if (notification.category === 'learning') return <BookOpen size={13} />;
    if (notification.category === 'exam') return <ShieldAlert size={13} />;
    if (notification.kind === 'friend_request') return <UserRoundPlus size={13} />;
    if (notification.category === 'social') return <Users size={13} />;
    return <Bell size={13} />;
  };

  const applyPreferencePatch = async (
    patch: Parameters<typeof updatePreferences>[0],
    successToast = false
  ) => {
    if (!localPrefs) return;
    setSaving(true);
    try {
      const next = await updatePreferences(patch);
      setLocalPrefs(next);
      if (successToast) {
        notify.success(copy.saved);
      }
    } catch {
      notify.error(copy.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const toggleMaster = async () => {
    if (!localPrefs) return;
    await applyPreferencePatch({ enabled: !localPrefs.enabled }, true);
  };

  const toggleCategory = async (key: 'learning' | 'exam' | 'social') => {
    if (!localPrefs) return;
    const next = !localPrefs.categories[key];
    await applyPreferencePatch({ categories: { [key]: next } }, true);
  };

  const handleToggleQuietHours = async () => {
    if (!localPrefs) return;
    await applyPreferencePatch(
      { quietHours: { enabled: !localPrefs.quietHours.enabled } },
      true
    );
  };

  const handleTogglePwaPush = async () => {
    if (!localPrefs) return;
    const next = !localPrefs.channels.pwa;
    if (!next) {
      try {
        await unsubscribePush({});
        await unsubscribeCurrentPushSubscription();
      } catch {
        // best-effort cleanup
      }
      await applyPreferencePatch({ channels: { pwa: false } }, true);
      return;
    }

    if (permissionState === 'unsupported') {
      notify.error(copy.unsupportedPush);
      return;
    }
    const hasRegistration = await hasPushRegistration();
    if (!hasRegistration) {
      notify.error(copy.unsupportedPush);
      return;
    }
    const permission =
      permissionState === 'granted' ? permissionState : await requestPushPermission();
    setPermissionState(permission);
    if (permission !== 'granted') {
      notify.error(copy.deniedPush);
      return;
    }
    if (!vapidPublicKey) {
      notify.error(copy.saveFailed);
      return;
    }

    try {
      const subscription = await ensurePushSubscription(vapidPublicKey);
      if (!subscription) throw new Error('SUBSCRIPTION_UNAVAILABLE');
      const payload = subscription.toJSON();
      if (
        !payload.endpoint ||
        !payload.keys ||
        typeof payload.keys.p256dh !== 'string' ||
        typeof payload.keys.auth !== 'string'
      ) {
        throw new Error('INVALID_SUBSCRIPTION_PAYLOAD');
      }
      await subscribePush({
        subscription: {
          endpoint: payload.endpoint,
          expirationTime:
            typeof payload.expirationTime === 'number' ? payload.expirationTime : null,
          keys: {
            p256dh: payload.keys.p256dh,
            auth: payload.keys.auth,
          },
        },
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });
      await applyPreferencePatch({ channels: { pwa: true } }, true);
    } catch {
      notify.error(copy.saveFailed);
    }
  };

  const handleReminderTimeChange = async (value: string) => {
    await applyPreferencePatch({ dailyReminderLocalTime: value }, true);
  };

  const handleQuietHoursTimeChange = async (field: 'start' | 'end', value: string) => {
    await applyPreferencePatch({ quietHours: { [field]: value } }, true);
  };

  const openNotification = async (notification: NotificationDto) => {
    if (!notification.readAt) {
      try {
        await markRead({ id: notification.id });
      } catch {
        // non-blocking
      }
    }
    if (notification.linkPath) {
      navigate(notification.linkPath);
    }
  };

  const handleDismissNotification = async (notificationId: NotificationDto['id']) => {
    try {
      await dismissNotification({ id: notificationId });
    } catch {
      // non-blocking
    }
  };

  const handleLanguageSelect = (nextLanguage: SettingsLanguage) => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments[0] && isValidLanguage(segments[0])) {
      segments[0] = nextLanguage;
    } else {
      segments.unshift(nextLanguage);
    }
    const nextPath = `/${segments.join('/')}${location.search}${location.hash}`;
    safeSetLocalStorageItem('preferredLanguage', nextLanguage);
    safeSetLocalStorageItem('preferredLanguageSource', 'user');
    void i18n.changeLanguage(nextLanguage);
    navigate(nextPath, { replace: true });
  };

  useEffect(() => {
    if (!localPrefs) return;
    if (timezoneSyncedRef.current) return;
    const localTz = timeZoneLabel();
    timezoneSyncedRef.current = true;
    if (localPrefs.timezone !== localTz) {
      void (async () => {
        try {
          const next = await updatePreferences({ timezone: localTz });
          setLocalPrefs(next);
        } catch {
          // keep user flow non-blocking
        }
      })();
    }
  }, [localPrefs, updatePreferences]);

  if (!localPrefs) {
    return (
      <div className="space-y-3">
        <Card pad={18}>
          <div className="text-sm font-semibold" style={{ color: KT.sub }}>
            Loading...
          </div>
        </Card>
      </div>
    );
  }

  const permissionLabel =
    permissionState === 'unsupported'
      ? copy.unsupportedPush
      : permissionState === 'denied'
        ? copy.deniedPush
        : permissionState === 'granted'
          ? `${copy.selected}: Push`
          : copy.permissionPending;

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section>
        <SectionHead kanji="告" title={copy.notificationTitle} />
        <div className="mt-3">
          <Card pad={18}>
            <div className="flex items-start gap-3">
              <HanjaSeal c="鈴" size={46} bg={KT.butterDeep} />
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-black" style={{ color: KT.ink }}>
                  {copy.notificationTitle}
                </div>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: KT.sub }}>
                  {copy.notificationSub}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => void toggleMaster()}
                className="w-full text-left"
                disabled={saving}
                style={{
                  borderRadius: 22,
                  border: `1px solid ${KT.line}`,
                  background: KT.bg,
                  padding: 14,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                    style={{ background: localPrefs.enabled ? KT.butter : KT.line2, color: KT.ink }}
                  >
                    <Bell size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black" style={{ color: KT.ink }}>
                      {copy.totalNotifications}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed" style={{ color: KT.sub }}>
                      {copy.totalNotificationsDesc}
                    </span>
                  </span>
                  <span
                    className="inline-flex h-8 min-w-[54px] shrink-0 items-center justify-center rounded-full border text-xs font-black"
                    style={{
                      borderColor: localPrefs.enabled ? KT.ink : KT.line,
                      background: localPrefs.enabled ? KT.ink : KT.card,
                      color: localPrefs.enabled ? KT.card : KT.sub,
                    }}
                  >
                    {localPrefs.enabled ? copy.on : copy.off}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => void handleTogglePwaPush()}
                className="w-full text-left"
                disabled={saving || !localPrefs.enabled}
                style={{
                  borderRadius: 22,
                  border: `1px solid ${KT.line}`,
                  background: KT.bg,
                  padding: 14,
                  opacity: localPrefs.enabled ? 1 : 0.65,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                    style={{
                      background: localPrefs.channels.pwa ? KT.mint : KT.line2,
                      color: KT.ink,
                    }}
                  >
                    <Smartphone size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black" style={{ color: KT.ink }}>
                      {copy.pwaPush}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed" style={{ color: KT.sub }}>
                      {copy.pwaPushDesc}
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold" style={{ color: KT.sub }}>
                      {permissionLabel}
                    </span>
                  </span>
                  <span
                    className="inline-flex h-8 min-w-[54px] shrink-0 items-center justify-center rounded-full border text-xs font-black"
                    style={{
                      borderColor: localPrefs.channels.pwa ? KT.ink : KT.line,
                      background: localPrefs.channels.pwa ? KT.ink : KT.card,
                      color: localPrefs.channels.pwa ? KT.card : KT.sub,
                    }}
                  >
                    {localPrefs.channels.pwa ? copy.on : copy.off}
                  </span>
                </div>
              </button>

              <div
                style={{
                  borderRadius: 22,
                  border: `1px solid ${KT.line}`,
                  background: KT.bg,
                  padding: 14,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                      style={{ background: KT.line2, color: KT.ink }}
                    >
                      <ShieldCheck size={18} />
                    </span>
                    <div>
                      <div className="text-[15px] font-black" style={{ color: KT.ink }}>
                        {copy.quietHours}
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: KT.sub }}>
                        {copy.quietHoursDesc}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToggleQuietHours()}
                    disabled={saving || !localPrefs.enabled}
                    className="inline-flex h-8 min-w-[54px] items-center justify-center rounded-full border px-3 text-xs font-black"
                    style={{
                      borderColor: localPrefs.quietHours.enabled ? KT.ink : KT.line,
                      background: localPrefs.quietHours.enabled ? KT.ink : KT.card,
                      color: localPrefs.quietHours.enabled ? KT.card : KT.sub,
                    }}
                  >
                    {localPrefs.quietHours.enabled ? copy.on : copy.off}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={localPrefs.quietHours.start}
                    disabled={saving || !localPrefs.enabled || !localPrefs.quietHours.enabled}
                    onChange={event => void handleQuietHoursTimeChange('start', event.target.value)}
                    className="h-10 rounded-xl border px-3 text-sm font-semibold"
                    style={{
                      borderColor: KT.line,
                      background: KT.card,
                      color: KT.ink,
                    }}
                  />
                  <input
                    type="time"
                    value={localPrefs.quietHours.end}
                    disabled={saving || !localPrefs.enabled || !localPrefs.quietHours.enabled}
                    onChange={event => void handleQuietHoursTimeChange('end', event.target.value)}
                    className="h-10 rounded-xl border px-3 text-sm font-semibold"
                    style={{
                      borderColor: KT.line,
                      background: KT.card,
                      color: KT.ink,
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  borderRadius: 22,
                  border: `1px solid ${KT.line}`,
                  background: KT.bg,
                  padding: 14,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-black" style={{ color: KT.ink }}>
                      {copy.reminderTime}
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: KT.sub }}>
                      {copy.dailyReminderDesc}
                    </div>
                  </div>
                  <input
                    type="time"
                    value={localPrefs.dailyReminderLocalTime}
                    onChange={event => void handleReminderTimeChange(event.target.value)}
                    disabled={saving || !localPrefs.enabled || !localPrefs.categories.learning}
                    className="h-10 rounded-xl border px-3 text-sm font-semibold"
                    style={{
                      borderColor: KT.line,
                      background: KT.card,
                      color: KT.ink,
                    }}
                  />
                </div>
                <div className="mt-2 text-xs font-semibold" style={{ color: KT.sub }}>
                  {copy.timezone}: {localPrefs.timezone || timeZoneLabel()}
                </div>
              </div>

              {notificationItems.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => void toggleCategory(item.key)}
                  className="w-full text-left"
                  disabled={saving || !localPrefs.enabled}
                  style={{
                    borderRadius: 22,
                    border: `1px solid ${KT.line}`,
                    background: KT.bg,
                    padding: 14,
                    opacity: localPrefs.enabled ? 1 : 0.65,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                      style={{
                        background: localPrefs.categories[item.key] ? KT.butter : KT.line2,
                        color: KT.ink,
                      }}
                    >
                      <Bell size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-black" style={{ color: KT.ink }}>
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed" style={{ color: KT.sub }}>
                        {item.description}
                      </span>
                    </span>
                    <span
                      className="inline-flex h-8 min-w-[54px] shrink-0 items-center justify-center rounded-full border text-xs font-black"
                      style={{
                        borderColor: localPrefs.categories[item.key] ? KT.ink : KT.line,
                        background: localPrefs.categories[item.key] ? KT.ink : KT.card,
                        color: localPrefs.categories[item.key] ? KT.card : KT.sub,
                      }}
                    >
                      {localPrefs.categories[item.key] ? copy.on : copy.off}
                    </span>
                  </div>
                </button>
              ))}

              <div
                style={{
                  borderRadius: 22,
                  border: `1px solid ${KT.line}`,
                  background: KT.bg,
                  padding: 14,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[15px] font-black" style={{ color: KT.ink }}>
                    {copy.recentTitle}
                  </div>
                  <button
                    type="button"
                    onClick={() => void markAllRead({})}
                    disabled={saving}
                    className="text-xs font-black"
                    style={{
                      border: 'none',
                      background: 'none',
                      color: KT.crimson,
                      cursor: 'pointer',
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {copy.markAllRead}
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {recentNotifications === undefined ? (
                    <div className="rounded-2xl px-3 py-2 text-xs" style={{ color: KT.sub }}>
                      {t('common.loading', { defaultValue: 'Loading…' })}
                    </div>
                  ) : recentNotifications.length === 0 ? (
                    <div className="rounded-2xl px-3 py-2 text-xs" style={{ color: KT.sub }}>
                      {copy.recentEmpty}
                    </div>
                  ) : (
                    recentNotifications
                      .slice(0, showAllNotifications ? 20 : 6)
                      .map(notification => (
                      <div
                        key={notification.id}
                        className="flex items-start gap-2 rounded-2xl px-3 py-2"
                        style={{
                          border: `1px solid ${KT.line}`,
                          background: notification.readAt
                            ? KT.card
                            : notification.priority === 'high'
                              ? `${KT.butter}55`
                              : `${KT.pink}33`,
                        }}
                      >
                        <span
                          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                          style={{ border: `1px solid ${KT.line}`, color: KT.sub }}
                        >
                          {renderNotificationTypeIcon(notification)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void openNotification(notification)}
                          className="min-w-0 flex-1 text-left"
                          style={{ border: 'none', background: 'none', padding: 0, margin: 0 }}
                        >
                          <div className="truncate text-[13px] font-black" style={{ color: KT.ink }}>
                            {notification.title}
                          </div>
                          <div className="mt-0.5 text-xs leading-snug" style={{ color: KT.sub }}>
                            {notification.body}
                          </div>
                          <div className="mt-1 text-[10px] font-semibold" style={{ color: KT.sub }}>
                            {formatNotificationTime(notification.createdAt, defaultLabel =>
                              t('time.now', { defaultValue: defaultLabel })
                            )}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDismissNotification(notification.id)}
                          aria-label={copy.dismiss}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: KT.sub,
                            cursor: 'pointer',
                            padding: 2,
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {recentNotifications && recentNotifications.length > 6 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllNotifications(current => !current)}
                    className="mt-3 w-full rounded-xl border px-3 py-2 text-xs font-black"
                    style={{
                      borderColor: KT.line,
                      background: KT.card,
                      color: KT.ink,
                    }}
                  >
                    {showAllNotifications ? copy.viewLess : copy.viewAll}
                  </button>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <SectionHead kanji="語" title={labels.profile?.displayLanguage || copy.languageTitle} />
        <div className="mt-3">
          <Card pad={18}>
            <div className="flex items-start gap-3">
              <HanjaSeal c="文" size={46} bg={KT.indigo} />
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-black" style={{ color: KT.ink }}>
                  {copy.languageTitle}
                </div>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: KT.sub }}>
                  {labels.profile?.languageDesc || copy.languageSub}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              {LANGUAGE_OPTIONS.map(option => {
                const selected = option.code === activeLanguage;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => handleLanguageSelect(option.code)}
                    aria-pressed={selected}
                    className="w-full text-left"
                    style={{
                      borderRadius: 24,
                      border: `1px solid ${selected ? KT.crimson : KT.line}`,
                      background: selected ? KT.bg2 : KT.bg,
                      padding: 14,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <HanjaSeal
                        c={option.seal}
                        size={42}
                        bg={selected ? KT.crimson : KT.mintDeep}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-black" style={{ color: KT.ink }}>
                          {option.nativeName}
                        </span>
                        <span className="mt-0.5 block text-xs font-bold" style={{ color: KT.sub }}>
                          {option.label}
                        </span>
                      </span>
                      {selected ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black"
                          style={{ background: KT.butter, color: '#73561A' }}
                        >
                          <Check size={13} />
                          {copy.selected}
                        </span>
                      ) : (
                        <Globe2 size={18} style={{ color: KT.subLight }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};
