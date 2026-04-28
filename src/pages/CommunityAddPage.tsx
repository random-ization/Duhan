import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { FRIENDS } from '../utils/convexRefs';
import { useAuth } from '../contexts/AuthContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { KT } from '../components/mobile/ksoft/ksoft';

type AddFriendStatus =
  | 'processing'
  | 'sent'
  | 'already_friends'
  | 'already_requested'
  | 'invalid_code'
  | 'target_not_found'
  | 'self_add_not_allowed'
  | 'error';

function normalizeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function getConvexErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const payload = error as { data?: { code?: string }; message?: string };
  if (typeof payload.data?.code === 'string') return payload.data.code;
  if (typeof payload.message === 'string' && payload.message.length > 0) return payload.message;
  return null;
}

export default function CommunityAddPage() {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sendRequestByCode = useMutation(FRIENDS.sendRequestByCode);
  const processedCodeRef = useRef<string | null>(null);
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const [resultByCode, setResultByCode] = useState<
    Partial<Record<string, Exclude<AddFriendStatus, 'processing'>>>
  >({});

  const code = useMemo(() => {
    const raw = searchParams.get('code') || '';
    return normalizeCode(raw);
  }, [searchParams]);

  useEffect(() => {
    if (user) return;
    const redirectTarget = encodeURIComponent(`${location.pathname}${location.search}`);
    navigate(`/auth?redirect=${redirectTarget}`, { replace: true });
  }, [location.pathname, location.search, navigate, user]);

  useEffect(() => {
    if (!user) return;
    if (!code) return;
    if (processedCodeRef.current === code) return;
    processedCodeRef.current = code;

    void (async () => {
      try {
        const result = await sendRequestByCode({ code });
        setResultByCode(prev => ({ ...prev, [code]: result.status }));
      } catch (error) {
        const errorCode = getConvexErrorCode(error);
        if (errorCode === 'INVALID_CODE') {
          setResultByCode(prev => ({ ...prev, [code]: 'invalid_code' }));
          return;
        }
        if (errorCode === 'TARGET_NOT_FOUND') {
          setResultByCode(prev => ({ ...prev, [code]: 'target_not_found' }));
          return;
        }
        if (errorCode === 'SELF_ADD_NOT_ALLOWED') {
          setResultByCode(prev => ({ ...prev, [code]: 'self_add_not_allowed' }));
          return;
        }
        if (errorCode === 'ALREADY_FRIENDS') {
          setResultByCode(prev => ({ ...prev, [code]: 'already_friends' }));
          return;
        }
        if (errorCode === 'REQUEST_ALREADY_EXISTS') {
          setResultByCode(prev => ({ ...prev, [code]: 'already_requested' }));
          return;
        }
        setResultByCode(prev => ({ ...prev, [code]: 'error' }));
      }
    })();
  }, [code, sendRequestByCode, user]);

  const status: AddFriendStatus = !code ? 'invalid_code' : (resultByCode[code] ?? 'processing');

  const copy = useMemo(() => {
    if (language.startsWith('zh')) {
      return {
        title: '添加学习好友',
        processing: '正在处理中…',
        sent: '已发送好友请求',
        alreadyFriends: '你们已经是好友了',
        alreadyRequested: '你已发送过请求，请等待对方确认',
        invalidCode: '分享链接无效',
        targetNotFound: '用户不存在或链接已失效',
        selfAdd: '不能添加自己为好友',
        failed: '添加失败，请稍后重试',
        goCommunity: '去社区',
      };
    }
    if (language.startsWith('vi')) {
      return {
        title: 'Thêm bạn học',
        processing: 'Đang xử lý…',
        sent: 'Đã gửi lời mời kết bạn',
        alreadyFriends: 'Hai bạn đã là bạn bè',
        alreadyRequested: 'Bạn đã gửi lời mời trước đó',
        invalidCode: 'Link không hợp lệ',
        targetNotFound: 'Không tìm thấy người dùng hoặc link đã hết hiệu lực',
        selfAdd: 'Bạn không thể tự thêm chính mình',
        failed: 'Thao tác thất bại, vui lòng thử lại',
        goCommunity: 'Vào cộng đồng',
      };
    }
    if (language.startsWith('mn')) {
      return {
        title: 'Суралцах найз нэмэх',
        processing: 'Боловсруулж байна…',
        sent: 'Найзын хүсэлт илгээгдлээ',
        alreadyFriends: 'Та хоёр аль хэдийн найзууд',
        alreadyRequested: 'Өмнө нь хүсэлт илгээсэн байна',
        invalidCode: 'Холбоос буруу байна',
        targetNotFound: 'Хэрэглэгч олдсонгүй эсвэл холбоос хүчингүй',
        selfAdd: 'Өөрийгөө найзаар нэмэх боломжгүй',
        failed: 'Амжилтгүй боллоо, дахин оролдоно уу',
        goCommunity: 'Нийгэмлэг рүү',
      };
    }
    return {
      title: 'Add a study friend',
      processing: 'Processing…',
      sent: 'Friend request sent',
      alreadyFriends: 'You are already friends',
      alreadyRequested: 'Request already sent',
      invalidCode: 'Invalid share link',
      targetNotFound: 'User not found or link is no longer valid',
      selfAdd: 'You cannot add yourself',
      failed: 'Unable to add friend right now',
      goCommunity: 'Go to community',
    };
  }, [language]);

  const statusText =
    status === 'processing'
      ? copy.processing
      : status === 'sent'
        ? copy.sent
        : status === 'already_friends'
          ? copy.alreadyFriends
          : status === 'already_requested'
            ? copy.alreadyRequested
            : status === 'invalid_code'
              ? copy.invalidCode
              : status === 'target_not_found'
                ? copy.targetNotFound
                : status === 'self_add_not_allowed'
                  ? copy.selfAdd
                  : copy.failed;

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: KT.bg,
        fontFamily: KT.font,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 22,
          background: KT.card,
          border: `1px solid ${KT.line}`,
          boxShadow: KT.sh,
          padding: 24,
        }}
      >
        <div
          style={{
            fontFamily: KT.serif,
            fontSize: 12,
            letterSpacing: 2.2,
            fontWeight: 700,
            color: KT.crimson,
            marginBottom: 10,
          }}
        >
          會 · COMMUNITY
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            lineHeight: 1.2,
            fontWeight: 800,
            color: KT.ink,
            letterSpacing: -0.6,
          }}
        >
          {copy.title}
        </h1>
        <p
          style={{
            marginTop: 12,
            marginBottom: 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: KT.ink2,
            fontWeight: 600,
          }}
        >
          {statusText}
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: 18,
            height: 42,
            width: '100%',
            borderRadius: 14,
            border: 'none',
            background: KT.indigo,
            color: KT.card,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: KT.font,
          }}
        >
          {copy.goCommunity}
        </button>
        <div style={{ marginTop: 10, fontSize: 11, color: KT.sub, fontWeight: 600 }}>
          {t('common.code', { defaultValue: 'Code' })}: {code || '—'}
        </div>
      </div>
    </div>
  );
}
