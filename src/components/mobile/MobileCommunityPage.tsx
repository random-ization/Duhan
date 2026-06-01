import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { COMMUNITY, FRIENDS, LEADERBOARD, STORAGE } from '../../utils/convexRefs';
import { Chip, PageShell, PageIntro, Card, SectionHead } from './ksoft/ksoft';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { notify } from '../../utils/notify';
import { UserAvatar } from '../common';
import {
  Heart,
  MessageCircle,
  Image as ImageIcon,
  X,
  Send,
  Trophy,
  Users,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { FriendSearchItemDto } from '../../utils/convexRefs';
import type { Id } from '../../../convex/_generated/dataModel';
import type { CommunityActivityDto } from '../../../convex/community';

// --- Helpers ---

type FriendRelationOverride = 'already_requested' | 'already_friends';
type CommunityViewer = {
  _id: Id<'users'>;
  name?: string;
  avatar: string | null;
};

type ActivityTone = Readonly<{
  emoji: string;
  tag: string;
  tone: 'pink' | 'mint' | 'butter' | 'lilac' | 'muted';
  bg: string;
}>;

const getActivityTone = (moduleName: string, t: TFunction): ActivityTone => {
  const lower = (moduleName || '').toLowerCase();
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
  return {
    emoji: '📚',
    tag: t('community.desktop.tags.study', { defaultValue: '学习' }),
    tone: 'muted',
    bg: 'var(--color-k-bg2)',
  };
};

// --- Sub-components ---

const PostComposer = ({
  user,
  onSuccess,
}: {
  user: CommunityViewer | null | undefined;
  onSuccess: () => void;
}) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ file: File; preview: string }[]>([]);
  const getUploadUrl = useAction(STORAGE.getUploadUrl);
  const createPost = useMutation(COMMUNITY.createPost);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setSelectedImages(prev => [...prev, ...newImages].slice(0, 3));
  };

  const removeImage = (idx: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if ((!content.trim() && selectedImages.length === 0) || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const imageUrls = [];
      for (const img of selectedImages) {
        const { uploadUrl, publicUrl } = await getUploadUrl({
          filename: img.file.name,
          contentType: img.file.type,
          fileSize: img.file.size,
          folder: 'uploads',
        });

        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': img.file.type },
          body: img.file,
        });
        imageUrls.push(publicUrl);
      }

      await createPost({ content, images: imageUrls });
      setContent('');
      setSelectedImages([]);
      onSuccess();
      notify.success(t('community.postSuccess', { defaultValue: '发布成功' }));
    } catch {
      notify.error(t('community.postError', { defaultValue: '发布失败，请重试' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card pad={16} className="mb-6 shadow-k-sh-sm border border-k-line/5">
      <div className="flex gap-3">
        <UserAvatar
          user={user}
          className="w-10 h-10 rounded-xl bg-k-bg2 border border-k-line/10 shrink-0"
          fallbackClassName="text-lg"
        />
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={t('community.composerPlaceholder', {
              defaultValue: '分享你的学习心得...',
            })}
            className="w-full bg-transparent border-none outline-none resize-none text-[15px] font-medium text-k-ink min-h-[60px] placeholder:text-k-sub/40"
          />

          {selectedImages.length > 0 && (
            <div className="flex gap-2 mt-2 mb-3">
              {selectedImages.map((img, i) => (
                <div
                  key={i}
                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-k-line/10"
                >
                  <img src={img.preview} className="w-full h-full object-cover" alt="" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-k-line/5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-k-sub hover:text-k-crimson transition-colors"
            >
              <ImageIcon size={18} />
              <span className="text-[12px] font-bold">
                {t('common.image', { defaultValue: '图片' })}
              </span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />

            <button
              onClick={handleSubmit}
              disabled={(!content.trim() && selectedImages.length === 0) || isSubmitting}
              className="h-8 px-4 bg-k-ink text-white rounded-full text-[12px] font-black flex items-center gap-1.5 disabled:opacity-30 active:scale-95 transition-all"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {t('common.post', { defaultValue: '发布' })}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

const CommunityItem = ({ item, t }: { item: CommunityActivityDto; t: TFunction }) => {
  const likeActivity = useMutation(COMMUNITY.likeActivity);
  const unlikeActivity = useMutation(COMMUNITY.unlikeActivity);
  const tone = useMemo(() => getActivityTone(item.module || '', t), [item.module, t]);
  const images = item.images ?? [];

  const handleLike = async () => {
    try {
      if (item.likedByMe) {
        await unlikeActivity({ activityId: item.activityId, kind: item.kind });
      } else {
        await likeActivity({ activityId: item.activityId, kind: item.kind });
      }
    } catch (err) {
      console.error('Failed to toggle mobile community like', err);
    }
  };

  return (
    <Card pad={16} className="mb-4 border border-k-line/5 group">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-k-bg2 overflow-hidden border border-k-line/10 shrink-0">
          {item.actorAvatar ? (
            <img src={item.actorAvatar} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">
              {tone.emoji}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-black text-k-ink truncate">{item.actorName}</span>
            <Chip tone={tone.tone}>{tone.tag}</Chip>
          </div>
          <div className="text-[10px] font-bold text-k-sub/50 uppercase tracking-widest mt-0.5">
            {new Date(item.eventAt).toLocaleDateString()}
          </div>
        </div>
        <button className="text-k-sub/30">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="pl-1">
        <div className="text-[15px] font-medium text-k-ink2 leading-relaxed whitespace-pre-wrap">
          {item.content}
        </div>

        {images.length > 0 && (
          <div
            className={cn(
              'grid gap-2 mt-4 rounded-2xl overflow-hidden',
              images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            )}
          >
            {images.map((img, idx) => (
              <div
                key={idx}
                className={cn(
                  'relative aspect-square bg-k-bg2',
                  images.length === 1 && 'aspect-video'
                )}
              >
                <img src={img} className="w-full h-full object-cover" alt="" />
              </div>
            ))}
          </div>
        )}

        {item.attachment && (
          <div className="mt-4 p-4 rounded-2xl bg-k-bg2/40 border border-k-line/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-k-card flex items-center justify-center text-xl shadow-sm">
              📝
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-black text-k-ink truncate">
                {item.attachment.title}
              </div>
              <div className="text-[11px] font-bold text-k-sub/60 truncate">
                {item.attachment.description ?? ''}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-6 mt-6 pt-4 border-t border-k-line/5">
        <button
          onClick={handleLike}
          className={cn(
            'flex items-center gap-2 text-[12px] font-black transition-colors',
            item.likedByMe ? 'text-k-crimson' : 'text-k-sub'
          )}
        >
          <Heart size={18} fill={item.likedByMe ? 'currentColor' : 'none'} />
          {item.likeCount || t('community.like', { defaultValue: '赞' })}
        </button>
        <button className="flex items-center gap-2 text-[12px] font-black text-k-sub">
          <MessageCircle size={18} />
          {item.commentCount || t('community.comment', { defaultValue: '评论' })}
        </button>
      </div>
    </Card>
  );
};

// --- Main Page ---

export default function MobileCommunityPage() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'qa' | 'rank'>('feed');

  // Search State
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [friendActionBusy, setFriendActionBusy] = useState<Record<string, boolean>>({});
  const [friendRelationOverrides, setFriendRelationOverrides] = useState<
    Record<string, FriendRelationOverride | undefined>
  >({});

  const user = useQuery(COMMUNITY.getViewer, {});
  const communityFeed = useQuery(COMMUNITY.getCommunityFeed, { limit: 20 });
  const weeklyTop = useQuery(LEADERBOARD.getWeeklyTop, { limit: 10 });
  const weeklyOverview = useQuery(LEADERBOARD.getWeeklyOverview, {});

  const searchUsers = useQuery(
    FRIENDS.searchUsers,
    searchQuery.length >= 2 ? { query: searchQuery, limit: 6 } : 'skip'
  );

  const sendRequestByCode = useMutation(FRIENDS.sendRequestByCode);

  const [showGuidelines, setShowGuidelines] = useState(true);

  React.useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => globalThis.clearTimeout(timeoutId);
  }, [searchInput]);

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

  const stats = useMemo(
    () => ({
      myRank: weeklyOverview?.myRank,
      total: weeklyOverview?.totalRanked,
      endsAt: weeklyOverview?.weekEndsAt,
    }),
    [weeklyOverview]
  );

  return (
    <PageShell>
      <PageIntro
        hanja="會"
        latin="COMMUNITY"
        title={t('community.mobile.title', { defaultValue: '学习伙伴' })}
        subtitle={t('community.mobile.subtitle', { defaultValue: '与全球学习者一起进步' })}
      />

      <div className="px-5 mb-6">
        <div className="flex p-1 bg-k-bg2 rounded-2xl border border-k-line/5">
          <button
            onClick={() => setActiveTab('feed')}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all',
              activeTab === 'feed' ? 'bg-k-card text-k-ink shadow-sm' : 'text-k-sub'
            )}
          >
            {t('community.tabs.feed', { defaultValue: '动态' })}
          </button>
          <button
            onClick={() => {
              setActiveTab('qa');
              navigate('/community/qa');
            }}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all',
              activeTab === 'qa' ? 'bg-k-card text-k-ink shadow-sm' : 'text-k-sub'
            )}
          >
            {t('qa.tabQA', { defaultValue: 'Q&A' })}
          </button>
          <button
            onClick={() => setActiveTab('rank')}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-[13px] font-black transition-all',
              activeTab === 'rank' ? 'bg-k-card text-k-ink shadow-sm' : 'text-k-sub'
            )}
          >
            {t('community.tabs.rank', { defaultValue: '排行' })}
          </button>
        </div>
      </div>

      <div className="px-5 pb-10">
        {activeTab === 'feed' ? (
          <div className="space-y-4">
            <PostComposer user={user} onSuccess={() => {}} />

            {showGuidelines && (
              <Card pad={20} className="bg-k-ink text-k-bg mb-6 relative overflow-hidden">
                <button
                  onClick={() => setShowGuidelines(false)}
                  className="absolute top-3 right-3 text-k-bg/40"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-k-butter/20 flex items-center justify-center">
                    <Trophy size={12} className="text-k-butter" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-k-butter">
                    社区准则
                  </span>
                </div>
                <p className="text-[13px] font-medium leading-relaxed opacity-90 mb-4">
                  欢迎来到 DuHan 社区！请保持友善交流，分享高质量的学习笔记。
                </p>
                <button className="w-full py-2.5 bg-k-bg text-k-ink rounded-xl text-[12px] font-black active:scale-95 transition-all">
                  查看完整指南
                </button>
              </Card>
            )}

            <AnimatePresence>
              {communityFeed === undefined ? (
                <div className="flex flex-col items-center py-20 opacity-30">
                  <Loader2 className="animate-spin mb-2" size={24} />
                  <span className="text-[12px] font-bold">正在加载伙伴动态...</span>
                </div>
              ) : communityFeed.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-k-bg2 rounded-[32px] flex items-center justify-center mx-auto mb-4">
                    <Users size={32} className="text-k-sub/20" />
                  </div>
                  <div className="text-[13px] font-black text-k-sub/40 uppercase tracking-widest">
                    暂无好友动态
                  </div>
                </div>
              ) : (
                communityFeed.map(item => (
                  <motion.div
                    key={item.activityId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <CommunityItem item={item} t={t} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-4">
            <Card pad={16} className="mb-6 shadow-k-sh-sm border border-k-line/5">
              <SectionHead
                title={t('friends.searchTitle', { defaultValue: '添加好友' })}
                kanji="友"
              />
              <div className="relative mt-2">
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder={t('friends.searchPlaceholder', {
                    defaultValue: '输入昵称或好友码...',
                  })}
                  className="w-full h-11 bg-k-bg2 rounded-xl border border-k-line/5 px-4 text-[13px] font-medium outline-none focus:border-k-crimson/30 transition-colors"
                />
                {searchQuery.length >= 2 && (
                  <div className="mt-4 space-y-3">
                    {searchUsers === undefined && (
                      <div className="py-2 text-center text-[12px] text-k-sub animate-pulse">
                        Searching...
                      </div>
                    )}
                    {searchUsers?.length === 0 && (
                      <div className="py-2 text-center text-[12px] text-k-sub">No users found</div>
                    )}
                    {searchUsers?.map(item => {
                      const key = String(item.userId);
                      const relation = friendRelationOverrides[key] ?? item.relation;
                      const disabled = relation !== 'none' || !!friendActionBusy[key];
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-k-bg2 overflow-hidden border border-k-line/10">
                            {item.avatarUrl ? (
                              <img src={item.avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[12px] font-black text-k-sub/30 bg-k-bg2">
                                {item.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-black text-k-ink truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] font-bold text-k-sub/50">
                              {item.friendCode}
                            </div>
                          </div>
                          <button
                            disabled={disabled}
                            onClick={() => handleAddFriend(item)}
                            className={cn(
                              'h-8 px-4 rounded-full text-[11px] font-black transition-all active:scale-95',
                              relation === 'none' ? 'bg-k-ink text-white' : 'bg-k-bg2 text-k-sub/50'
                            )}
                          >
                            {relation === 'already_friends'
                              ? t('friends.isFriend', { defaultValue: '已是好友' })
                              : relation === 'already_requested'
                                ? t('friends.sent', { defaultValue: '已申请' })
                                : t('friends.add', { defaultValue: '加好友' })}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            <Card
              pad={20}
              className="bg-gradient-to-br from-k-ink to-k-ink2 text-k-bg shadow-k-sh-lg mb-6 overflow-hidden relative"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-k-butter opacity-5 blur-[60px]" />
              <div className="flex items-center justify-between mb-4">
                <Chip tone="butter">{t('leaderboard.weekly', { defaultValue: '本周排行' })}</Chip>
                <div className="text-[10px] font-black text-k-bg/40 uppercase tracking-widest">
                  {stats.myRank ? `#${stats.myRank} / ${stats.total}` : 'Loading...'}
                </div>
              </div>
              <div className="text-[28px] font-black tracking-tight mb-1 flex items-center gap-3">
                <Trophy className="text-k-butter" size={28} />
                <span>排行榜</span>
              </div>
              <div className="text-[12px] font-bold text-k-bg/60">
                前 10 名用户将进入下一轮精英榜单
              </div>
            </Card>

            <SectionHead
              title={t('leaderboard.topLearners', { defaultValue: '顶尖学习者' })}
              kanji="榜"
            />

            <Card pad={0} className="overflow-hidden border border-k-line/5 shadow-k-sh-sm">
              <div className="divide-y divide-k-line/5">
                {weeklyTop?.map((p, i) => (
                  <div
                    key={i}
                    className={cn(
                      'px-5 py-4 flex items-center gap-4 transition-colors',
                      p.isMe ? 'bg-k-butter/10' : ''
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black',
                        i === 0
                          ? 'bg-k-gold text-white'
                          : i === 1
                            ? 'bg-k-ink/20 text-k-ink'
                            : i === 2
                              ? 'bg-k-butter text-k-ink'
                              : 'bg-k-bg2 text-k-sub/50'
                      )}
                    >
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-k-bg2 overflow-hidden border border-k-line/10 shrink-0">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">
                          👤
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-[14px] truncate tracking-tight',
                          p.isMe ? 'font-black text-k-ink' : 'font-bold text-k-ink2'
                        )}
                      >
                        {p.name}
                        {p.isMe && <span className="ml-1 opacity-50">(我)</span>}
                      </div>
                      <div className="text-[10px] font-bold text-k-sub/40 uppercase tracking-widest">
                        Learner
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-k-serif text-[18px] text-k-crimson font-black tracking-tighter leading-none">
                        {p.currentWeekXp.toLocaleString()}
                      </div>
                      <span className="text-[9px] font-black text-k-sub/30 uppercase">XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageShell>
  );
}
