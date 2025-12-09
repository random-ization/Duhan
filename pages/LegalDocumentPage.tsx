import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Language } from '../types';
import { getLabels } from '../utils/i18n';
import { api } from '../services/api';
import { Loading } from '../components/common/Loading';
import { FileText, Calendar, User } from 'lucide-react';

interface LegalDocumentPageProps {
  language: Language;
  documentType: 'terms' | 'privacy' | 'refund';
}

interface LegalDocument {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  updatedBy?: string;
}

const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({ language, documentType }) => {
  const labels = getLabels(language);
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const doc = await api.getLegalDocument(documentType);
        setDocument(doc);
      } catch (err) {
        console.error('Failed to fetch legal document:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentType]);

  const getTitle = () => {
    switch (documentType) {
      case 'terms':
        return labels.termsOfService || 'Terms of Service';
      case 'privacy':
        return labels.privacyPolicy || 'Privacy Policy';
      case 'refund':
        return labels.refundPolicy || 'Refund Policy';
      default:
        return '';
    }
  };

  if (loading) {
    return <Loading fullScreen size="lg" />;
  }

  if (error || !document) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {labels.documentNotFound || 'Document Not Found'}
        </h2>
        <p className="text-slate-600">
          {labels.documentNotFoundDesc || 'The requested document could not be found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <FileText className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{getTitle()}</h1>
            {document.updatedAt && (
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {labels.lastUpdated || 'Last updated'}:{' '}
                  {new Date(document.updatedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div
          className="prose prose-slate max-w-none
            prose-headings:font-bold prose-headings:text-slate-800
            prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8
            prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-6
            prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-5
            prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-4
            prose-ul:my-4 prose-ul:ml-6
            prose-ol:my-4 prose-ol:ml-6
            prose-li:text-slate-700 prose-li:mb-2
            prose-strong:text-slate-900 prose-strong:font-semibold
            prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: formatContent(document.content) }}
        />
      </div>
    </div>
  );
};

// Helper function to escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Helper function to format plain text content with basic HTML
function formatContent(content: string): string {
  if (!content) return '';

  const parseInline = (text: string): string => {
    let parsed = text;
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
    return parsed;
  };

  // Convert line breaks to paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim());

  return paragraphs
    .map(para => {
      // Check if it's a heading (starts with #)
      if (para.trim().startsWith('# ')) {
        return `<h1>${parseInline(escapeHtml(para.substring(2).trim()))}</h1>`;
      } else if (para.trim().startsWith('## ')) {
        return `<h2>${parseInline(escapeHtml(para.substring(3).trim()))}</h2>`;
      } else if (para.trim().startsWith('### ')) {
        return `<h3>${parseInline(escapeHtml(para.substring(4).trim()))}</h3>`;
      }

      // Check if it's a list
      if (para.trim().match(/^[-*]\s/)) {
        const items = para.split('\n').filter(line => line.trim());
        const listItems = items
          .map(item => {
            const cleanItem = item.replace(/^[-*]\s/, '').trim();
            return `<li>${parseInline(escapeHtml(cleanItem))}</li>`;
          })
          .join('');
        return `<ul>${listItems}</ul>`;
      }

      // Check if it's a numbered list
      if (para.trim().match(/^\d+\.\s/)) {
        const items = para.split('\n').filter(line => line.trim());
        const listItems = items
          .map(item => {
            const cleanItem = item.replace(/^\d+\.\s/, '').trim();
            return `<li>${parseInline(escapeHtml(cleanItem))}</li>`;
          })
          .join('');
        return `<ol>${listItems}</ol>`;
      }

      // Regular paragraph
      return `<p>${parseInline(escapeHtml(para.trim()))}</p>`;
    })
    .join('');
}

export default LegalDocumentPage;
