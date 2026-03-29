import React, { useEffect, useState } from 'react';
import {
  Shield,
  User as UserIcon,
  ShieldAlert,
  NotebookPen,
  History,
  Activity,
  BookOpen,
  KeyRound,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
} from '../ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { cn } from '../../lib/utils';
import type { AdminProfileFormState, AdminUserDetail } from './userManagementTypes';
import {
  ADMIN_BILLING_CYCLE_OPTIONS,
  ADMIN_PLAN_OPTIONS,
  buildProfileUpdatePayload,
  formatAdminDateTime,
  formatRelativeActivity,
  getAccountStatusLabel,
  getInitialProfileForm,
  getKycStatusLabel,
  getPlanLabel,
  getSubscriptionStatusLabel,
} from './userManagementUtils';

type DetailTab = 'overview' | 'learning' | 'security' | 'ops';

type UserDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: AdminUserDetail | null | undefined;
  loading: boolean;
  initialTab?: DetailTab;
  savingProfile: boolean;
  savingStatus: boolean;
  addingNote: boolean;
  onSaveProfile: (updates: ReturnType<typeof buildProfileUpdatePayload>) => Promise<void>;
  onSetAccountStatus: (status: 'ACTIVE' | 'DISABLED', reason?: string) => Promise<void>;
  onAddNote: (body: string) => Promise<void>;
};

function MetricCard(props: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">{props.label}</div>
      <div className="mt-2 text-2xl font-black text-zinc-900">{props.value}</div>
      {props.hint ? <div className="mt-1 text-sm text-zinc-500">{props.hint}</div> : null}
    </div>
  );
}

function TimelineCard(props: {
  title: string;
  emptyText: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  hasItems: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2 text-zinc-900">
        {props.icon}
        <h4 className="font-black">{props.title}</h4>
      </div>
      {props.hasItems ? props.children : <p className="text-sm text-zinc-400">{props.emptyText}</p>}
    </div>
  );
}

function actorLabel(actor: AdminUserDetail['adminNotes'][number]['author']) {
  if (!actor) return '系统';
  return actor.name || actor.email || actor.id;
}

