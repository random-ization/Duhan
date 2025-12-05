import React from 'react';
import { X, Lock, Check, Crown } from 'lucide-react';
import { Language } from '../../types';
import { getLabels } from '../../utils/i18n';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ isOpen, onClose, language }) => {
  const labels = getLabels(language);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    // In a real application, this would redirect to a payment page
    alert(labels.upgradeComingSoon || 'Payment integration coming soon! Please contact support.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{labels.upgradeTitle}</h2>
            </div>
          </div>
          <p className="text-indigo-100 mt-2">{labels.upgradeDescription}</p>
        </div>

        {/* Features List */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                {labels.upgradeFeaturesList?.allTextbooksUnits || 'All textbook lessons'}
              </h3>
              <p className="text-sm text-gray-600">
                {labels.allTextbooks || 'Access All Textbook Units'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                {labels.upgradeFeaturesList?.allExamsAccess || 'All TOPIK practice exams'}
              </h3>
              <p className="text-sm text-gray-600">{labels.allExams || 'Access All TOPIK Exams'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                {labels.upgradeFeaturesList?.unlimitedLearning || 'Unlimited learning'}
              </h3>
              <p className="text-sm text-gray-600">
                {labels.unlimitedAccess || 'Unlimited Access to All Content'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 space-y-3">
          <button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Crown className="w-5 h-5" />
            {labels.upgradeNow}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            {labels.maybeLater}
          </button>
        </div>

        {/* Premium Badge */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-indigo-700">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">{labels.contentLocked}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
