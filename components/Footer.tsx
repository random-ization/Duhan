import React from 'react';
import { Language } from '../types';
import { getLabels } from '../utils/i18n';

interface FooterProps {
  language: Language;
  onNavigate: (page: string) => void;
}

const Footer: React.FC<FooterProps> = ({ language, onNavigate }) => {
  const labels = getLabels(language);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-800 text-slate-300 mt-auto">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg">
                {language === 'zh' ? '读' : 'D'}
              </div>
              <span className="text-xl font-bold text-white">
                {language === 'zh' ? '读韩' : 'DuHan'}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {labels.footerDescription || 'Your comprehensive Korean language learning platform'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">{labels.quickLinks || 'Quick Links'}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-white transition-colors"
                >
                  {labels.home}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="hover:text-white transition-colors"
                >
                  {labels.textbookLearning}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('topik')}
                  className="hover:text-white transition-colors"
                >
                  {labels.topik}
                </button>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">{labels.legal || 'Legal'}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('terms')}
                  className="hover:text-white transition-colors font-medium"
                >
                  {labels.termsOfService || 'Terms of Service'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('privacy')}
                  className="hover:text-white transition-colors font-medium"
                >
                  {labels.privacyPolicy || 'Privacy Policy'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('refund')}
                  className="hover:text-white transition-colors font-medium"
                >
                  {labels.refundPolicy || 'Refund Policy'}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-700 mt-8 pt-6 text-center text-sm text-slate-400">
          <p>
            © {currentYear} {language === 'zh' ? '读韩' : 'DuHan'}. {labels.allRightsReserved || 'All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
