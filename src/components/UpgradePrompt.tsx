import React from 'react';
import { Language } from '../types';
import { getLabels } from '../utils/i18n';
import { Sparkles, X, Check } from 'lucide-react';
import { Button } from './ui';
import { Card, CardContent } from './ui';
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogPortal } from './ui';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ isOpen, onClose, language }) => {
  const labels = getLabels(language);

  if (!isOpen) return null;

  const features = [
    labels.upgradeFeaturesList?.allTextbooksUnits || labels.allTextbooks || 'All textbook lessons',
    labels.upgradeFeaturesList?.allExamsAccess || labels.allExams || 'All TOPIK practice exams',
    labels.upgradeFeaturesList?.unlimitedLearning || labels.unlimitedAccess || 'Unlimited learning',
  ];

  const handleUpgrade = () => {
    if (globalThis.window !== undefined) {
      globalThis.window.location.href = `/${language}/pricing/details`;
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay
          unstyled
          closeOnClick={false}
          className="fixed inset-0 bg-black/50 z-50 p-4"
        />
        <DialogContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none data-[state=closed]:pointer-events-none"
        >
          <Card className="pointer-events-auto bg-card rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-400 dark:to-orange-400 p-6 rounded-t-2xl">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  className="absolute top-4 right-4 text-white dark:text-primary-foreground hover:bg-card/20 p-2 rounded-full transition-colors"
                >
                  <X size={20} />
                </Button>
              </DialogClose>
              <div className="text-center text-white dark:text-primary-foreground">
                <div className="w-16 h-16 bg-card/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {labels.upgradeTitle || labels.upgradeToPremium || 'Upgrade to Premium'}
                </h2>
                <p className="text-white/90 text-sm">
                  {labels.upgradeDescription || 'Unlock all textbook content and TOPIK exams'}
                </p>
              </div>
            </div>

            {/* Content */}
            <CardContent className="p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-muted-foreground mb-3">
                  {labels.premiumFeatures || 'Premium Features'}
                </h3>
                <ul className="space-y-2">
                  {features.map(feature => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check
                        size={16}
                        className="text-green-500 dark:text-emerald-300 flex-shrink-0"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 dark:bg-amber-400/12 dark:border-amber-300/40 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-200 mb-1">
                    $9.99
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {labels.perMonth || 'per month'}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  type="button"
                  variant="ghost"
                  size="auto"
                  className="flex-1 px-4 py-2 rounded-lg text-muted-foreground hover:bg-muted font-medium transition-colors"
                >
                  {labels.maybeLater || labels.cancel}
                </Button>
                <Button
                  onClick={handleUpgrade}
                  type="button"
                  size="auto"
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 dark:from-amber-400 dark:to-orange-400 dark:hover:from-amber-300 dark:hover:to-orange-300 text-white dark:text-primary-foreground font-bold shadow-lg shadow-amber-500/20 dark:shadow-amber-400/25 flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles size={16} className="mr-2" />
                  {labels.upgradeNow || 'Upgrade Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default UpgradePrompt;
