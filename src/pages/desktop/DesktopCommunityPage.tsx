import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { COMMUNITY, FRIENDS, LEADERBOARD, STORAGE } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { UserAvatar } from '../../components/common';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { DRail } from '../../components/desktop/ui/DRail';
import type { CommunityActivityDto } from '../../../convex/community';
import type { Id } from '../../../convex/_generated/dataModel';
import { cn } from '../../lib/utils';
import { notify } from '../../utils/notify';
import type { FriendSearchItemDto } from '../../utils/convexRefs';
import {
  Loader2,
  MessageCircle,
  Heart,
  Share2,
  MoreHorizontal,
  Paperclip,
  Send,
  Sparkles,
  Trophy,
  Users,
  Image as ImageIcon,
  X,
} from 'lucide-react';

type ActivityTone = {
  emoji: string;
  tag: string;
  tone: 'pink' | 'mint' | 'butter' | 'lilac' | 'muted' | 'crimson' | 'ink';
  bg: string;
};

function getActivityTone(moduleName: string, t: TFunction): ActivityTone {
  const lower = moduleName.toLowerCase();
  if (lower.includes('vocab') || lower.includes('review')) {
    return {
      emoji: '📝',
      tag: t('community.desktop.tags.vocab', { defaultValue: '词汇' }),
      tone: 'pink',
      bg: 'var(--color-k-pink)',
    };
  }
  if (lower.includes('grammar')) {
    return {
      emoji: '📘',
      tag: t('community.desktop.tags.grammar', { defaultValue: '语法' }),
      tone: 'mint',
      bg: 'var(--color-k-mint-deep)',
    };
  }
  if (lower.includes('podcast') || lower.includes('listening')) {
    return {
      emoji: '🎧',
      tag: t('community.desktop.tags.listening', { defaultValue: '听力' }),
      tone: 'butter',
      bg: 'var(--color-k-butter)',
    };
  }
  if (lower.includes('topik') || lower.includes('exam')) {
    return {
      emoji: '🎯',
      tag: t('community.desktop.tags.topik', { defaultValue: 'TOPIK' }),
      tone: 'lilac',
      bg: 'var(--color-k-lilac)',
    };
  }
  if (lower.includes('milestone') || lower.includes('achievement')) {
    return {
      emoji: '🏆',
      tag: t('community.desktop.tags.milestone', { defaultValue: '里程碑' }),
      tone: 'crimson',
      bg: 'var(--color-k-crimson)',
    };
  }
  if (lower.includes('qa')) {
    return {
      emoji: '❓',
      tag: t('community.desktop.tags.qa', { defaultValue: '问答' }),
      tone: 'ink',
      bg: 'var(--color-k-ink)',
    };
  }
  if (lower.includes('resources')) {
    return {
      emoji: '📂',
      tag: t('community.desktop.tags.resources', { defaultValue: '资料' }),
      tone: 'mint',
      bg: 'var(--color-k-mint)',
    };
  }
  return {
    emoji: '📚',
    tag: t('community.desktop.tags.study', { defaultValue: '学习' }),
    tone: 'muted',
    bg: 'var(--color-k-bg2)',
  };
}

function formatTime(eventAt: number, t: TFunction): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - eventAt) / 1000));
  if (diffSec < 60) return t('dashboard.desktop.justNow', { defaultValue: '刚刚' });
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)
    return t('dashboard.desktop.minutesAgo', { count: diffMin, defaultValue: `${diffMin}分钟前` });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24)
    return t('dashboard.desktop.hoursAgo', { count: diffHour, defaultValue: `${diffHour}小时前` });
  const diffDay = Math.floor(diffHour / 24);
  return t('dashboard.desktop.dayJoined', { count: diffDay, defaultValue: `${diffDay}天前` });
}

