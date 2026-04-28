import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Globe2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { isValidLanguage } from '../../../components/LanguageRouter';
import { Card, HanjaSeal, KT, SectionHead } from '../../../components/mobile/ksoft/ksoft';
import { safeSetLocalStorageItem } from '../../../utils/browserStorage';
import type { ProfileLabels } from '../types';

interface ProfileSettingsTabProps {
  labels: ProfileLabels;
}

type NotificationPrefs = {
  dailyReminder: boolean;
  examCountdown: boolean;
  communityActivity: boolean;
};

type SettingsLanguage = 'zh' | 'en' | 'vi' | 'mn';

type LanguageOption = {
  code: SettingsLanguage;
  label: string;
  nativeName: string;
  seal: string;
};

type NotificationItem = {
  key: keyof NotificationPrefs;
  title: string;
  description: string;
};

type SettingsCopy = {
  notificationTitle: string;
  notificationSub: string;
  languageTitle: string;
  languageSub: string;
  productTitle: string;
  productSub: string;
  dailyReminder: string;
  dailyReminderDesc: string;
  examCountdown: string;
  examCountdownDesc: string;
  communityActivity: string;
  communityActivityDesc: string;
  selected: string;
  on: string;
  off: string;
};

const NOTIFICATION_PREFS_KEY = 'profile_notification_prefs_v1';

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  dailyReminder: true,
  examCountdown: true,
  communityActivity: false,
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
    productTitle: '学习偏好',
    productSub: '默认使用移动端 KSoft 学习界面。',
    dailyReminder: '每日学习提醒',
    dailyReminderDesc: '复习队列等待时提醒你继续学习。',
    examCountdown: 'TOPIK 倒计时',
    examCountdownDesc: '考试前接收关键节点提醒。',
    communityActivity: '好友动态',
    communityActivityDesc: '学习伙伴有新动态时提醒你。',
    selected: '已选择',
    on: '开',
    off: '关',
  },
  en: {
    notificationTitle: 'Notifications',
    notificationSub: 'Control reminders, exam nudges, and friend activity.',
    languageTitle: 'Language',
    languageSub: 'Switch the interface language immediately.',
    productTitle: 'Study Defaults',
    productSub: 'Use the mobile KSoft learning experience by default.',
    dailyReminder: 'Daily study reminders',
    dailyReminderDesc: 'Get a reminder when your review queue is waiting.',
    examCountdown: 'TOPIK countdown',
    examCountdownDesc: 'Receive nudges before upcoming TOPIK exams.',
    communityActivity: 'Friend activity',
    communityActivityDesc: 'Get notified when study partners post progress.',
    selected: 'Selected',
    on: 'ON',
    off: 'OFF',
  },
  vi: {
    notificationTitle: 'Thông báo',
    notificationSub: 'Điều chỉnh nhắc học, đếm ngược thi và hoạt động bạn bè.',
    languageTitle: 'Ngôn ngữ',
    languageSub: 'Đổi ngôn ngữ giao diện ngay lập tức.',
    productTitle: 'Mặc định học tập',
    productSub: 'Ưu tiên trải nghiệm học KSoft trên di động.',
    dailyReminder: 'Nhắc học hằng ngày',
    dailyReminderDesc: 'Nhắc khi hàng đợi ôn tập đang chờ.',
    examCountdown: 'Đếm ngược TOPIK',
    examCountdownDesc: 'Nhận nhắc trước các kỳ thi TOPIK.',
    communityActivity: 'Hoạt động bạn bè',
    communityActivityDesc: 'Báo khi bạn học có tiến độ mới.',
    selected: 'Đã chọn',
    on: 'Bật',
    off: 'Tắt',
  },
  mn: {
    notificationTitle: 'Мэдэгдэл',
    notificationSub: 'Суралцах сануулга, шалгалтын тоолол, найзуудын идэвхийг тохируулна.',
    languageTitle: 'Хэл',
    languageSub: 'Интерфэйсийн хэлийг шууд солино.',
    productTitle: 'Суралцах тохиргоо',
    productSub: 'Гар утасны KSoft суралцах туршлагыг үндсэн болгоно.',
    dailyReminder: 'Өдөр тутмын сануулга',
    dailyReminderDesc: 'Давтах зүйл хүлээж байвал сануулна.',
    examCountdown: 'TOPIK тоолол',
    examCountdownDesc: 'TOPIK шалгалтын өмнө сануулга авна.',
    communityActivity: 'Найзуудын идэвх',
    communityActivityDesc: 'Суралцах хамтрагч шинэ ахиц гаргахад мэдэгдэнэ.',
    selected: 'Сонгосон',
    on: 'Асаалттай',
    off: 'Унтраалттай',
  },
};

