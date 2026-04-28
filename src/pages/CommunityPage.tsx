import React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import type { Id } from '../../convex/_generated/dataModel';
import type { CommunityActivityDto } from '../../convex/community';
import type { FriendSearchItemDto } from '../../convex/friends';
import type { LeaderboardEntry } from '../../convex/leaderboard';
import { useTranslation } from 'react-i18next';
import { COMMUNITY, FRIENDS, LEADERBOARD } from '../utils/convexRefs';
import { Chip, KT, PageShell } from '../components/mobile/ksoft/ksoft';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { notify } from '../utils/notify';

type LikeOverride = {
  liked: boolean;
  likeCount: number;
};

type ActivityTone = {
  emoji: string;
  tag: string;
  tone: 'pink' | 'mint' | 'butter' | 'lilac' | 'muted';
  bg: string;
};

type FriendRelationOverride = 'already_requested' | 'already_friends';

function getCommunityTone(module: string, language: string): ActivityTone {
  const lower = module.toLowerCase();
  if (lower.includes('vocab') || lower.includes('review')) {
    return {
      emoji: '📝',
      tag: language.startsWith('zh')
        ? '词汇'
        : language.startsWith('vi')
          ? 'Từ vựng'
          : language.startsWith('mn')
            ? 'Үгс'
            : 'Vocab',
      tone: 'pink',
      bg: '#FDE8E5',
    };
  }
  if (lower.includes('grammar')) {
    return {
      emoji: '📘',
      tag: language.startsWith('zh')
        ? '语法'
        : language.startsWith('vi')
          ? 'Ngữ pháp'
          : language.startsWith('mn')
            ? 'Дүрэм'
            : 'Grammar',
      tone: 'mint',
      bg: '#E7F3ED',
    };
  }
  if (lower.includes('podcast') || lower.includes('listening')) {
    return {
      emoji: '🎧',
      tag: language.startsWith('zh')
        ? '听力'
        : language.startsWith('vi')
          ? 'Nghe'
          : language.startsWith('mn')
            ? 'Сонсох'
            : 'Listening',
      tone: 'butter',
      bg: '#FFF4DB',
    };
  }
  if (lower.includes('topik') || lower.includes('exam')) {
    return {
      emoji: '🎯',
      tag: 'TOPIK',
      tone: 'lilac',
      bg: '#EEE8FF',
    };
  }
  return {
    emoji: '📚',
    tag: language.startsWith('zh')
      ? '学习'
      : language.startsWith('vi')
        ? 'Học tập'
        : language.startsWith('mn')
          ? 'Суралцах'
          : 'Study',
    tone: 'muted',
    bg: KT.bg2,
  };
}

function formatCommunityAction(item: CommunityActivityDto, language: string): string {
  const count = Math.max(1, item.itemCount || 0);
  const minutes = Math.max(1, Math.round((item.durationSec || 0) / 60));
  const isZh = language.startsWith('zh');
  const isVi = language.startsWith('vi');
  const isMn = language.startsWith('mn');

  if (item.eventName === 'review_completed') {
    if (isZh) return `完成复习 ${count} 项`;
    if (isVi) return `Hoàn thành ôn tập ${count} mục`;
    if (isMn) return `${count} давтлага дуусгав`;
    return `Completed ${count} review items`;
  }
  if (item.eventName === 'session_completed') {
    if (isZh) return `完成学习 ${minutes} 分钟`;
    if (isVi) return `Hoàn thành ${minutes} phút học`;
    if (isMn) return `${minutes} минут хичээллэв`;
    return `Studied for ${minutes} min`;
  }
  if (item.eventName === 'content_completed') {
    if (isZh) return '完成内容学习';
    if (isVi) return 'Đã hoàn thành nội dung học';
    if (isMn) return 'Хичээлийн контент дуусгав';
    return 'Finished a learning unit';
  }
  if (item.score !== null) {
    if (isZh) return `TOPIK 模考得分 ${item.score}`;
    if (isVi) return `Điểm TOPIK: ${item.score}`;
    if (isMn) return `TOPIK оноо: ${item.score}`;
    return `TOPIK score ${item.score}`;
  }
  if (isZh) return '提交了考试';
  if (isVi) return 'Đã nộp bài thi';
  if (isMn) return 'Шалгалт өглөө';
  return 'Submitted an exam';
}

