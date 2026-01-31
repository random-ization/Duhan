import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from 'convex/react';
import { Check, Phone, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { mRef } from '../utils/convexRefs';
import { notify } from '../utils/notify';
import { usePhoneVerifyModal } from '../contexts/PhoneVerifyModalContext';
import {
  REGION_CALLING_CODE,
  SupportedPhoneRegion,
  tryParseSupportedPhone,
} from '../lib/phone/phone';

type PhoneVerifyModalContentProps = Readonly<{
  region: SupportedPhoneRegion;
  onClose: () => void;
}>;

function PhoneVerifyModalContent({ region, onClose }: PhoneVerifyModalContentProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const [nationalNumber, setNationalNumber] = useState('');
  const parsed = useMemo(
    () => tryParseSupportedPhone(nationalNumber, region),
    [nationalNumber, region]
  );

  const verifyAndMarkRegion = useMutation(
    mRef<
      { phoneRaw: string; regionHint: 'CN' | 'VN' | 'MN' },
      { eligible: boolean; region: 'CN' | 'VN' | 'MN' | 'OTHER' }
    >('users:verifyAndMarkRegion')
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const regionLabel: Record<SupportedPhoneRegion, { flag: string; name: string }> = {
    CN: { flag: '🇨🇳', name: t('phoneVerifyModal.tabs.cn') },
    VN: { flag: '🇻🇳', name: t('phoneVerifyModal.tabs.vn') },
    MN: { flag: '🇲🇳', name: t('phoneVerifyModal.tabs.mn') },
  };

  const onSubmit = async () => {
    if (!user) {
      const redirect = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
      onClose();
      navigate(`/auth?redirect=${redirect}`);
      return;
    }

    if (!parsed.valid) {
      notify.error(t('phoneVerifyModal.errors.invalid'));
      return;
    }

    try {
      const result = await verifyAndMarkRegion({ phoneRaw: nationalNumber, regionHint: region });
      if (result.eligible) {
        notify.success(t('phoneVerifyModal.toasts.eligible'));
      } else {
        notify.info(t('phoneVerifyModal.toasts.notEligible'));
      }
      onClose();
    } catch {
      notify.error(t('phoneVerifyModal.errors.failed'));
    }
  };

  const ctaLabel = user ? t('phoneVerifyModal.cta.verify') : t('phoneVerifyModal.cta.login');
  const canSubmit = parsed.valid;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 border-none w-full h-full cursor-default"
        onClick={onClose}
        aria-label="Close modal backdrop"
      />
      <div className="relative w-full max-w-xl bg-white border-4 border-black rounded-[32px] shadow-pop overflow-hidden">
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#FFDE59] border-4 border-black rounded-full" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full border-2 border-black bg-white shadow-pop-sm flex items-center justify-center hover:shadow-pop transition-all"
          aria-label={t('phoneVerifyModal.close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10">
          <div className="flex items-center gap-3">
            <Phone className="w-6 h-6" />
            <h2 className="text-3xl font-heading font-extrabold">{t('phoneVerifyModal.title')}</h2>
          </div>
          <p className="mt-3 text-slate-500 font-semibold">{t('phoneVerifyModal.subtitle')}</p>

          <div className="mt-8">
            <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-black bg-white px-4 py-3 shadow-pop">
              <span className="text-lg">{regionLabel[region].flag}</span>
              <span className="font-bold">{regionLabel[region].name}</span>
              <span className="text-slate-400 font-extrabold">+{REGION_CALLING_CODE[region]}</span>
            </div>
          </div>

          <div className="mt-8">
            <div
              className={`w-full rounded-2xl border-2 bg-white flex items-center gap-4 px-6 py-5 ${parsed.valid ? 'border-[#10B981]' : 'border-slate-200'
                }`}
            >
              <input
                value={nationalNumber}
                onChange={e => setNationalNumber(e.target.value)}
                inputMode="numeric"
                className="flex-1 outline-none text-2xl font-extrabold placeholder:text-slate-300"
                placeholder={t('phoneVerifyModal.placeholder')}
              />
              <div
                className={`w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${parsed.valid
                    ? 'border-[#10B981] text-[#10B981]'
                    : 'border-slate-200 text-slate-300'
                  }`}
              >
                <Check className="w-6 h-6" />
              </div>
            </div>

            <div className="mt-3 text-[#10B981] font-bold">
              {parsed.valid ? (
                <>
                  {t('phoneVerifyModal.formattedLabel')}{' '}
                  <span className="font-heading font-extrabold">
                    {parsed.formattedInternational}
                  </span>
                </>
              ) : (
                <span className="text-slate-400">{t('phoneVerifyModal.hint')}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`mt-10 w-full h-20 rounded-3xl bg-[#FFDE59] border-4 border-black shadow-pop font-heading font-extrabold text-2xl transition-all ${canSubmit
                ? 'hover:shadow-pop-hover hover:-translate-y-0.5'
                : 'opacity-50 cursor-not-allowed'
              }`}
          >
            {ctaLabel}
          </button>

          <p className="mt-6 text-sm text-slate-500 font-semibold leading-relaxed">
            {t('phoneVerifyModal.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PhoneVerifyModal() {
  const { i18n } = useTranslation();
  const { isOpen, close } = usePhoneVerifyModal();

  const region: SupportedPhoneRegion = useMemo(() => {
    const lang = i18n.language;
    if (lang.startsWith('vi')) return 'VN';
    if (lang.startsWith('mn')) return 'MN';
    return 'CN';
  }, [i18n.language]);

  if (!isOpen) return null;

  return <PhoneVerifyModalContent key={region} region={region} onClose={close} />;
}
