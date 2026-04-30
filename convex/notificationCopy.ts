import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

const SUPPORTED_LANGUAGES = ['en', 'zh', 'vi', 'mn'] as const;
export type NotificationLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type NotificationText = Readonly<{
  title: string;
  body: string;
}>;

function isSupportedLanguage(value: string): value is NotificationLanguage {
  return SUPPORTED_LANGUAGES.includes(value as NotificationLanguage);
}

export function normalizeNotificationLanguage(value: string | undefined): NotificationLanguage {
  const normalized = (value ?? '').trim().toLowerCase();
  if (isSupportedLanguage(normalized)) return normalized;
  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('vi')) return 'vi';
  if (normalized.startsWith('mn')) return 'mn';
  return 'en';
}

export async function resolveNotificationLanguage(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>
): Promise<NotificationLanguage> {
  const settings = await ctx.db
    .query('user_settings')
    .withIndex('by_user', q => q.eq('userId', userId))
    .first();
  const raw = typeof settings?.displayLanguage === 'string' ? settings.displayLanguage : undefined;
  return normalizeNotificationLanguage(raw);
}

export function buildFriendRequestCopy(args: {
  language: NotificationLanguage;
  inviterName: string;
}): NotificationText {
  const name = args.inviterName.trim() || 'Learner';
  if (args.language === 'zh') {
    return {
      title: '好友请求',
      body: `${name} 向你发送了好友请求。`,
    };
  }
  if (args.language === 'vi') {
    return {
      title: 'Lời mời kết bạn',
      body: `${name} đã gửi lời mời kết bạn.`,
    };
  }
  if (args.language === 'mn') {
    return {
      title: 'Найзын хүсэлт',
      body: `${name} найзын хүсэлт илгээлээ.`,
    };
  }
  return {
    title: 'Friend request',
    body: `${name} sent you a friend request.`,
  };
}

export function buildFriendAcceptedCopy(args: {
  language: NotificationLanguage;
  accepterName: string;
}): NotificationText {
  const name = args.accepterName.trim() || 'Learner';
  if (args.language === 'zh') {
    return {
      title: '好友请求已通过',
      body: `${name} 已通过你的好友请求。`,
    };
  }
  if (args.language === 'vi') {
    return {
      title: 'Đã chấp nhận kết bạn',
      body: `${name} đã chấp nhận lời mời kết bạn của bạn.`,
    };
  }
  if (args.language === 'mn') {
    return {
      title: 'Найзын хүсэлт зөвшөөрөгдлөө',
      body: `${name} таны найзын хүсэлтийг зөвшөөрлөө.`,
    };
  }
  return {
    title: 'Friend request accepted',
    body: `${name} accepted your friend request.`,
  };
}

export function buildBecameFriendsCopy(args: {
  language: NotificationLanguage;
  friendName: string;
}): NotificationText {
  const name = args.friendName.trim() || 'Learner';
  if (args.language === 'zh') {
    return {
      title: '已成为好友',
      body: `你已和 ${name} 成为好友。`,
    };
  }
  if (args.language === 'vi') {
    return {
      title: 'Đã kết bạn',
      body: `Bạn và ${name} đã trở thành bạn bè.`,
    };
  }
  if (args.language === 'mn') {
    return {
      title: 'Найз боллоо',
      body: `Та ${name}-тай найз боллоо.`,
    };
  }
  return {
    title: 'Friend added',
    body: `You and ${name} are now friends.`,
  };
}

export function buildGroupInviteCopy(args: {
  language: NotificationLanguage;
  inviterName: string;
  groupName: string;
}): NotificationText {
  const inviterName = args.inviterName.trim() || 'Learner';
  const groupName = args.groupName.trim() || 'Study group';
  if (args.language === 'zh') {
    return {
      title: '学习小组邀请',
      body: `${inviterName} 邀请你加入“${groupName}”。`,
    };
  }
  if (args.language === 'vi') {
    return {
      title: 'Lời mời nhóm học',
      body: `${inviterName} đã mời bạn vào nhóm “${groupName}”.`,
    };
  }
  if (args.language === 'mn') {
    return {
      title: 'Сургалтын бүлгийн урилга',
      body: `${inviterName} таныг “${groupName}” бүлэгт урьлаа.`,
    };
  }
  return {
    title: 'Study group invite',
    body: `${inviterName} invited you to join “${groupName}”.`,
  };
}

export function buildGroupAcceptedCopy(args: {
  language: NotificationLanguage;
  accepterName: string;
  groupName: string;
}): NotificationText {
  const accepterName = args.accepterName.trim() || 'Learner';
  const groupName = args.groupName.trim() || 'Study group';
  if (args.language === 'zh') {
    return {
      title: '小组邀请已接受',
      body: `${accepterName} 已加入“${groupName}”。`,
    };
  }
  if (args.language === 'vi') {
    return {
      title: 'Đã chấp nhận lời mời',
      body: `${accepterName} đã tham gia nhóm “${groupName}”.`,
    };
  }
  if (args.language === 'mn') {
    return {
      title: 'Урилга зөвшөөрөгдлөө',
      body: `${accepterName} “${groupName}” бүлэгт нэгдлээ.`,
    };
  }
  return {
    title: 'Invite accepted',
    body: `${accepterName} joined “${groupName}”.`,
  };
}

