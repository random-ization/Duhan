import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { getLocalizedContent } from '../../utils/languageUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { KT } from './ksoft/ksoft';
import { Check } from 'lucide-react';

export type CoursePickerInstituteLite = {
  id?: string;
  name?: string;
  nameEn?: string;
  nameZh?: string;
  nameVi?: string;
  nameMn?: string;
  volume?: string;
  levels?: unknown[];
};

interface CoursePickerSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  institutes: CoursePickerInstituteLite[];
  currentCourseId: string;
}

export function CoursePickerSheet({
  isOpen,
  onOpenChange,
  institutes,
  currentCourseId,
}: CoursePickerSheetProps) {
  const { t } = useTranslation();
  const { language } = useAuth();
  const navigate = useLocalizedNavigate();

  const handleSelect = (courseId: string) => {
    if (courseId !== currentCourseId) {
      onOpenChange(false);
      // Wait for bottom sheet animation before navigating
      setTimeout(() => {
        navigate(`/course/${courseId}/vocab`);
      }, 300);
    } else {
      onOpenChange(false);
    }
  };

  const validInstitutes = useMemo(
    () => institutes.filter(inst => !!inst.id),
    [institutes]
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex flex-col overflow-hidden rounded-t-[28px] p-0"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '60vh',
          background: KT.bg,
          border: 'none',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
        }}
        closeOnEscape
      >
        <SheetHeader
          style={{
            padding: '24px 24px 16px',
            borderBottom: `1px solid ${KT.line}`,
            background: 'rgba(251,248,243,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 5,
              borderRadius: 999,
              background: KT.line2,
              margin: '0 auto 16px',
            }}
          />
          <SheetTitle
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: KT.ink,
              letterSpacing: -0.5,
              textAlign: 'center',
            }}
          >
            {t('learningFlow.actions.switchMaterial', { defaultValue: 'Switch Textbook' })}
          </SheetTitle>
        </SheetHeader>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {validInstitutes.map(inst => {
              const isActive = inst.id === currentCourseId;
              const title = getLocalizedContent(inst, 'name', language) || inst.name || inst.id;

              return (
                <button
                  key={inst.id}
                  onClick={() => handleSelect(inst.id as string)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: 20,
                    background: isActive ? KT.card : 'transparent',
                    border: isActive ? `2px solid ${KT.jade}` : `1px solid ${KT.line}`,
                    boxShadow: isActive ? KT.shSm : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? KT.ink : KT.ink2,
                      fontFamily: KT.font,
                    }}
                  >
                    {title}
                  </span>
                  {isActive && (
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        background: KT.jade,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