function parseNotificationPrefs(raw: string | null): NotificationPrefs {
  if (!raw) return DEFAULT_NOTIFICATION_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return DEFAULT_NOTIFICATION_PREFS;
    }
    const candidate = parsed as Record<string, unknown>;
    return {
      dailyReminder:
        typeof candidate.dailyReminder === 'boolean'
          ? candidate.dailyReminder
          : DEFAULT_NOTIFICATION_PREFS.dailyReminder,
      examCountdown:
        typeof candidate.examCountdown === 'boolean'
          ? candidate.examCountdown
          : DEFAULT_NOTIFICATION_PREFS.examCountdown,
      communityActivity:
        typeof candidate.communityActivity === 'boolean'
          ? candidate.communityActivity
          : DEFAULT_NOTIFICATION_PREFS.communityActivity,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

function normalizeLanguage(value: string | undefined): SettingsLanguage {
  const normalized = (value || 'zh').split('-')[0];
  return normalized === 'zh' || normalized === 'en' || normalized === 'vi' || normalized === 'mn'
    ? normalized
    : 'zh';
}

export const ProfileSettingsTab: React.FC<ProfileSettingsTabProps> = ({ labels }) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const firstSegment = location.pathname.split('/').find(Boolean);
  const activeLanguage = normalizeLanguage(
    firstSegment && isValidLanguage(firstSegment)
      ? firstSegment
      : i18n.resolvedLanguage || i18n.language
  );
  const copy = COPY_BY_LANG[activeLanguage];

  const getInitialPrefs = (): NotificationPrefs => {
    if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
    const saved = window.localStorage.getItem(NOTIFICATION_PREFS_KEY);
    return parseNotificationPrefs(saved);
  };

  const [prefs, setPrefs] = useState<NotificationPrefs>(getInitialPrefs);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const notificationItems = useMemo<NotificationItem[]>(
    () => [
      {
        key: 'dailyReminder',
        title: copy.dailyReminder,
        description: copy.dailyReminderDesc,
      },
      {
        key: 'examCountdown',
        title: copy.examCountdown,
        description: copy.examCountdownDesc,
      },
      {
        key: 'communityActivity',
        title: copy.communityActivity,
        description: copy.communityActivityDesc,
      },
    ],
    [copy]
  );

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
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
              {notificationItems.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => togglePref(item.key)}
                  className="w-full text-left"
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
                      style={{ background: prefs[item.key] ? KT.butter : KT.line2, color: KT.ink }}
                    >
                      <Bell size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-black" style={{ color: KT.ink }}>
                        {item.title}
                      </span>
                      <span
                        className="mt-1 block text-xs leading-relaxed"
                        style={{ color: KT.sub }}
                      >
                        {item.description}
                      </span>
                    </span>
                    <span
                      className="inline-flex h-8 min-w-[54px] shrink-0 items-center justify-center rounded-full border text-xs font-black"
                      style={{
                        borderColor: prefs[item.key] ? KT.ink : KT.line,
                        background: prefs[item.key] ? KT.ink : KT.card,
                        color: prefs[item.key] ? KT.card : KT.sub,
                      }}
                    >
                      {prefs[item.key] ? copy.on : copy.off}
                    </span>
                  </div>
                </button>
              ))}
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

      <section>
        <SectionHead kanji="設" title={copy.productTitle} />
        <div className="mt-3">
          <Card pad={18}>
            <div className="flex items-center gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                style={{ background: KT.pink, color: KT.crimson }}
              >
                <Sparkles size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-black" style={{ color: KT.ink }}>
                  KSoft Mobile
                </div>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: KT.sub }}>
                  {copy.productSub}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};