function formatCommunityTime(eventAt: number, language: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - eventAt) / 1000));
  if (diffSec < 60) {
    if (language.startsWith('zh')) return '刚刚';
    if (language.startsWith('vi')) return 'Vừa xong';
    if (language.startsWith('mn')) return 'Саяхан';
    return 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    if (language.startsWith('zh')) return `${diffMin} 分钟前`;
    if (language.startsWith('vi')) return `${diffMin} phút trước`;
    if (language.startsWith('mn')) return `${diffMin} минутын өмнө`;
    return `${diffMin}m ago`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    if (language.startsWith('zh')) return `${diffHour} 小时前`;
    if (language.startsWith('vi')) return `${diffHour} giờ trước`;
    if (language.startsWith('mn')) return `${diffHour} цагийн өмнө`;
    return `${diffHour}h ago`;
  }
  const diffDay = Math.floor(diffHour / 24);
  if (language.startsWith('zh')) return `${diffDay} 天前`;
  if (language.startsWith('vi')) return `${diffDay} ngày trước`;
  if (language.startsWith('mn')) return `${diffDay} хоногийн өмнө`;
  return `${diffDay}d ago`;
}

function formatCountdown(seconds: number, language: string): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (language.startsWith('zh')) return `${days}天 ${hours}小时后结束`;
  if (language.startsWith('vi')) return `Kết thúc sau ${days} ngày ${hours} giờ`;
  if (language.startsWith('mn')) return `${days} өдөр ${hours} цагийн дараа дуусна`;
  return `Ends in ${days}d ${hours}h`;
}

function shortName(entry: LeaderboardEntry): string {
  const name = entry.name?.trim();
  return name && name.length > 0 ? name : 'Learner';
}