export function buildPartnerAcceptedCopy(language: NotificationLanguage): NotificationText {
  if (language === 'zh') {
    return {
      title: '学习伙伴已加入',
      body: '你的学习伙伴关系已生效，今天一起开始一次学习吧。',
    };
  }
  if (language === 'vi') {
    return {
      title: 'Bạn học đã tham gia',
      body: 'Quan hệ đồng học đã được kích hoạt. Hãy bắt đầu một buổi học cùng nhau hôm nay.',
    };
  }
  if (language === 'mn') {
    return {
      title: 'Суралцах найз нэгдлээ',
      body: 'Таны хамтрагчийн холбоо идэвхжлээ. Өнөөдөр хамтдаа нэг хичээл эхлүүлээрэй.',
    };
  }
  return {
    title: 'Your study buddy joined',
    body: 'Your partnership is now active. Start a session together today.',
  };
}

export function buildStreakReminderCopy(language: NotificationLanguage): NotificationText {
  if (language === 'zh') {
    return {
      title: '继续学习提醒',
      body: '你今天有待复习内容，完成一个短练习保持节奏。',
    };
  }
  if (language === 'vi') {
    return {
      title: 'Nhắc nhở học tập',
      body: 'Bạn có nội dung cần ôn hôm nay. Hãy làm một bài ngắn để giữ nhịp.',
    };
  }
  if (language === 'mn') {
    return {
      title: 'Суралцах сануулга',
      body: 'Өнөөдөр танд давтах зүйл байна. Жаахан богино дасгал хийж хэмнэлээ хадгалаарай.',
    };
  }
  return {
    title: 'Keep learning',
    body: 'You have reviews due today. Finish a short session to keep your streak going.',
  };
}

export function buildFriendActivityDigestCopy(language: NotificationLanguage): NotificationText {
  if (language === 'zh') {
    return {
      title: '好友学习动态',
      body: '你的好友今天有新的学习进度，去社区看看吧。',
    };
  }
  if (language === 'vi') {
    return {
      title: 'Hoạt động của bạn bè',
      body: 'Bạn bè của bạn có tiến độ học mới hôm nay. Vào cộng đồng để xem nhé.',
    };
  }
  if (language === 'mn') {
    return {
      title: 'Найзуудын ахиц',
      body: 'Таны найзууд өнөөдөр шинэ ахиц гаргасан байна. Нийгэмлэг рүү ороод хараарай.',
    };
  }
  return {
    title: 'Friend activity',
    body: 'Your friends made progress today. Open the community to see updates.',
  };
}

export function buildExamCountdownCopy(args: {
  language: NotificationLanguage;
  examTitle: string;
  scheduledIso: string;
  daysUntil: number;
  hoursUntil: number;
}): NotificationText {
  const titleSuffix = args.examTitle.trim() || 'TOPIK';
  const scheduledLabel = args.scheduledIso;

  const isHourLevel = args.daysUntil <= 1 && args.hoursUntil > 0 && args.hoursUntil <= 24;

  if (args.language === 'zh') {
    const title = isHourLevel
      ? `TOPIK ${String(args.hoursUntil)} 小时后开始`
      : args.daysUntil === 1
        ? 'TOPIK 明天开考'
        : `TOPIK 还有 ${String(args.daysUntil)} 天`;
    return {
      title,
      body: `${titleSuffix} 计划于 ${scheduledLabel} 开始。`,
    };
  }

  if (args.language === 'vi') {
    const title = isHourLevel
      ? `TOPIK bắt đầu sau ${String(args.hoursUntil)} giờ`
      : args.daysUntil === 1
        ? 'TOPIK thi vào ngày mai'
        : `TOPIK còn ${String(args.daysUntil)} ngày`;
    return {
      title,
      body: `${titleSuffix} dự kiến bắt đầu vào ${scheduledLabel}.`,
    };
  }

  if (args.language === 'mn') {
    const title = isHourLevel
      ? `TOPIK ${String(args.hoursUntil)} цагийн дараа эхэлнэ`
      : args.daysUntil === 1
        ? 'TOPIK маргааш эхэлнэ'
        : `TOPIK хүртэл ${String(args.daysUntil)} өдөр`;
    return {
      title,
      body: `${titleSuffix} ${scheduledLabel}-нд эхлэх төлөвтэй.`,
    };
  }

  const title = isHourLevel
    ? `TOPIK starts in ${String(args.hoursUntil)}h`
    : args.daysUntil === 1
      ? 'TOPIK is tomorrow'
      : `TOPIK in ${String(args.daysUntil)} days`;
  return {
    title,
    body: `${titleSuffix} is scheduled to start on ${scheduledLabel}.`,
  };
}

