import React from 'react';
import { Language } from '../types';
import { getLabels } from '../utils/i18n';
import { Sparkles, X, Check } from 'lucide-react';
import { Button } from './common/Button';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  contentType?: 'textbook' | 'exam';
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  language,
  contentType = 'textbook',
}) => {
  const labels = getLabels(language);

  if (!isOpen) return null;

  const features = [
    labels.unlimitedAccess || 'Unlimited Access to All Content',
    labels.allTextbooks || 'Access All Textbook Units',
    labels.allExams || 'Access All TOPIK Exams',
    labels.prioritySupport || 'Priority Support',
    labels.offlineMode || 'Offline Learning Mode',
  ];

  const handleUpgrade = () => {
    // TODO: Implement payment flow
    // For now, just show alert
    alert(labels.upgradeComingSoon || 'Payment integration coming soon! Please contact support.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {labels.upgradeToPremium || 'Upgrade to Premium'}
            </h2>
            <p className="text-white/90 text-sm">
              {contentType === 'textbook'
                ? labels.premiumTextbookAccess ||
                  'This textbook unit requires a premium subscription'
                : labels.premiumExamAccess || 'This TOPIK exam requires a premium subscription'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-slate-800 mb-3">
              {labels.premiumFeatures || 'Premium Features'}
            </h3>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-slate-700">
                  <Check size={16} className="text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600 mb-1">$9.99</div>
              <div className="text-sm text-slate-600">{labels.perMonth || 'per month'}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              {labels.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <Sparkles size={16} className="mr-2" />
              {labels.upgradeNow || 'Upgrade Now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