function getLeagueTierLabel(language: string, tierKey: string): string {
  const key = tierKey.trim().toLowerCase();
  const upper = key.toUpperCase();

  if (language.startsWith('zh')) {
    if (key === 'bronze') return 'BRONZE · 联盟';
    if (key === 'silver') return 'SILVER · 联盟';
    if (key === 'gold') return 'GOLD · 联盟';
    if (key === 'diamond') return 'DIAMOND · 联盟';
    return `${upper} · 联盟`;
  }
  if (language.startsWith('mn')) {
    if (key === 'bronze') return 'BRONZE · Лиг';
    if (key === 'silver') return 'SILVER · Лиг';
    if (key === 'gold') return 'GOLD · Лиг';
    if (key === 'diamond') return 'DIAMOND · Лиг';
    return `${upper} · Лиг`;
  }
  if (language.startsWith('vi')) {
    return `${upper} · League`;
  }
  return `${upper} · League`;
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const localizedNavigate = useLocalizedNavigate();
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const communityActivities = useQuery(COMMUNITY.getRecentFriendActivity, { limit: 30 });
  const weeklyTop = useQuery(LEADERBOARD.getWeeklyTop, { limit: 5 });
  const weeklyOverview = useQuery(LEADERBOARD.getWeeklyOverview, {});
  const friendSummary = useQuery(FRIENDS.getMyFriendSummary, {});
  const myShareLink = useQuery(FRIENDS.getMyShareLink, {});
  const likeActivity = useMutation(COMMUNITY.likeActivity);
  const unlikeActivity = useMutation(COMMUNITY.unlikeActivity);
  const sendRequestByCode = useMutation(FRIENDS.sendRequestByCode);
  const regenerateMyFriendCode = useMutation(FRIENDS.regenerateMyFriendCode);
  const [searchInput, setSearchInput] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const searchUsers = useQuery(
    FRIENDS.searchUsers,
    searchQuery.length >= 2 ? { query: searchQuery, limit: 6 } : 'skip'
  );

  const [likeOverrides, setLikeOverrides] = React.useState<
    Record<string, LikeOverride | undefined>
  >({});
  const [likePending, setLikePending] = React.useState<Record<string, boolean>>({});
  const [friendActionBusy, setFriendActionBusy] = React.useState<Record<string, boolean>>({});
  const [friendRelationOverrides, setFriendRelationOverrides] = React.useState<
    Record<string, FriendRelationOverride | undefined>
  >({});
  const [shareBusy, setShareBusy] = React.useState(false);
  const [shareInlineUrl, setShareInlineUrl] = React.useState<string>('');
  const [shareInlineCopied, setShareInlineCopied] = React.useState(false);
  const [shareInlineMessage, setShareInlineMessage] = React.useState<string>('');
  const [nowTick, setNowTick] = React.useState(() => Date.now());
  const friendSearchCardRef = React.useRef<HTMLDivElement | null>(null);
  const friendSearchInputRef = React.useRef<HTMLInputElement | null>(null);
  const shareInlineInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  React.useEffect(() => {
    const intervalId = globalThis.setInterval(() => {
      setNowTick(Date.now());
    }, 60_000);
    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, []);

  const copy = React.useMemo(() => {
    if (language.startsWith('zh')) {
      return {
        eyebrow: '會 · COMMUNITY',
        title: '学习伙伴',
        rankingTitle: '本周排行',
        rankingPromote: (rank: number) => `前 ${rank} 名升级`,
        friendsTitle: '好友动态',
        loading: '加载中...',
        empty: '暂时还没有好友动态',
        searchPlaceholder: '输入昵称或好友码',
        searchHint: '输入 2 个以上字符开始搜索',
        searchEmpty: '未找到匹配用户',
        searchButton: '加好友',
        requested: '已发送',
        friends: '已是好友',
        share: '分享链接',
        reset: '重置链接',
        group: '创建学习小组',
        groupSoon: '学习小组功能即将上线',
        copied: '好友链接已复制',
        copiedNew: '新链接已生成，旧链接失效',
        copyFailed: '复制失败，已展示链接文本',
        shareReady: '好友链接已生成，请复制',
        resetReady: '已重置链接，请复制新链接',
        copyAction: '复制',
        back: '返回',
        requestSent: '好友请求已发送',
        failed: '操作失败，请稍后再试',
        myCodeLabel: '我的用户码',
        myCodeMissing: '暂无',
        noFriendsTitle: '你还没有好友',
        noFriendsSub: '先添加好友，才能看到好友排行和动态。',
        noFriendsCta: '去添加好友',
      };
    }
    if (language.startsWith('vi')) {
      return {
        eyebrow: '會 · COMMUNITY',
        title: 'Bạn học',
        rankingTitle: 'Xếp hạng tuần',
        rankingPromote: (rank: number) => `Top ${rank} sẽ thăng hạng`,
        friendsTitle: 'Hoạt động bạn bè',
        loading: 'Đang tải...',
        empty: 'Chưa có hoạt động bạn bè',
        searchPlaceholder: 'Nhập tên hoặc mã bạn bè',
        searchHint: 'Nhập ít nhất 2 ký tự để tìm',
        searchEmpty: 'Không tìm thấy người dùng',
        searchButton: 'Kết bạn',
        requested: 'Đã gửi',
        friends: 'Đã là bạn',
        share: 'Chia sẻ link',
        reset: 'Đổi link',
        group: 'Tạo nhóm học',
        groupSoon: 'Tính năng nhóm học sẽ sớm ra mắt',
        copied: 'Đã sao chép link bạn bè',
        copiedNew: 'Đã tạo link mới',
        copyFailed: 'Không thể sao chép, đã hiển thị link',
        shareReady: 'Link bạn bè đã sẵn sàng, hãy sao chép',
        resetReady: 'Đã đổi link, hãy sao chép link mới',
        copyAction: 'Sao chép',
        back: 'Quay lại',
        requestSent: 'Đã gửi lời mời kết bạn',
        failed: 'Thao tác thất bại, hãy thử lại',
        myCodeLabel: 'Mã người dùng',
        myCodeMissing: 'Chưa có',
        noFriendsTitle: 'Bạn chưa có bạn bè',
        noFriendsSub: 'Hãy thêm bạn để xem bảng xếp hạng và hoạt động bạn bè.',
        noFriendsCta: 'Thêm bạn ngay',
      };
    }
    if (language.startsWith('mn')) {
      return {
        eyebrow: '會 · COMMUNITY',
        title: 'Суралцах найзууд',
        rankingTitle: 'Энэ долоо хоногийн чансаа',
        rankingPromote: (rank: number) => `Шилдэг ${rank} нь дэвшинэ`,
        friendsTitle: 'Найзуудын идэвх',
        loading: 'Ачаалж байна...',
        empty: 'Одоогоор найзуудын идэвх алга',
        searchPlaceholder: 'Нэр эсвэл найзын код оруулна уу',
        searchHint: 'Хайхын тулд 2+ тэмдэгт оруулна уу',
        searchEmpty: 'Тохирох хэрэглэгч олдсонгүй',
        searchButton: 'Найз болгох',
        requested: 'Илгээгдсэн',
        friends: 'Аль хэдийн найз',
        share: 'Холбоос хуваалцах',
        reset: 'Холбоос шинэчлэх',
        group: 'Суралцах бүлэг үүсгэх',
        groupSoon: 'Суралцах бүлгийн функц удахгүй нэмэгдэнэ',
        copied: 'Найзын холбоос хууллаа',
        copiedNew: 'Шинэ холбоос үүслээ',
        copyFailed: 'Хуулах боломжгүй, холбоосыг харуулав',
        shareReady: 'Найзын холбоос бэлэн, хуулж авна уу',
        resetReady: 'Холбоос шинэчлэгдлээ, шинэ холбоосоо хуулна уу',
        copyAction: 'Хуулах',
        back: 'Буцах',
        requestSent: 'Найзын хүсэлт илгээгдлээ',
        failed: 'Амжилтгүй боллоо, дахин оролдоно уу',
        myCodeLabel: 'Миний хэрэглэгчийн код',
        myCodeMissing: 'Алга',
        noFriendsTitle: 'Танд одоогоор найз алга',
        noFriendsSub: 'Найз нэмбэл найзуудын чансаа болон идэвх харагдана.',
        noFriendsCta: 'Найз нэмэх',
      };
    }
    return {
      eyebrow: '會 · COMMUNITY',
      title: 'Study Friends',
      rankingTitle: 'Weekly rank',
      rankingPromote: (rank: number) => `Top ${rank} promote`,
      friendsTitle: 'Friend activity',
      loading: 'Loading...',
      empty: 'No friend activity yet',
      searchPlaceholder: 'Search by nickname or friend code',
      searchHint: 'Type at least 2 characters',
      searchEmpty: 'No matching users found',
      searchButton: 'Add',
      requested: 'Sent',
      friends: 'Friends',
      share: 'Share link',
      reset: 'Reset link',
      group: 'Create study group',
      groupSoon: 'Study groups are coming soon',
      copied: 'Friend link copied',
      copiedNew: 'New link generated',
      copyFailed: 'Could not copy; link shown instead',
      shareReady: 'Friend link is ready. Copy it below.',
      resetReady: 'Link was reset. Copy the new link below.',
      copyAction: 'Copy',
      back: 'Back',
      requestSent: 'Friend request sent',
      failed: 'Action failed. Please try again.',
      myCodeLabel: 'My user code',
      myCodeMissing: 'N/A',
      noFriendsTitle: 'You have no friends yet',
      noFriendsSub: 'Add friends first to unlock friend ranking and activity.',
      noFriendsCta: 'Add friends',
    };
  }, [language]);

  const feed = React.useMemo(() => {
    if (!communityActivities) return [];
    return communityActivities.map(item => {
      const key = String(item.activityId);
      const override = likeOverrides[key];
      const tone = getCommunityTone(item.module, language);
      return {
        ...item,
        key,
        tone,
        action: formatCommunityAction(item, language),
        time: formatCommunityTime(item.eventAt, language),
        liked: override?.liked ?? item.likedByMe,
        likeCount: Math.max(0, override?.likeCount ?? item.likeCount),
      };
    });
  }, [communityActivities, language, likeOverrides]);

  const countdownLabel = React.useMemo(() => {
    const weekEndsAt = weeklyOverview?.weekEndsAt;
    if (typeof weekEndsAt !== 'number') return copy.loading;
    const remaining = Math.max(0, Math.floor((weekEndsAt - nowTick) / 1000));
    return formatCountdown(remaining, language);
  }, [copy.loading, language, nowTick, weeklyOverview?.weekEndsAt]);

  const promotionCutoffRank = weeklyOverview?.promotionCutoffRank ?? 10;
  const leagueTierLabel = React.useMemo(
    () => getLeagueTierLabel(language, weeklyOverview?.leagueTierKey ?? 'gold'),
    [language, weeklyOverview?.leagueTierKey]
  );
  const leagueSeal = weeklyOverview?.leagueSeal?.trim() || '盟';
  const myUserCode = myShareLink?.code?.trim() || copy.myCodeMissing;
  const hasFriends = (friendSummary?.mutualCount ?? 0) > 0;
  const friendSummaryLoaded = friendSummary !== undefined;

  const topRows = React.useMemo(() => {
    if (!weeklyTop) return [];
    return weeklyTop.slice(0, 5);
  }, [weeklyTop]);

  const tryLegacyCopy = (text: string): boolean => {
    if (typeof document === 'undefined') return false;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    try {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  };

  const tryCopy = async (text: string): Promise<boolean> => {
    try {
      if (globalThis.navigator.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to legacy copy fallback
    }
    return tryLegacyCopy(text);
  };

  const handleToggleLike = async (activityId: Id<'learning_events'>) => {
    const key = String(activityId);
    if (likePending[key]) return;
    const source = communityActivities?.find(item => String(item.activityId) === key);
    if (!source) return;

    const override = likeOverrides[key];
    const currentLiked = override?.liked ?? source.likedByMe;
    const currentCount = override?.likeCount ?? source.likeCount;
    const nextLiked = !currentLiked;
    const nextCount = Math.max(0, currentCount + (nextLiked ? 1 : -1));

    setLikePending(prev => ({ ...prev, [key]: true }));
    setLikeOverrides(prev => ({ ...prev, [key]: { liked: nextLiked, likeCount: nextCount } }));

    try {
      const result = nextLiked
        ? await likeActivity({ activityId })
        : await unlikeActivity({ activityId });
      setLikeOverrides(prev => ({
        ...prev,
        [key]: { liked: result.liked, likeCount: result.likeCount },
      }));
    } catch {
      setLikeOverrides(prev => ({
        ...prev,
        [key]: { liked: currentLiked, likeCount: currentCount },
      }));
    } finally {
      setLikePending(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleAddFriend = async (item: FriendSearchItemDto) => {
    const key = String(item.userId);
    if (friendActionBusy[key]) return;
    setFriendActionBusy(prev => ({ ...prev, [key]: true }));
    try {
      const result = await sendRequestByCode({ code: item.friendCode });
      if (result.status === 'sent') {
        setFriendRelationOverrides(prev => ({ ...prev, [key]: 'already_requested' }));
        notify.success(copy.requestSent);
      } else if (result.status === 'already_friends') {
        setFriendRelationOverrides(prev => ({ ...prev, [key]: 'already_friends' }));
        notify.info(copy.friends);
      } else {
        setFriendRelationOverrides(prev => ({ ...prev, [key]: 'already_requested' }));
        notify.info(copy.requested);
      }
    } catch {
      notify.error(copy.failed);
    } finally {
      setFriendActionBusy(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleShareLink = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      const link = myShareLink?.url || (await regenerateMyFriendCode({})).url;
      if (!link) {
        throw new Error('MISSING_SHARE_LINK');
      }
      setShareInlineUrl(link);
      setShareInlineCopied(false);
      setShareInlineMessage(copy.shareReady);
    } catch {
      setShareInlineUrl('');
      setShareInlineCopied(false);
      setShareInlineMessage(copy.failed);
    } finally {
      setShareBusy(false);
    }
  };

  const handleResetLink = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      const link = await regenerateMyFriendCode({});
      setShareInlineUrl(link.url);
      setShareInlineCopied(false);
      setShareInlineMessage(copy.resetReady);
    } catch {
      setShareInlineUrl('');
      setShareInlineCopied(false);
      setShareInlineMessage(copy.failed);
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopyInlineLink = async () => {
    if (!shareInlineUrl) return;
    const copied = await tryCopy(shareInlineUrl);
    if (copied) {
      setShareInlineCopied(true);
      setShareInlineMessage(copy.copied);
    } else {
      setShareInlineCopied(false);
      setShareInlineMessage(copy.copyFailed);
      shareInlineInputRef.current?.focus();
      shareInlineInputRef.current?.select();
    }
  };

  const handleCreateGroup = () => {
    notify.info(copy.groupSoon);
  };

  const handleJumpToAddFriend = () => {
    friendSearchCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    globalThis.setTimeout(() => {
      friendSearchInputRef.current?.focus();
    }, 120);
  };

  const handleBack = () => {
    if (globalThis.history.length > 1) {
      navigate(-1);
      return;
    }
    localizedNavigate('/dashboard');
  };

  return (
    <PageShell>
      <div style={{ padding: '20px 18px 28px' }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: `1px solid ${KT.line}`,
            background: KT.card,
            color: KT.ink,
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
          aria-label={copy.back}
          title={copy.back}
        >
          ←
        </button>
        <div
          style={{
            fontFamily: KT.serif,
            fontSize: 12,
            letterSpacing: 2.2,
            color: KT.crimson,
            fontWeight: 700,
            marginTop: 10,
            marginBottom: 8,
          }}
        >
          {copy.eyebrow}
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 42,
            lineHeight: 1.03,
            color: KT.ink,
            letterSpacing: -1.2,
            fontWeight: 900,
          }}
        >
          {copy.title}
        </h1>
        <div
          style={{
            marginTop: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 999,
            border: `1px solid ${KT.line}`,
            background: KT.card,
            padding: '6px 12px',
          }}
        >
          <span style={{ fontSize: 11, color: KT.sub, fontWeight: 700 }}>{copy.myCodeLabel}</span>
          <span style={{ fontSize: 12, color: KT.ink, fontWeight: 900, letterSpacing: 0.6 }}>
            {myUserCode}
          </span>
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => {
              void handleShareLink();
            }}
            disabled={shareBusy}
            style={{
              height: 38,
              borderRadius: 14,
              border: `1px solid ${KT.line2}`,
              background: KT.card,
              color: KT.crimson,
              fontSize: 12,
              fontWeight: 800,
              cursor: shareBusy ? 'default' : 'pointer',
            }}
          >
            {copy.share}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleResetLink();
            }}
            disabled={shareBusy}
            style={{
              height: 38,
              borderRadius: 14,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              color: KT.sub,
              fontSize: 12,
              fontWeight: 800,
              cursor: shareBusy ? 'default' : 'pointer',
            }}
          >
            {copy.reset}
          </button>
          {(shareInlineUrl || shareInlineMessage) && (
            <div
              style={{
                gridColumn: 'span 2',
                borderRadius: 14,
                border: `1px solid ${KT.line}`,
                background: KT.bg,
                padding: 10,
              }}
            >
              {shareInlineMessage ? (
                <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 700, color: KT.sub }}>
                  {shareInlineMessage}
                </div>
              ) : null}
              {shareInlineUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    ref={shareInlineInputRef}
                    readOnly
                    value={shareInlineUrl}
                    style={{
                      flex: 1,
                      height: 34,
                      borderRadius: 10,
                      border: `1px solid ${KT.line}`,
                      background: KT.card,
                      color: KT.ink2,
                      padding: '0 10px',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handleCopyInlineLink();
                    }}
                    style={{
                      height: 34,
                      borderRadius: 10,
                      border: `1px solid ${KT.line2}`,
                      background: KT.card,
                      color: shareInlineCopied ? KT.gold : KT.crimson,
                      padding: '0 12px',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {shareInlineCopied ? copy.copied : copy.copyAction}
                  </button>
                </div>
              ) : null}
            </div>
          )}
          <button
            type="button"
            onClick={handleCreateGroup}
            style={{
              height: 38,
              borderRadius: 14,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              color: KT.ink2,
              fontSize: 12,
              fontWeight: 800,
              gridColumn: 'span 2',
            }}
          >
            {copy.group}
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            background: KT.card,
            borderRadius: 28,
            boxShadow: KT.sh,
            border: `1px solid ${KT.line}`,
            padding: '14px 14px 10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Chip tone="butter">{leagueTierLabel}</Chip>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: KT.gold,
                color: KT.card,
                fontFamily: KT.serif,
                fontSize: 24,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {leagueSeal}
            </div>
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 24,
              fontWeight: 900,
              color: KT.ink,
              letterSpacing: -0.4,
            }}
          >
            {copy.rankingTitle}
          </div>
          <div style={{ marginTop: 2, fontSize: 12, color: KT.sub, fontWeight: 600 }}>
            {countdownLabel} · {copy.rankingPromote(promotionCutoffRank)}
          </div>
          <div style={{ marginTop: 10 }}>
            {!friendSummaryLoaded && (
              <div style={{ fontSize: 12, fontWeight: 600, color: KT.sub, padding: '6px 2px' }}>
                {copy.loading}
              </div>
            )}
            {friendSummaryLoaded && !hasFriends && (
              <div
                style={{
                  border: `1px dashed ${KT.line2}`,
                  borderRadius: 14,
                  padding: '14px 12px',
                  background: KT.bg,
                }}
              >
                <div style={{ fontSize: 15, color: KT.ink, fontWeight: 800 }}>
                  {copy.noFriendsTitle}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: KT.sub, fontWeight: 600 }}>
                  {copy.noFriendsSub}
                </div>
                <button
                  type="button"
                  onClick={handleJumpToAddFriend}
                  style={{
                    marginTop: 10,
                    height: 30,
                    borderRadius: 999,
                    border: `1px solid ${KT.line2}`,
                    padding: '0 12px',
                    background: KT.card,
                    color: KT.crimson,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {copy.noFriendsCta}
                </button>
              </div>
            )}
            {friendSummaryLoaded && hasFriends && topRows.length === 0 && (
              <div style={{ fontSize: 12, fontWeight: 600, color: KT.sub, padding: '6px 2px' }}>
                {copy.loading}
              </div>
            )}
            {friendSummaryLoaded &&
              hasFriends &&
              topRows.map(entry => (
                <div
                  key={String(entry.userId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 10px',
                    borderRadius: 14,
                    border: `1px solid ${entry.rank <= 3 ? `${KT.gold}66` : KT.line}`,
                    background: entry.rank <= 3 ? `${KT.butter}30` : 'transparent',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      textAlign: 'center',
                      fontFamily: KT.serif,
                      fontSize: 20,
                      color: entry.rank <= 3 ? KT.gold : KT.sub,
                      fontWeight: 700,
                    }}
                  >
                    {entry.rank}
                  </div>
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={shortName(entry)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        objectFit: 'cover',
                        border: `1px solid ${KT.line}`,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: KT.bg2,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 16,
                      }}
                    >
                      {entry.rank === 1
                        ? '🌸'
                        : entry.rank === 2
                          ? '☕️'
                          : entry.rank === 3
                            ? '🍃'
                            : '📘'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: KT.ink,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {shortName(entry)}
                      {entry.isMe ? ' (我)' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 31, fontWeight: 900, color: KT.ink, lineHeight: 1 }}>
                    {entry.currentWeekXp}
                  </div>
                </div>
              ))}
          </div>
          {friendSummaryLoaded && hasFriends && typeof weeklyOverview?.myRank === 'number' && (
            <div style={{ marginTop: 2, fontSize: 11, fontWeight: 700, color: KT.sub }}>
              {language.startsWith('zh')
                ? `我的排名 #${weeklyOverview.myRank} / ${weeklyOverview.totalRanked}`
                : language.startsWith('vi')
                  ? `Hạng của tôi #${weeklyOverview.myRank}/${weeklyOverview.totalRanked}`
                  : language.startsWith('mn')
                    ? `Миний байр #${weeklyOverview.myRank}/${weeklyOverview.totalRanked}`
                    : `My rank #${weeklyOverview.myRank}/${weeklyOverview.totalRanked}`}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{
                  fontFamily: KT.serif,
                  fontSize: 16,
                  fontWeight: 600,
                  color: KT.crimson,
                  opacity: 0.85,
                }}
              >
                友
              </span>
              <span style={{ fontSize: 14, fontWeight: 900, color: KT.ink }}>
                {copy.friendsTitle}
              </span>
            </div>
          </div>

          <div
            ref={friendSearchCardRef}
            style={{
              marginTop: 8,
              background: KT.card,
              borderRadius: 22,
              border: `1px solid ${KT.line}`,
              boxShadow: KT.sh,
              padding: '10px 12px',
            }}
          >
            <input
              ref={friendSearchInputRef}
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              placeholder={copy.searchPlaceholder}
              style={{
                width: '100%',
                height: 34,
                borderRadius: 12,
                border: `1px solid ${KT.line}`,
                background: KT.bg,
                color: KT.ink,
                padding: '0 12px',
                fontSize: 12,
                fontWeight: 600,
                outline: 'none',
              }}
            />
            {searchInput.trim().length > 0 && searchInput.trim().length < 2 && (
              <div style={{ marginTop: 6, fontSize: 11, color: KT.sub, fontWeight: 600 }}>
                {copy.searchHint}
              </div>
            )}
            {searchQuery.length >= 2 && (
              <div style={{ marginTop: 8 }}>
                {searchUsers === undefined && (
                  <div style={{ fontSize: 12, color: KT.sub, fontWeight: 600 }}>{copy.loading}</div>
                )}
                {searchUsers !== undefined && searchUsers.length === 0 && (
                  <div style={{ fontSize: 12, color: KT.sub, fontWeight: 600 }}>
                    {copy.searchEmpty}
                  </div>
                )}
                {searchUsers?.map(item => {
                  const key = String(item.userId);
                  const relation = friendRelationOverrides[key] ?? item.relation;
                  const disabled = relation !== 'none' || !!friendActionBusy[key];
                  const buttonText =
                    relation === 'already_friends'
                      ? copy.friends
                      : relation === 'already_requested'
                        ? copy.requested
                        : copy.searchButton;
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 0',
                      }}
                    >
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={item.name}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 10,
                            objectFit: 'cover',
                            border: `1px solid ${KT.line}`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 10,
                            background: `${KT.crimson}22`,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 12,
                            fontWeight: 800,
                            color: KT.crimson,
                          }}
                        >
                          {(item.name || '?').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: KT.ink,
                            fontWeight: 800,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ fontSize: 10, color: KT.sub, fontWeight: 700 }}>
                          {item.friendCode}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (disabled) return;
                          void handleAddFriend(item);
                        }}
                        style={{
                          height: 28,
                          borderRadius: 14,
                          border: `1px solid ${disabled ? KT.line : KT.line2}`,
                          background: relation === 'none' ? 'transparent' : `${KT.butter}7A`,
                          color: relation === 'none' ? KT.crimson : '#7A5F1F',
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '0 10px',
                          cursor: disabled ? 'default' : 'pointer',
                          opacity: friendActionBusy[key] ? 0.65 : 1,
                        }}
                      >
                        {buttonText}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 10,
              background: KT.card,
              borderRadius: 24,
              boxShadow: KT.sh,
              overflow: 'hidden',
              border: `1px solid ${KT.line}`,
            }}
          >
            {communityActivities === undefined && (
              <div style={{ padding: '16px 18px', fontSize: 13, color: KT.sub, fontWeight: 600 }}>
                {copy.loading}
              </div>
            )}
            {communityActivities !== undefined && feed.length === 0 && (
              <div style={{ padding: '16px 18px', fontSize: 13, color: KT.sub, fontWeight: 600 }}>
                {copy.empty}
              </div>
            )}
            {feed.map((item, index) => (
              <div
                key={item.key}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderBottom: index < feed.length - 1 ? `1px solid ${KT.line}` : 'none',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: item.tone.bg,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {item.tone.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: KT.ink }}>
                      {item.actorName}
                    </span>
                    <Chip tone={item.tone.tone}>{item.tone.tag}</Chip>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: KT.ink2,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.action}
                  </div>
                  <div style={{ fontSize: 10, color: KT.sub, marginTop: 2, fontWeight: 600 }}>
                    {item.time}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleToggleLike(item.activityId);
                  }}
                  disabled={!!likePending[item.key]}
                  style={{
                    minWidth: 30,
                    height: 30,
                    borderRadius: 15,
                    border: `1px solid ${KT.line2}`,
                    background: item.liked ? `${KT.pink}66` : 'transparent',
                    cursor: likePending[item.key] ? 'default' : 'pointer',
                    color: item.liked ? KT.crimson : KT.sub,
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '0 8px',
                    opacity: likePending[item.key] ? 0.65 : 1,
                  }}
                  aria-label="Like"
                >
                  <span>{item.liked ? '♥' : '♡'}</span>
                  <span>{item.likeCount}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