function formatAction(item: CommunityActivityDto, t: TFunction): string {
  if (item.kind === 'post') return item.content.slice(0, 50);

  const count = Math.max(1, item.itemCount || 0);
  const minutes = Math.max(1, Math.round((item.durationSec || 0) / 60));

  if (item.eventName === 'review_completed')
    return t('dashboard.desktop.reviewCta', { defaultValue: '完成复习' }) + ` ${count}`;
  if (item.eventName === 'session_completed')
    return t('dashboard.desktop.approxTime', {
      count: minutes,
      defaultValue: `学习了 ${minutes} 分钟`,
    });
  if (item.eventName === 'content_completed')
    return t('community.desktop.events.completedContent', { defaultValue: '完成了内容学习' });
  if (item.score !== null)
    return t('community.desktop.events.topikScore', {
      score: item.score,
      defaultValue: `TOPIK 得分: ${item.score}`,
    });
  return t('community.desktop.events.submittedExam', { defaultValue: '提交了考试' });
}

const PostComments = ({ postId, t }: { postId: Id<'community_posts'>; t: TFunction }) => {
  const comments = useQuery(COMMUNITY.getComments, { postId });
  const addComment = useMutation(COMMUNITY.addComment);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addComment({ postId, content });
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 space-y-4 pl-4 border-l-2 border-k-line/10">
      <AnimatePresence initial={false}>
        {comments?.map(c => (
          <motion.div
            key={c._id.toString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-k-bg2 overflow-hidden flex-shrink-0 border border-k-line/5 shadow-sm">
              {c.userAvatar ? (
                <img src={c.userAvatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] bg-k-butter/20">
                  👤
                </div>
              )}
            </div>
            <div className="flex-1 bg-k-bg2/30 rounded-2xl p-3 border border-k-line/5 hover:bg-k-bg2/50 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[12px] font-black text-k-ink">{c.userName}</div>
                <div className="text-[10px] font-bold text-k-sub opacity-40 uppercase tracking-tighter">
                  {formatTime(c.createdAt, t)}
                </div>
              </div>
              <div className="text-[13px] font-medium text-k-ink2 leading-relaxed">{c.content}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="flex gap-3 mt-5 pt-2">
        <div className="flex-1 relative group">
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={t('community.desktop.commentPlaceholder', {
              defaultValue: '写下你的想法...',
            })}
            className="w-full bg-k-bg2/40 border border-k-line/5 focus:border-k-crimson/20 focus:bg-k-bg2/80 outline-none rounded-2xl px-5 py-3 text-[13px] font-medium transition-all shadow-inner"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className="h-[44px] px-6 bg-k-ink text-k-bg rounded-2xl text-[12px] font-black hover:bg-k-crimson hover:shadow-k-sh-md active:scale-95 transition-all disabled:opacity-50 disabled:hover:bg-k-ink"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            t('community.desktop.reply', { defaultValue: '回复' })
          )}
        </button>
      </div>
    </div>
  );
};

export default function DesktopCommunityPage() {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');
  const [likeState, setLikeState] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [postContent, setPostContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [composerFocused, setComposerFocused] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Friend Search State
  const [friendSearchInput, setFriendSearchInput] = useState('');
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendActionBusy, setFriendActionBusy] = useState<Record<string, boolean>>({});
  const [friendRelationOverrides, setFriendRelationOverrides] = useState<
    Record<string, 'already_requested' | 'already_friends' | undefined>
  >({});

  const viewer = useQuery(COMMUNITY.getViewer);
  const communityFeed = useQuery(COMMUNITY.getCommunityFeed, { limit: 30, filter: activeFilter });
  const weeklyTop = useQuery(LEADERBOARD.getWeeklyTop, { limit: 5 });
  const friendsList = useQuery(FRIENDS.listFriends, {});

  const likeActivity = useMutation(COMMUNITY.likeActivity);
  const unlikeActivity = useMutation(COMMUNITY.unlikeActivity);
  const createPost = useMutation(COMMUNITY.createPost);
  const getUploadUrl = useAction(STORAGE.getUploadUrl);
  const searchUsers = useQuery(
    FRIENDS.searchUsers,
    friendSearchQuery.length >= 2 ? { query: friendSearchQuery, limit: 6 } : 'skip'
  );
  const sendRequestByCode = useMutation(FRIENDS.sendRequestByCode);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFriendSearchQuery(friendSearchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [friendSearchInput]);

  const filters = [
    { id: 'all', label: t('community.desktop.filters.all', { defaultValue: '全部' }) },
    { id: 'following', label: t('community.desktop.filters.following', { defaultValue: '关注' }) },
    {
      id: 'milestones',
      label: t('community.desktop.filters.milestones', { defaultValue: '里程碑' }),
    },
    { id: 'qa', label: t('community.desktop.filters.qa', { defaultValue: '问答' }) },
    {
      id: 'resources',
      label: t('community.desktop.filters.resources', { defaultValue: '资料分享' }),
    },
  ];

  const feed = useMemo(() => {
    if (!communityFeed) return [];
    return communityFeed.map(item => {
      const state = likeState[item.activityId];
      return {
        ...item,
        key: item.activityId,
        tone: getActivityTone(item.kind === 'post' ? item.module : item.module || 'study', t),
        action: formatAction(item, t),
        time: formatTime(item.eventAt, t),
        liked: state ? state.liked : item.likedByMe,
        likeCount: state ? state.count : item.likeCount,
        title:
          item.kind === 'post'
            ? item.actorName +
              ' ' +
              t('community.desktop.sharedPost', { defaultValue: '分享了动态' })
            : formatAction(item, t),
        body: item.kind === 'post' ? item.content : `${item.actorName} ${formatAction(item, t)}`,
      };
    });
  }, [communityFeed, likeState, t]);

  const topFriends = useMemo(() => {
    if (!weeklyTop) return [];
    return weeklyTop.slice(0, 5).map(entry => ({
      r: entry.rank,
      n: entry.name || 'Learner',
      xp: entry.currentWeekXp,
      e: entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : undefined,
      me: entry.isMe,
    }));
  }, [weeklyTop]);

  const studyPartners = useMemo(() => {
    if (!friendsList) return [];
    const emojis = ['🌸', '☕', '🌙', '📚', '🎯', '🎧'];
    return friendsList.slice(0, 5).map((f, i) => ({
      e: emojis[i % emojis.length],
      n: f.name || 'Learner',
      avatar: f.avatarUrl,
    }));
  }, [friendsList]);

  const handleToggleLike = async (
    activityId: string,
    kind: 'event' | 'post',
    currentLiked: boolean,
    currentCount: number
  ) => {
    const nextLiked = !currentLiked;
    const nextCount = currentCount + (nextLiked ? 1 : -1);

    setLikeState(prev => ({ ...prev, [activityId]: { liked: nextLiked, count: nextCount } }));

    try {
      if (nextLiked) {
        await likeActivity({ activityId, kind });
      } else {
        await unlikeActivity({ activityId, kind });
      }
    } catch {
      setLikeState(prev => ({
        ...prev,
        [activityId]: { liked: currentLiked, count: currentCount },
      }));
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
        notify.success(t('friends.requestSent', { defaultValue: '好友请求已发送' }));
      } else if (result.status === 'already_friends') {
        setFriendRelationOverrides(prev => ({ ...prev, [key]: 'already_friends' }));
        notify.info(t('friends.alreadyFriends', { defaultValue: '你们已经是好友了' }));
      } else {
        setFriendRelationOverrides(prev => ({ ...prev, [key]: 'already_requested' }));
      }
    } catch {
      notify.error(t('friends.actionFailed', { defaultValue: '操作失败，请稍后再试' }));
    } finally {
      setFriendActionBusy(prev => ({ ...prev, [key]: false }));
    }
  };

  const handlePublish = async () => {
    if ((!postContent.trim() && uploadedImages.length === 0) || isPublishing) return;
    setIsPublishing(true);
    try {
      await createPost({
        content: postContent,
        type: activeFilter === 'qa' || activeFilter === 'resources' ? activeFilter : 'all',
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
      });
      setPostContent('');
      setUploadedImages([]);
    } finally {
      setIsPublishing(false);
    }
  };

  const uploadImageFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const newImages = [...uploadedImages];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { uploadUrl, publicUrl } = await getUploadUrl({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        });

        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        newImages.push(publicUrl);
      }
      setUploadedImages(newImages);
    } catch (err) {
      console.error('Failed to upload image:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await uploadImageFiles(files);
  };

  const removeImage = (url: string) => {
    setUploadedImages(prev => prev.filter(u => u !== url));
  };

  const toggleComments = (postId: string) => {
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const content = (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Composer */}
      <motion.div
        animate={{ scale: composerFocused ? 1.01 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <DesktopCard
          pad={24}
          style={{ marginBottom: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}
          className={cn(
            'group border transition-all duration-500',
            composerFocused
              ? 'border-k-crimson/20 shadow-k-sh-lg bg-k-card'
              : 'border-k-line/10 hover:border-k-line/30 shadow-k-sh-sm bg-k-card/80'
          )}
        >
          <UserAvatar
            user={viewer}
            className="w-12 h-12 rounded-2xl shadow-inner flex-shrink-0 bg-k-bg2 border border-k-line/5"
            fallbackClassName="text-2xl"
          />
          <div className="flex-1 space-y-4">
            <div className="relative">
              <textarea
                value={postContent}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
                onChange={e => setPostContent(e.target.value)}
                onPaste={async e => {
                  const items = e.clipboardData.items;
                  const files: File[] = [];
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                      const file = items[i].getAsFile();
                      if (file) files.push(file);
                    }
                  }
                  if (files.length > 0) {
                    void uploadImageFiles(files);
                  }
                }}
                placeholder={t('community.desktop.composerPlaceholder', {
                  defaultValue: '分享你的学习过程...',
                })}
                className="w-full bg-k-bg2/40 border-none rounded-2xl px-5 py-4 text-[15px] font-medium text-k-ink outline-none min-h-[80px] max-h-60 resize-none transition-all focus:bg-k-bg2 focus:shadow-inner placeholder:text-k-sub/40"
                rows={postContent.includes('\n') ? 4 : 2}
              />

              {/* Image Previews */}
              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3 px-1">
                  <AnimatePresence>
                    {uploadedImages.map(url => (
                      <motion.div
                        key={url}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative w-20 h-20 group/img"
                      >
                        <img
                          src={url}
                          className="w-full h-full object-cover rounded-xl border border-k-line/10 shadow-sm"
                        />
                        <button
                          onClick={() => removeImage(url)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-k-ink text-k-bg rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isUploading && (
                    <div className="w-20 h-20 rounded-xl bg-k-bg2/50 border border-k-line/10 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-k-sub/40" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <motion.div
              initial={false}
              animate={{
                opacity: postContent || composerFocused || uploadedImages.length > 0 ? 1 : 0.8,
              }}
              className="flex items-center justify-between pt-1"
            >
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-k-line/10 bg-k-bg2/50 text-[12px] font-black text-k-sub hover:bg-k-bg2 hover:text-k-ink hover:border-k-line/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ImageIcon size={16} className="text-k-mint-deep" />
                  )}
                  {t('community.desktop.addImage', { defaultValue: '图片' })}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                />

                <button
                  onClick={() => navigate('/community/add')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-k-line/10 bg-k-bg2/50 text-[12px] font-black text-k-sub hover:bg-k-bg2 hover:text-k-ink hover:border-k-line/30 transition-all active:scale-95"
                >
                  <Paperclip size={16} className="text-k-crimson" />
                  {t('community.desktop.studyCard', { defaultValue: '学习卡' })}
                </button>
              </div>
              <button
                onClick={handlePublish}
                disabled={isPublishing || (!postContent.trim() && uploadedImages.length === 0)}
                className="h-12 px-8 bg-k-ink text-k-bg rounded-2xl text-[14px] font-black hover:bg-k-crimson transition-all shadow-k-sh-md disabled:opacity-30 disabled:hover:bg-k-ink flex items-center gap-2.5 active:scale-95"
              >
                {isPublishing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={16} />{' '}
                    {t('community.desktop.publish', { defaultValue: '发布动态' })}
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </DesktopCard>
      </motion.div>

      {/* Feed filters */}
      <div className="flex gap-2.5 mb-6 px-1 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={cn(
              'px-5 py-2.5 rounded-2xl text-[13px] font-black transition-all whitespace-nowrap relative',
              activeFilter === f.id
                ? 'bg-k-ink text-k-bg shadow-k-sh-md'
                : 'bg-k-card text-k-sub border border-k-line/5 hover:bg-k-bg2 hover:text-k-ink shadow-k-sh-sm'
            )}
          >
            {activeFilter === f.id && (
              <motion.div
                layoutId="activeFilter"
                className="absolute inset-0 bg-k-ink rounded-2xl -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            {f.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      <AnimatePresence mode="popLayout">
        {!communityFeed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-24"
          >
            <Loader2 className="animate-spin text-k-crimson/50" size={40} />
          </motion.div>
        ) : feed.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <DesktopCard
              pad={60}
              className="border-dashed border-2 border-k-line/10 bg-transparent flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-k-bg2/50 flex items-center justify-center mb-6">
                <Users size={32} className="text-k-sub/20" />
              </div>
              <div className="text-[16px] font-black text-k-ink tracking-tight">
                {t('community.desktop.noActivity', { defaultValue: '探索学习之路' })}
              </div>
              <p className="text-[13px] font-medium text-k-sub/60 mt-2 max-w-xs text-center leading-relaxed">
                关注你的同学，或者发布第一条动态，开启你的社区之旅。
              </p>
              <button
                onClick={() => navigate('/leaderboard')}
                className="mt-6 px-6 py-3 bg-k-ink text-k-bg rounded-2xl text-[13px] font-black hover:bg-k-crimson transition-all"
              >
                去发现新伙伴
              </button>
            </DesktopCard>
          </motion.div>
        ) : (
          feed.map((p, i) => (
            <motion.div
              key={p.key}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="mb-5"
            >
              <DesktopCard
                pad={28}
                className="border border-k-line/5 shadow-k-sh-sm hover:shadow-k-sh-lg transition-all duration-300 group relative overflow-hidden"
              >
                {p.kind === 'event' && p.score && p.score > 90 && (
                  <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-k-butter/10 rounded-full blur-2xl group-hover:bg-k-butter/20 transition-all" />
                )}

                <div className="flex gap-4 items-center mb-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-12 h-12 rounded-[18px] overflow-hidden shadow-sm border border-k-line/5 flex items-center justify-center text-2xl flex-shrink-0 cursor-pointer"
                    style={{ background: p.tone.bg + '15' }}
                  >
                    {p.actorAvatar ? (
                      <img src={p.actorAvatar} className="w-full h-full object-cover" />
                    ) : (
                      <span className="opacity-80">{p.tone.emoji}</span>
                    )}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[16px] font-black text-k-ink hover:text-k-crimson cursor-pointer transition-colors">
                        {p.actorName}
                      </span>
                      <DesignChip tone={p.tone.tone} size="sm">
                        {p.tone.tag}
                      </DesignChip>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <div className="w-1.5 h-1.5 rounded-full bg-k-line/20" />
                        <span className="text-[11px] font-bold text-k-sub/50 uppercase tracking-widest">
                          {p.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="w-9 h-9 rounded-xl flex items-center justify-center text-k-sub/40 hover:bg-k-bg2 hover:text-k-ink transition-all">
                    <MoreHorizontal size={20} />
                  </button>
                </div>

                <div className="pl-1">
                  {p.kind === 'event' ? (
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="text-[17px] font-black text-k-ink leading-tight tracking-tight mb-2">
                          {p.title}
                        </div>
                        <div className="text-[14px] font-medium text-k-sub leading-relaxed">
                          {p.body}
                        </div>
                      </div>
                      {p.score && (
                        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-k-mint/10 border border-k-mint/20">
                          <div className="text-[10px] font-black text-k-mint-deep/60 uppercase">
                            Score
                          </div>
                          <div className="text-[20px] font-black text-k-mint-deep">{p.score}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-[15px] font-medium text-k-ink2 leading-relaxed whitespace-pre-wrap selection:bg-k-butter">
                        {p.body}
                      </div>

                      {/* Post Images */}
                      {p.images && p.images.length > 0 && (
                        <div
                          className={cn(
                            'grid gap-3 rounded-3xl overflow-hidden',
                            p.images.length === 1
                              ? 'grid-cols-1'
                              : p.images.length === 2
                                ? 'grid-cols-2'
                                : 'grid-cols-2 md:grid-cols-3'
                          )}
                        >
                          {p.images.map(img => (
                            <div
                              key={img}
                              className={cn(
                                'relative aspect-square cursor-zoom-in group/item overflow-hidden',
                                p.images!.length === 1 ? 'aspect-video' : ''
                              )}
                            >
                              <img
                                src={img}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110"
                              />
                              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {p.attachment && p.attachment.type === 'study_card' && (
                    <motion.div
                      whileHover={{ y: -2, boxShadow: 'var(--shadow-k-sh-md)' }}
                      className="mt-5 p-5 rounded-3xl bg-k-bg2/40 border border-k-line/10 flex items-center gap-5 hover:bg-k-bg2/80 transition-all cursor-pointer group/card shadow-inner"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-k-card border border-k-line/5 flex items-center justify-center text-2xl shadow-sm group-hover/card:scale-105 transition-transform">
                        📝
                      </div>
                      <div className="flex-1">
                        <div className="text-[14px] font-black text-k-ink">
                          {p.attachment.title}
                        </div>
                        <div className="text-[12px] font-bold text-k-sub/70 truncate max-w-[360px]">
                          {p.attachment.description}
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-k-bg2 flex items-center justify-center text-k-sub/30 group-hover/card:text-k-crimson transition-colors">
                        <ChevronRight size={20} />
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-10 mt-8 pt-6 border-t border-k-line/5">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleToggleLike(p.activityId, p.kind, p.liked, p.likeCount)}
                    className={cn(
                      'flex items-center gap-2.5 text-[13px] font-black transition-all',
                      p.liked ? 'text-k-crimson' : 'text-k-sub hover:text-k-ink'
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                        p.liked ? 'bg-k-crimson/10' : 'bg-transparent group-hover:bg-k-bg2'
                      )}
                    >
                      <Heart
                        size={18}
                        fill={p.liked ? 'currentColor' : 'none'}
                        className={cn(p.liked ? 'animate-in zoom-in duration-300' : '')}
                      />
                    </div>
                    {p.likeCount > 0
                      ? p.likeCount
                      : t('community.desktop.like', { defaultValue: '赞' })}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleComments(p.activityId)}
                    className={cn(
                      'flex items-center gap-2.5 text-[13px] font-black transition-all',
                      expandedPosts.has(p.activityId) ? 'text-k-ink' : 'text-k-sub hover:text-k-ink'
                    )}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                        expandedPosts.has(p.activityId)
                          ? 'bg-k-ink/5'
                          : 'bg-transparent group-hover:bg-k-bg2'
                      )}
                    >
                      <MessageCircle
                        size={18}
                        fill={expandedPosts.has(p.activityId) ? 'rgba(31,27,23,0.1)' : 'none'}
                      />
                    </div>
                    {p.commentCount > 0
                      ? p.commentCount
                      : t('community.desktop.comment', { defaultValue: '评论' })}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={async () => {
                      try {
                        const url = `${window.location.origin}/community/post/${p.activityId}`;
                        await navigator.clipboard.writeText(url);
                      } catch (error) {
                        console.error('Failed to copy community post link', error);
                      }
                    }}
                    className="flex items-center gap-2.5 text-[13px] font-black text-k-sub hover:text-k-ink transition-all ml-auto"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-k-bg2 transition-all">
                      <Share2 size={18} />
                    </div>
                  </motion.button>
                </div>

                <AnimatePresence>
                  {expandedPosts.has(p.activityId) && p.kind === 'post' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <PostComments postId={p.activityId as Id<'community_posts'>} t={t} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </DesktopCard>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );

  const right = (
    <div className="w-[360px] shrink-0 pl-8 space-y-8">
      {/* Ranking Rail */}
      <DRail
        kanji="榜"
        title={t('leaderboard.desktop.title', { defaultValue: '本周排行' })}
        action={`${t('dashboard.desktop.viewAll', { defaultValue: '完整榜单' })} →`}
        onActionClick={() => navigate('/leaderboard')}
        pad={0}
        className="overflow-hidden border border-k-line/5 shadow-k-sh-sm"
      >
        <div className="divide-y divide-k-line/5">
          {topFriends.map((p, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 4 }}
              className={cn(
                'px-6 py-4 flex items-center gap-4 transition-colors cursor-pointer',
                p.me ? 'bg-k-butter/10' : 'hover:bg-k-bg2/20'
              )}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-k-bg2 text-[13px] font-black text-k-sub/50">
                {p.e || p.r}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-[14px] truncate tracking-tight',
                    p.me ? 'font-black text-k-ink' : 'font-bold text-k-ink2'
                  )}
                >
                  {p.n}
                </div>
                <div className="text-[10px] font-bold text-k-sub/40 uppercase tracking-widest mt-0.5">
                  Learner
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-k-serif text-[16px] text-k-crimson font-black tracking-tighter">
                  {p.xp.toLocaleString()}
                </span>
                <span className="text-[9px] font-black text-k-sub/30 uppercase tracking-tighter">
                  XP
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </DRail>

      {/* Friend Search Rail */}
      <DRail
        kanji="友"
        title={t('friends.searchTitle', { defaultValue: '添加好友' })}
        pad={12}
        className="border border-k-line/5 shadow-k-sh-sm"
      >
        <div className="space-y-4">
          <div className="relative">
            <input
              value={friendSearchInput}
              onChange={e => setFriendSearchInput(e.target.value)}
              placeholder={t('friends.searchPlaceholder', { defaultValue: '输入昵称或好友码...' })}
              className="w-full h-10 bg-k-bg2 rounded-xl border border-k-line/5 px-4 text-[13px] font-medium outline-none focus:border-k-crimson/30 transition-colors"
            />
          </div>
          {friendSearchQuery.length >= 2 && (
            <div className="space-y-3 pt-1">
              {searchUsers === undefined && (
                <div className="text-center text-[12px] text-k-sub animate-pulse">Searching...</div>
              )}
              {searchUsers?.length === 0 && (
                <div className="text-center text-[12px] text-k-sub">No users found</div>
              )}
              {searchUsers?.map(item => {
                const key = String(item.userId);
                const relation = friendRelationOverrides[key] ?? item.relation;
                const disabled = relation !== 'none' || !!friendActionBusy[key];
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 bg-k-bg2/30 p-2 rounded-2xl border border-k-line/5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-k-card overflow-hidden border border-k-line/10 shrink-0">
                      {item.avatarUrl ? (
                        <img src={item.avatarUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[12px] font-black text-k-sub/30">
                          {item.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-black text-k-ink truncate">{item.name}</div>
                      <div className="text-[10px] font-bold text-k-sub/40">{item.friendCode}</div>
                    </div>
                    <button
                      disabled={disabled}
                      onClick={() => handleAddFriend(item)}
                      className={cn(
                        'h-8 px-3 rounded-xl text-[11px] font-black transition-all active:scale-95',
                        relation === 'none' ? 'bg-k-ink text-white' : 'bg-k-bg2 text-k-sub/50'
                      )}
                    >
                      {relation === 'already_friends'
                        ? '✓'
                        : relation === 'already_requested'
                          ? '...'
                          : '+'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DRail>

      {/* Friends Rail */}
      <DRail
        kanji="伴"
        title={t('dashboard.desktop.friendActivity', { defaultValue: '学习伙伴' })}
        action={`${t('dashboard.desktop.viewAll', { defaultValue: '管理' })} →`}
        pad={0}
        className="overflow-hidden border border-k-line/5 shadow-k-sh-sm"
      >
        <div className="divide-y divide-k-line/5">
          {studyPartners.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-3xl bg-k-bg2/50 flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-k-sub/20" />
              </div>
              <div className="text-[12px] font-black text-k-sub/40 uppercase tracking-widest">
                {t('dashboard.desktop.noFriendActivity', { defaultValue: '暂无在线伙伴' })}
              </div>
            </div>
          ) : (
            studyPartners.map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ x: 4 }}
                className="px-6 py-4 flex gap-4 items-center hover:bg-k-bg2/20 transition-colors cursor-pointer"
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-[14px] overflow-hidden border-2 border-k-card shadow-sm">
                    {f.avatar ? (
                      <img src={f.avatar} alt={f.n} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-lg"
                        style={{
                          background:
                            [
                              'var(--color-k-pink)',
                              'var(--color-k-butter)',
                              'var(--color-k-lilac)',
                            ][i % 3] + '30',
                        }}
                      >
                        {f.e}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-k-card flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-k-mint-deep shadow-[0_0_8px_var(--color-k-mint-deep)]" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-black text-k-ink truncate tracking-tight">
                    {f.n}
                  </div>
                  <div className="text-[10px] font-bold text-k-sub/40 uppercase tracking-wider">
                    Active Now
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </DRail>

      {/* Community Info Card */}
      <motion.div
        whileHover={{ y: -4 }}
        className="p-8 rounded-[40px] bg-k-ink text-k-bg shadow-k-sh-lg flex flex-col gap-5 relative overflow-hidden group"
      >
        <div className="absolute -top-6 -right-6 p-4 opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 text-k-butter">
          <Sparkles size={120} />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-k-butter/20 flex items-center justify-center">
            <Trophy size={14} className="text-k-butter" />
          </div>
          <div className="text-[12px] font-black uppercase tracking-[0.2em] text-k-butter/80">
            社区准则
          </div>
        </div>
        <p className="text-[14px] font-medium leading-relaxed opacity-90 z-10 selection:bg-k-crimson">
          欢迎来到 DuHan 社区！在这里你可以分享学习笔记、解答疑惑、结交志同道合的学习伙伴。
        </p>
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-[12px] font-bold opacity-60">
            <div className="w-1.5 h-1.5 rounded-full bg-k-butter" />
            <span>保持友善与尊重</span>
          </div>
          <div className="flex items-center gap-3 text-[12px] font-bold opacity-60">
            <div className="w-1.5 h-1.5 rounded-full bg-k-butter" />
            <span>分享高质量内容</span>
          </div>
        </div>
        <button className="w-full h-12 bg-k-bg text-k-ink rounded-[20px] text-[13px] font-black hover:bg-k-butter hover:shadow-lg transition-all z-10 mt-2 active:scale-95">
          查看完整指南
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-12 font-sans bg-k-bg/30">
      {/* Community Tab Bar */}
      <div className="flex items-center gap-1 mb-6 bg-k-bg2/60 rounded-full p-1 w-fit">
        <button
          type="button"
          className="px-5 py-2 rounded-full text-[13px] font-extrabold bg-k-card text-k-ink shadow-k-shSm"
        >
          {t('qa.tabFeed', { defaultValue: 'Feed' })}
        </button>
        <button
          type="button"
          onClick={() => navigate('/community/qa')}
          className="px-5 py-2 rounded-full text-[13px] font-extrabold text-k-sub hover:text-k-ink transition-colors"
        >
          {t('qa.tabQA', { defaultValue: 'Q&A' })}
        </button>
      </div>
      <div className="flex">
        <div className="flex-1 min-w-0">{content}</div>
        {right}
      </div>
    </div>
  );
}

type ChevronRightProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string;
};

function ChevronRight({ size = 24, ...props }: ChevronRightProps) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