export const UserDetailSheet: React.FC<UserDetailSheetProps> = ({
  open,
  onOpenChange,
  detail,
  loading,
  initialTab = 'overview',
  savingProfile,
  savingStatus,
  addingNote,
  onSaveProfile,
  onSetAccountStatus,
  onAddNote,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [profileForm, setProfileForm] = useState<AdminProfileFormState>(
    getInitialProfileForm(null)
  );
  const [noteBody, setNoteBody] = useState('');
  const [disableReason, setDisableReason] = useState('');
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(initialTab);
    }
  }, [initialTab, open, detail?.user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileForm(getInitialProfileForm(detail ?? null));
    setDisableReason('');
    setConfirmDisable(false);
    setConfirmRestore(false);
  }, [detail]);

  const currentUser = detail?.user ?? null;

  const handleSaveProfile = async () => {
    try {
      const payload = buildProfileUpdatePayload(profileForm);
      await onSaveProfile(payload);
    } catch (error) {
      alert((error as Error).message || '保存失败');
    }
  };

  const handleAddNote = async () => {
    const body = noteBody.trim();
    if (!body) {
      alert('请先填写备注内容');
      return;
    }
    await onAddNote(body);
    setNoteBody('');
  };

  const handleAccountStatusAction = async () => {
    if (!currentUser) return;
    if (currentUser.accountStatus === 'ACTIVE') {
      if (!disableReason.trim()) {
        alert('禁用账号必须填写原因');
        return;
      }
      if (!confirmDisable) {
        alert('请先确认禁用操作');
        return;
      }
      await onSetAccountStatus('DISABLED', disableReason.trim());
      setDisableReason('');
      setConfirmDisable(false);
      return;
    }

    if (!confirmRestore) {
      alert('请先确认恢复操作');
      return;
    }
    await onSetAccountStatus('ACTIVE');
    setConfirmRestore(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay />
        <SheetContent className="right-0 top-0 h-full w-full max-w-[960px] overflow-y-auto border-l border-zinc-200 bg-[#FDFBF7] p-0 shadow-2xl">
          <div className="min-h-full">
            <SheetHeader className="border-b border-zinc-200 bg-white px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-zinc-200 bg-zinc-100">
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name || currentUser.email}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="text-zinc-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle className="text-2xl font-black text-zinc-900">
                      {currentUser?.name || '未设置昵称'}
                    </SheetTitle>
                    {currentUser ? (
                      <>
                        <Badge
                          variant="outline"
                          className={cn(
                            currentUser.accountStatus === 'DISABLED'
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          )}
                        >
                          {getAccountStatusLabel(currentUser.accountStatus)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-50 text-amber-700"
                        >
                          {getPlanLabel(currentUser.resolvedPlan)}
                        </Badge>
                        <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">
                          {getSubscriptionStatusLabel(currentUser.subscriptionStatus)}
                        </Badge>
                      </>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-zinc-500">
                    {currentUser?.email || '加载中...'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-zinc-500">
                    <span>ID: {currentUser?.id || '—'}</span>
                    <span>角色: {currentUser?.role === 'ADMIN' ? '管理员' : '普通用户'}</span>
                    <span>最近活跃: {formatRelativeActivity(currentUser?.lastActivityAt)}</span>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="px-6 py-6">
              {loading || !detail || !currentUser ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-400">
                  正在加载用户详情...
                </div>
              ) : (
                <Tabs
                  value={activeTab}
                  onValueChange={value => setActiveTab(value as DetailTab)}
                  className="space-y-6"
                >
                  <TabsList className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2">
                    <TabsTrigger
                      value="overview"
                      className={cn(
                        'rounded-xl px-4 py-2 text-sm font-bold',
                        activeTab === 'overview' ? 'bg-zinc-900 text-white' : 'text-zinc-500'
                      )}
                    >
                      概览
                    </TabsTrigger>
                    <TabsTrigger
                      value="learning"
                      className={cn(
                        'rounded-xl px-4 py-2 text-sm font-bold',
                        activeTab === 'learning' ? 'bg-zinc-900 text-white' : 'text-zinc-500'
                      )}
                    >
                      学习画像
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className={cn(
                        'rounded-xl px-4 py-2 text-sm font-bold',
                        activeTab === 'security' ? 'bg-zinc-900 text-white' : 'text-zinc-500'
                      )}
                    >
                      权限与安全
                    </TabsTrigger>
                    <TabsTrigger
                      value="ops"
                      className={cn(
                        'rounded-xl px-4 py-2 text-sm font-bold',
                        activeTab === 'ops' ? 'bg-zinc-900 text-white' : 'text-zinc-500'
                      )}
                    >
                      备注与审计
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="注册时间"
                        value={formatAdminDateTime(currentUser.createdAt)}
                      />
                      <MetricCard
                        label="最近登录"
                        value={formatAdminDateTime(currentUser.lastLoginAt)}
                      />
                      <MetricCard
                        label="最近活跃"
                        value={formatRelativeActivity(currentUser.lastActivityAt)}
                        hint={currentUser.lastActivityType || '暂无行为类型'}
                      />
                      <MetricCard
                        label="总学习时长"
                        value={`${currentUser.totalStudyMinutes} 分钟`}
                      />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
                      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                        <div className="mb-4 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-zinc-500" />
                          <h4 className="font-black text-zinc-900">当前学习位置</h4>
                        </div>
                        <dl className="grid gap-4 md:grid-cols-2">
                          <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                              课程
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-zinc-900">
                              {detail.learning.currentPointer.instituteName || '暂无'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                              等级 / 单元
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-zinc-900">
                              {detail.learning.currentPointer.level
                                ? `Level ${detail.learning.currentPointer.level} · Unit ${detail.learning.currentPointer.unit || '-'}`
                                : '暂无'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                              模块
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-zinc-900">
                              {detail.learning.currentPointer.module || '暂无'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                              最近课程访问
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-zinc-900">
                              {formatAdminDateTime(
                                detail.learning.courses.recentCourseLastAccessAt
                              )}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                        <div className="mb-4 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-zinc-500" />
                          <h4 className="font-black text-zinc-900">账号摘要</h4>
                        </div>
                        <dl className="space-y-3 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-zinc-500">账号状态</dt>
                            <dd className="font-semibold text-zinc-900">
                              {getAccountStatusLabel(currentUser.accountStatus)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-zinc-500">会员状态</dt>
                            <dd className="font-semibold text-zinc-900">
                              {getSubscriptionStatusLabel(detail.membership.subscriptionStatus)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-zinc-500">邮箱验证</dt>
                            <dd className="font-semibold text-zinc-900">
                              {currentUser.emailVerified ? '已验证' : '未验证'}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-zinc-500">KYC 状态</dt>
                            <dd className="font-semibold text-zinc-900">
                              {getKycStatusLabel(currentUser.kycStatus)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <dt className="text-zinc-500">地区资格</dt>
                            <dd className="font-semibold text-zinc-900">
                              {currentUser.isRegionalPromoEligible
                                ? `${currentUser.phoneRegion || 'OTHER'} 已达标`
                                : '未达标'}
                            </dd>
                          </div>
                        </dl>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 w-full"
                          onClick={() => setActiveTab('ops')}
                        >
                          去写管理员备注
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="learning" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="词汇总量"
                        value={detail.learning.vocab.total}
                        hint={`掌握 ${detail.learning.vocab.mastered} · 待复习 ${detail.learning.vocab.dueReviews}`}
                      />
                      <MetricCard
                        label="语法进度"
                        value={detail.learning.grammar.total}
                        hint={`掌握 ${detail.learning.grammar.mastered}`}
                      />
                      <MetricCard
                        label="课程进度"
                        value={detail.learning.courses.totalCourses}
                        hint={`完成 ${detail.learning.courses.totalCompletedUnits} 个单元`}
                      />
                      <MetricCard
                        label="TOPIK 记录"
                        value={detail.learning.exams.totalAttempts}
                        hint={`平均分 ${detail.learning.exams.averageScore}`}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="笔记页"
                        value={detail.learning.notes.totalPages}
                        hint={`归档 ${detail.learning.notes.archivedPages} · 模板 ${detail.learning.notes.templates}`}
                      />
                      <MetricCard label="标注数" value={detail.learning.annotations.total} />
                      <MetricCard
                        label="打字最佳 WPM"
                        value={detail.learning.typing.bestWpm}
                        hint={`平均准确率 ${detail.learning.typing.averageAccuracy}%`}
                      />
                      <MetricCard
                        label="AI 调用 (30天)"
                        value={detail.learning.ai.callsLast30Days}
                        hint={`$${detail.learning.ai.totalCostLast30Days.toFixed(1)} / ${detail.learning.ai.totalTokensLast30Days} tokens`}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="学习事件模块数"
                        value={detail.learning.moduleBreakdown.length}
                        hint="最近事件中的有效模块分布"
                      />
                      <MetricCard
                        label="指针归一化"
                        value={detail.learning.health.invalidLastModule ? '异常' : '正常'}
                        hint="检查 lastModule 是否可映射到规范模块"
                      />
                      <MetricCard
                        label="活跃缓存"
                        value={detail.learning.health.lastActivityCacheMismatch ? '漂移' : '正常'}
                        hint="最近活跃缓存与 activity_logs 是否一致"
                      />
                      <MetricCard
                        label="最近 Summary"
                        value={detail.recentLearningSessions.length}
                        hint="最近学习事件会话摘要"
                      />
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                      <TimelineCard
                        title="最近学习活动"
                        emptyText="暂无活动记录"
                        icon={<Activity className="h-4 w-4 text-zinc-500" />}
                        hasItems={detail.recentActivity.length > 0}
                      >
                        <div className="space-y-3">
                          {detail.recentActivity.map(item => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-zinc-900">{item.activityType}</span>
                                <span className="text-xs text-zinc-500">
                                  {formatAdminDateTime(item.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-zinc-500">
                                时长 {item.duration} 分钟 · 学习项 {item.itemsStudied}
                              </p>
                            </div>
                          ))}
                        </div>
                      </TimelineCard>

                      <TimelineCard
                        title="最近学习会话"
                        emptyText="暂无学习事件"
                        icon={<BookOpen className="h-4 w-4 text-zinc-500" />}
                        hasItems={detail.recentLearningSessions.length > 0}
                      >
                        <div className="space-y-3">
                          {detail.recentLearningSessions.map(item => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-zinc-900">
                                  {item.module} · {item.eventName}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  {formatAdminDateTime(item.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-zinc-500">
                                Session {item.sessionId.slice(0, 12)} · {item.durationSec}s · 学习项{' '}
                                {item.itemCount}
                              </p>
                            </div>
                          ))}
                        </div>
                      </TimelineCard>

                      <TimelineCard
                        title="最近考试"
                        emptyText="暂无考试记录"
                        icon={<History className="h-4 w-4 text-zinc-500" />}
                        hasItems={detail.recentExamAttempts.length > 0}
                      >
                        <div className="space-y-3">
                          {detail.recentExamAttempts.map(item => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-zinc-900">{item.examTitle}</span>
                                <span className="text-xs text-zinc-500">
                                  {formatAdminDateTime(item.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-zinc-500">
                                得分 {item.score} / {item.maxScore} · 正确 {item.correctCount}
                              </p>
                            </div>
                          ))}
                        </div>
                      </TimelineCard>

                      <TimelineCard
                        title="最近收听"
                        emptyText="暂无播客收听记录"
                        icon={<NotebookPen className="h-4 w-4 text-zinc-500" />}
                        hasItems={detail.recentListeningHistory.length > 0}
                      >
                        <div className="space-y-3">
                          {detail.recentListeningHistory.map(item => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-zinc-100 bg-zinc-50 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-zinc-900">{item.episodeTitle}</span>
                                <span className="text-xs text-zinc-500">
                                  {formatAdminDateTime(item.playedAt)}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-zinc-500">
                                {item.channelName} · {item.progress}s / {item.duration}s
                              </p>
                            </div>
                          ))}
                        </div>
                      </TimelineCard>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4 text-zinc-500" />
                        <h4 className="font-black text-zinc-900">模块分布</h4>
                      </div>
                      {detail.learning.moduleBreakdown.length === 0 ? (
                        <p className="text-sm text-zinc-400">暂无可展示的学习事件分布</p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {detail.learning.moduleBreakdown.map(item => (
                            <div
                              key={item.module}
                              className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                            >
                              <div className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                                {item.module}
                              </div>
                              <div className="mt-2 text-2xl font-black text-zinc-900">
                                {item.minutes} 分钟
                              </div>
                              <div className="mt-1 text-sm text-zinc-500">
                                {item.sessions} 个 session
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="security" className="space-y-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-zinc-500" />
                        <h4 className="font-black text-zinc-900">账户资料与会员配置</h4>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor="admin-user-name"
                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
                          >
                            昵称
                          </label>
                          <Input
                            id="admin-user-name"
                            value={profileForm.name}
                            onChange={event =>
                              setProfileForm(prev => ({ ...prev, name: event.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="admin-user-role"
                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
                          >
                            角色
                          </label>
                          <Select
                            id="admin-user-role"
                            value={profileForm.role}
                            onChange={event =>
                              setProfileForm(prev => ({
                                ...prev,
                                role: event.target.value as AdminProfileFormState['role'],
                              }))
                            }
                          >
                            <option value="STUDENT">普通用户</option>
                            <option value="ADMIN">管理员</option>
                          </Select>
                        </div>
                        <div>
                          <label
                            htmlFor="admin-user-email-verified"
                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
                          >
                            邮箱验证
                          </label>
                          <Select
                            id="admin-user-email-verified"
                            value={profileForm.emailVerified ? 'true' : 'false'}
                            onChange={event =>
                              setProfileForm(prev => ({
                                ...prev,
                                emailVerified: event.target.value === 'true',
                              }))
                            }
                          >
                            <option value="true">已验证</option>
                            <option value="false">未验证</option>
                          </Select>
                        </div>
                        <div>
                          <label
                            htmlFor="admin-user-kyc"
                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
                          >
                            KYC 状态
                          </label>
                          <Select
                            id="admin-user-kyc"
                            value={profileForm.kycStatus}
                            onChange={event =>
                              setProfileForm(prev => ({
                                ...prev,
                                kycStatus: event.target.value as AdminProfileFormState['kycStatus'],
                              }))
                            }
                          >
                            <option value="NONE">未认证</option>
                            <option value="VERIFIED">已认证</option>
                          </Select>
                        </div>
                        <div>
                          <label
                            htmlFor="admin-user-plan"
                            className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
                          >
                            会员方案
                          </label>
                          <Select
                            id="admin-user-plan"
                            value={profileForm.plan}
                            onChange={event =>
                              setProfileForm(prev => ({
                                ...prev,
                                plan: event.target.value as AdminProfileFormState['plan'],
                              }))
                            }
                          >
                            {ADMIN_PLAN_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                        {profileForm.plan === 'PRO' ? (
                          <>
                            <div>
                              <label
                                htmlFor="admin-user-billing"
                                className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
                              >
                                订阅周期
                              </label>
                              <Select
                                id="admin-user-billing"
                                value={profileForm.subscriptionType}
                                onChange={event =>
                                  setProfileForm(prev => ({
                                    ...prev,
                                    subscriptionType: event.target
                                      .value as AdminProfileFormState['subscriptionType'],
                                  }))
                                }
                              >
                                {ADMIN_BILLING_CYCLE_OPTIONS.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div>
                              <label
                                htmlFor="admin-user-expiry"
                                className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
                              >
                                到期时间
                              </label>
                              <Input
                                id="admin-user-expiry"
                                type="date"
                                value={profileForm.subscriptionExpiry}
                                onChange={event =>
                                  setProfileForm(prev => ({
                                    ...prev,
                                    subscriptionExpiry: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          </>
                        ) : null}
                      </div>
                      <Button className="mt-5" loading={savingProfile} onClick={handleSaveProfile}>
                        保存账户配置
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-zinc-500" />
                        <h4 className="font-black text-zinc-900">账号状态控制</h4>
                      </div>
                      {currentUser.accountStatus === 'ACTIVE' ? (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            禁用后，该用户通过 `users:viewer`
                            将无法继续访问前台，现有会话会被系统自动踢回登录流。
                          </div>
                          <div>
                            <label
                              htmlFor="disable-reason"
                              className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500"
                            >
                              禁用原因
                            </label>
                            <Textarea
                              id="disable-reason"
                              value={disableReason}
                              onChange={event => setDisableReason(event.target.value)}
                              placeholder="请输入禁用原因"
                            />
                          </div>
                          <label className="flex items-center gap-3 text-sm font-medium text-zinc-600">
                            <input
                              type="checkbox"
                              checked={confirmDisable}
                              onChange={event => setConfirmDisable(event.target.checked)}
                            />
                            我确认要禁用该账号，并且已填写明确原因
                          </label>
                          <Button
                            variant="destructive"
                            loading={savingStatus}
                            onClick={handleAccountStatusAction}
                          >
                            禁用账号
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                            <p>当前账号已禁用</p>
                            <p className="mt-1">
                              禁用时间：{formatAdminDateTime(currentUser.disabledAt)}
                            </p>
                            <p className="mt-1">禁用原因：{currentUser.disabledReason || '—'}</p>
                            <p className="mt-1">
                              操作人：{actorLabel(currentUser.disabledBy || null)}
                            </p>
                          </div>
                          <label className="flex items-center gap-3 text-sm font-medium text-zinc-600">
                            <input
                              type="checkbox"
                              checked={confirmRestore}
                              onChange={event => setConfirmRestore(event.target.checked)}
                            />
                            我确认恢复该账号访问权限
                          </label>
                          <Button
                            variant="outline"
                            loading={savingStatus}
                            onClick={handleAccountStatusAction}
                          >
                            恢复账号
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="ops" className="space-y-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <NotebookPen className="h-4 w-4 text-zinc-500" />
                        <h4 className="font-black text-zinc-900">新增管理员备注</h4>
                      </div>
                      <Textarea
                        value={noteBody}
                        onChange={event => setNoteBody(event.target.value)}
                        placeholder="记录与该用户相关的运营观察、沟通结论或后续跟进"
                      />
                      <Button className="mt-4" loading={addingNote} onClick={handleAddNote}>
                        添加备注
                      </Button>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <TimelineCard
                        title="管理员备注"
                        emptyText="暂无管理员备注"
                        icon={<NotebookPen className="h-4 w-4 text-zinc-500" />}
                        hasItems={detail.adminNotes.length > 0}
                      >
                        <div className="space-y-3">
                          {detail.adminNotes.map(note => (
                            <div
                              key={note.id}
                              className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <span className="font-bold text-zinc-900">
                                  {actorLabel(note.author)}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  {formatAdminDateTime(note.createdAt)}
                                </span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                                {note.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      </TimelineCard>

                      <TimelineCard
                        title="操作审计"
                        emptyText="暂无审计记录"
                        icon={<Shield className="h-4 w-4 text-zinc-500" />}
                        hasItems={detail.auditLogs.length > 0}
                      >
                        <div className="space-y-3">
                          {detail.auditLogs.map(log => (
                            <div
                              key={log.id}
                              className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <div className="font-bold text-zinc-900">{log.action}</div>
                                  <div className="text-xs text-zinc-500">
                                    {actorLabel(log.actor)}
                                  </div>
                                </div>
                                <span className="text-xs text-zinc-500">
                                  {formatAdminDateTime(log.createdAt)}
                                </span>
                              </div>
                              {Object.keys(log.metadata || {}).length > 0 ? (
                                <dl className="mt-3 space-y-1 text-sm text-zinc-600">
                                  {Object.entries(log.metadata).map(([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex items-start justify-between gap-4"
                                    >
                                      <dt className="font-medium text-zinc-500">{key}</dt>
                                      <dd className="text-right text-zinc-700">{String(value)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </TimelineCard>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};
