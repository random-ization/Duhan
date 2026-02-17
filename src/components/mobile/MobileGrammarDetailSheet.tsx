import { useEffect, useState } from 'react';
import { X, Trophy, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { GrammarPointData } from '../../types';
import { useAction, useMutation } from 'convex/react';
import type { Id } from '../../../convex/_generated/dataModel';
import { aRef, mRef } from '../../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui'; // Assuming these exist or I should use native
import { Input } from '../ui';
import { Sheet, SheetContent, SheetOverlay, SheetPortal } from '../ui';

interface MobileGrammarDetailSheetProps {
  readonly grammar: GrammarPointData | null;
  readonly onClose: () => void;
  readonly onProficiencyUpdate?: (
    grammarId: string,
    proficiency: number,
    status: GrammarPointData['status']
  ) => void;
}

export default function MobileGrammarDetailSheet({
  grammar,
  onClose,
  onProficiencyUpdate,
}: MobileGrammarDetailSheetProps) {
  const { i18n } = useTranslation();
  const [practiceSentence, setPracticeSentence] = useState('');
  const [aiFeedback, setAiFeedback] = useState<{
    isCorrect: boolean;
    feedback: string;
    correctedSentence?: string;
    progress?: { proficiency: number; status: string };
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const checkAction = useAction(
    aRef<
      { sentence: string; context: string; language?: string },
      { success?: boolean; data?: { nuance?: unknown } }
    >('ai:analyzeSentence')
  );

  const updateStatus = useMutation(
    mRef<
      {
        grammarId: Id<'grammar_points'>;
        status?: GrammarPointData['status'];
        proficiency?: number;
        increment?: number;
      },
      { status: string; proficiency: number }
    >('grammars:updateStatus')
  );

  useEffect(() => {
    if (!grammar?.id) return;
    setPracticeSentence('');
    setAiFeedback(null);
    setShowConfetti(false);
  }, [grammar?.id]);

  const handleCheck = async () => {
    if (!grammar || !practiceSentence.trim()) return;

    setIsChecking(true);
    setAiFeedback(null);
    try {
      const response = await checkAction({
        sentence: practiceSentence.trim(),
        context: grammar.title,
        language: i18n.language,
      });

      const res = response as { success?: boolean; data?: { nuance?: unknown } } | null;
      if (res?.success && res.data) {
        // Logic duplicated from desktop component
        const data = res.data;
        let feedback = typeof data.nuance === 'string' ? data.nuance : 'Analysis complete';
        const isFeedbackNegative =
          feedback.toLowerCase().startsWith('incorrect') ||
          feedback.includes('错误') ||
          feedback.includes('Incorrect');

        const finalIsCorrect = !isFeedbackNegative;

        // Progress Update
        let progress: { proficiency: number; status: string } | undefined = undefined;
        if (finalIsCorrect) {
          const updateRes = await updateStatus({
            grammarId: grammar.id as unknown as Id<'grammar_points'>,
            increment: 50,
          });
          progress = updateRes;

          if (updateRes.proficiency >= 100) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2000);
          }

          onProficiencyUpdate?.(
            grammar.id,
            updateRes.proficiency,
            updateRes.status as GrammarPointData['status']
          );
        }

        setAiFeedback({
          isCorrect: finalIsCorrect,
          feedback,
          progress,
        });
      }
    } catch (error) {
      console.error('Check failed', error);
      setAiFeedback({ isCorrect: false, feedback: 'Error checking sentence.' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleStatus = () => {
    if (!grammar) return;
    const newStatus = grammar.status === 'MASTERED' ? 'LEARNING' : 'MASTERED';
    updateStatus({
      grammarId: grammar.id as unknown as Id<'grammar_points'>,
      status: newStatus,
    }).then(res => {
      onProficiencyUpdate?.(grammar.id, res.proficiency, res.status as GrammarPointData['status']);
      if (res.status === 'MASTERED') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    });
  };

  if (!grammar) return null;

  const rulesObject = (grammar.conjugationRules || grammar.construction || {}) as Record<
    string,
    unknown
  >;
  const proficiency = aiFeedback?.progress?.proficiency ?? grammar.proficiency ?? 0;
  const status = aiFeedback?.progress?.status ?? grammar.status ?? 'NEW';

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetPortal>
        <SheetOverlay unstyled className="fixed inset-0 bg-primary/60 z-[60] backdrop-blur-sm" />
        <SheetContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          className="fixed bottom-0 left-0 right-0 bg-card rounded-t-[2rem] z-[61] h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-muted p-6 pb-4 border-b border-border flex items-start justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-black uppercase">
                  {grammar.type}
                </span>
                <span className="text-xs font-bold text-muted-foreground">{grammar.level}</span>
              </div>
              <h2 className="text-3xl font-black text-foreground leading-tight mb-2">
                {grammar.title}
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex-1 w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${status === 'MASTERED' ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ width: `${proficiency}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-muted-foreground">{proficiency}%</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="auto"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="auto"
                onClick={handleToggleStatus}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                  status === 'MASTERED'
                    ? 'bg-green-100 border-green-500 text-green-600'
                    : 'bg-card border-border text-muted-foreground'
                }`}
              >
                <Trophy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Summary */}
            <div className="text-base font-bold text-muted-foreground leading-relaxed bg-yellow-50 p-4 rounded-xl border-2 border-yellow-100">
              {grammar.summary}
            </div>

            {/* Explanation */}
            <div>
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">
                Explanation
              </h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {grammar.explanation}
              </div>
            </div>

            {/* Rules */}
            {Object.keys(rulesObject).length > 0 && (
              <div>
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">
                  Construction
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(rulesObject).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center bg-card border border-border rounded-lg px-3 py-2 shadow-sm"
                    >
                      <span className="font-bold text-muted-foreground mr-2">{key}</span>
                      <span className="text-muted-foreground mr-2">→</span>
                      <span className="font-bold text-indigo-600">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Examples */}
            <div>
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">
                Examples
              </h3>
              <div className="space-y-3">
                {(Array.isArray(grammar.examples) ? grammar.examples : []).map((ex: any, i) => (
                  <div
                    key={i}
                    className="bg-muted border-2 border-border rounded-xl p-4 active:bg-muted transition-colors"
                  >
                    <p className="font-bold text-foreground mb-1">{ex.kr}</p>
                    <p className="text-sm text-muted-foreground">{ex.cn || ex.en}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Practice input fixed at bottom */}
          <div className="p-4 bg-card border-t border-border pb-safe">
            {aiFeedback && (
              <div
                className={`mb-3 p-3 rounded-lg text-sm font-bold flex items-start gap-2 ${aiFeedback.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
              >
                {aiFeedback.isCorrect ? (
                  <Trophy className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div>
                  <p>{aiFeedback.feedback}</p>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={practiceSentence}
                onChange={e => setPracticeSentence(e.target.value)}
                placeholder="Write a sentence..."
                className="flex-1 bg-muted border-border font-bold"
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
              />
              <Button
                onClick={handleCheck}
                disabled={isChecking || !practiceSentence.trim()}
                loading={isChecking}
                loadingText="Checking..."
                loadingIconClassName="w-3 h-3"
                className="bg-primary text-white font-black"
              >
                Check
              </Button>
            </div>
          </div>

          {/* Confetti */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none z-[70] flex items-start justify-center overflow-hidden">
              {Array.from({ length: 15 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -20, x: (Math.random() - 0.5) * 300, rotate: 0 }}
                  animate={{ y: 800, rotate: 720 }}
                  transition={{ duration: 2, delay: Math.random() * 0.5, ease: 'linear' }}
                  className="absolute text-2xl"
                >
                  {['🎉', '⭐', '✨'][i % 3]}
                </motion.div>
              ))}
            </div>
          )}
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}
