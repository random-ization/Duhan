import React from 'react';
import { useLocation } from 'react-router-dom';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { Language } from '../types';
import { getLabels } from '../utils/i18n';
import { sanitizeHtml } from '../utils/sanitize';
import { useQuery } from 'convex/react';
import { Loading } from '../components/common/Loading';
import { FileText, Calendar } from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import { qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

interface LegalDocumentPageProps {
  language: Language;
  documentType: 'terms' | 'privacy' | 'refund';
}

const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({ language, documentType }) => {
  const labels = getLabels(language);
  const navigate = useLocalizedNavigate();
  const location = useLocation();

  const meta = getRouteMeta(location.pathname);
  const doc = useQuery(
    qRef<
      { type: LegalDocumentPageProps['documentType'] },
      { id: string; title?: string; content?: string; updatedAt?: number } | null
    >('legal:getDocument'),
    { type: documentType }
  );

  const loading = doc === undefined;
  // Convert Convex doc result to matching frontend interface if needed, or use directly
  const document = doc
    ? {
        id: doc.id,
        title: doc.title ?? '',
        content: doc.content ?? '',
        updatedAt: doc.updatedAt,
        updatedBy: 'System',
      }
    : null;
  const error = doc === null; // If query returns null (not undefined) -> error

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
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />
      {/* Back Button */}
      <div className="mb-6">
        <BackButton onClick={() => navigate(-1)} />
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <FileText className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{document.title}</h1>
            {document.updatedAt && (
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Last updated: {new Date(document.updatedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatContent(document.content)) }}
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
  return text.replaceAll(/[&<>"']/g, m => map[m]);
}

// Helper function to format plain text content with basic HTML
function formatContent(content: string): string {
  if (!content) return '';

  const parseInline = (text: string): string => {
    let parsed = text;
    parsed = parsed.replaceAll(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replaceAll(/\*([^*]+)\*/g, '<em>$1</em>');
    parsed = parsed.replaceAll(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return parsed;
  };

  // Convert line breaks to paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim());

  // Track if we've skipped the first h1 (title is already shown in header)
  let skippedFirstH1 = false;

  return paragraphs
    .map(para => {
      // Check if it's a heading (starts with #)
      if (para.trim().startsWith('# ')) {
        // Skip first h1 since it's already displayed in the header card
        if (!skippedFirstH1) {
          skippedFirstH1 = true;
          return '';
        }
        return `<h1 class="text-3xl font-bold mb-6 mt-8">${parseInline(escapeHtml(para.substring(2).trim()))}</h1>`;
      } else if (para.trim().startsWith('## ')) {
        return `<h2 class="text-2xl font-bold mb-4 mt-6">${parseInline(escapeHtml(para.substring(3).trim()))}</h2>`;
      } else if (para.trim().startsWith('### ')) {
        return `<h3 class="text-xl font-bold mb-3 mt-5">${parseInline(escapeHtml(para.substring(4).trim()))}</h3>`;
      }

      // Check if it's a list
      if (/^[-*]\s/.exec(para.trim())) {
        const items = para.split('\n').filter(line => line.trim());
        const listItems = items
          .map(item => {
            const cleanItem = item.replaceAll(/^[-*]\s/g, '').trim();
            return `<li class="mb-2">${parseInline(escapeHtml(cleanItem))}</li>`;
          })
          .join('');
        return `<ul class="my-4 ml-6 list-disc">${listItems}</ul>`;
      }

      // Check if it's a numbered list
      if (/^\d+\.\s/.exec(para.trim())) {
        const items = para.split('\n').filter(line => line.trim());
        const listItems = items
          .map(item => {
            const cleanItem = item.replaceAll(/^\d+\.\s/g, '').trim();
            return `<li class="mb-2">${parseInline(escapeHtml(cleanItem))}</li>`;
          })
          .join('');
        return `<ol class="my-4 ml-6 list-decimal">${listItems}</ol>`;
      }

      // Skip "Last updated" line since it's already shown in header
      if (para.trim().toLowerCase().startsWith('last updated')) {
        return '';
      }

      // Regular paragraph
      return `<p class="mb-4 leading-relaxed">${parseInline(escapeHtml(para.trim()))}</p>`;
    })
    .filter(Boolean) // Remove empty strings from skipped content
    .join('');
}

export default LegalDocumentPage;
