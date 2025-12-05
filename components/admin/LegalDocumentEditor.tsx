import React, { useState, useEffect } from 'react';
import { Language } from '../../types';
import { getLabels } from '../../utils/i18n';
import { api } from '../../services/api';
import { Button } from '../common/Button';
import { Save, FileText, Eye, Edit } from 'lucide-react';

interface LegalDocument {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

interface LegalDocumentEditorProps {
  language: Language;
}

const LegalDocumentEditor: React.FC<LegalDocumentEditorProps> = ({ language }) => {
  const labels = getLabels(language);
  const [selectedDoc, setSelectedDoc] = useState<'terms' | 'privacy' | 'refund'>('terms');
  const [documents, setDocuments] = useState<Record<string, LegalDocument>>({});
  const [editingContent, setEditingContent] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (documents[selectedDoc]) {
      setEditingTitle(documents[selectedDoc].title);
      setEditingContent(documents[selectedDoc].content);
    } else {
      // Set default titles
      const defaultTitles = {
        terms: labels.termsOfService || 'Terms of Service',
        privacy: labels.privacyPolicy || 'Privacy Policy',
        refund: labels.refundPolicy || 'Refund Policy',
      };
      setEditingTitle(defaultTitles[selectedDoc]);
      setEditingContent('');
    }
  }, [selectedDoc, documents, labels]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const [terms, privacy, refund] = await Promise.all([
        api.getLegalDocument('terms').catch(() => null),
        api.getLegalDocument('privacy').catch(() => null),
        api.getLegalDocument('refund').catch(() => null),
      ]);

      const docsMap: Record<string, LegalDocument> = {};
      if (terms) docsMap.terms = terms;
      if (privacy) docsMap.privacy = privacy;
      if (refund) docsMap.refund = refund;

      setDocuments(docsMap);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.saveLegalDocument(selectedDoc, editingTitle, editingContent);

      // Update local state
      setDocuments({
        ...documents,
        [selectedDoc]: {
          id: selectedDoc,
          title: editingTitle,
          content: editingContent,
          updatedAt: Date.now(),
        },
      });

      alert(labels.saved || 'Saved successfully!');
    } catch (error) {
      console.error('Failed to save document:', error);
      alert('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const formatPreview = (content: string): string => {
    if (!content) return '';

    const paragraphs = content.split('\n\n').filter(p => p.trim());

    return paragraphs
      .map(para => {
        if (para.trim().startsWith('# ')) {
          return `<h1 class="text-3xl font-bold mb-6 mt-8">${para.substring(2).trim()}</h1>`;
        } else if (para.trim().startsWith('## ')) {
          return `<h2 class="text-2xl font-bold mb-4 mt-6">${para.substring(3).trim()}</h2>`;
        } else if (para.trim().startsWith('### ')) {
          return `<h3 class="text-xl font-bold mb-3 mt-5">${para.substring(4).trim()}</h3>`;
        }

        if (para.trim().match(/^[-*]\s/)) {
          const items = para.split('\n').filter(line => line.trim());
          const listItems = items
            .map(item => {
              const cleanItem = item.replace(/^[-*]\s/, '').trim();
              return `<li class="mb-2">${cleanItem}</li>`;
            })
            .join('');
          return `<ul class="my-4 ml-6 list-disc">${listItems}</ul>`;
        }

        if (para.trim().match(/^\d+\.\s/)) {
          const items = para.split('\n').filter(line => line.trim());
          const listItems = items
            .map(item => {
              const cleanItem = item.replace(/^\d+\.\s/, '').trim();
              return `<li class="mb-2">${cleanItem}</li>`;
            })
            .join('');
          return `<ol class="my-4 ml-6 list-decimal">${listItems}</ol>`;
        }

        return `<p class="mb-4 leading-relaxed">${para.trim()}</p>`;
      })
      .join('');
  };

  const docTypes = [
    { id: 'terms' as const, label: labels.termsOfService || 'Terms of Service' },
    { id: 'privacy' as const, label: labels.privacyPolicy || 'Privacy Policy' },
    { id: 'refund' as const, label: labels.refundPolicy || 'Refund Policy' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {labels.legalDocuments || 'Legal Documents Editor'}
        </h2>
        <p className="text-gray-600">
          {labels.legalDocumentsDesc || 'Edit terms of service, privacy policy, and refund policy'}
        </p>
      </div>

      {/* Document Type Selector */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex gap-2 overflow-x-auto">
          {docTypes.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc.id)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedDoc === doc.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              {doc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(false)}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                !previewMode ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Edit className="w-4 h-4 inline mr-1" />
              {labels.edit || 'Edit'}
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                previewMode ? 'bg-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-1" />
              {labels.preview || 'Preview'}
            </button>
          </div>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={!editingTitle.trim() || !editingContent.trim()}
            variant="primary"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {labels.save || 'Save'}
          </Button>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {!previewMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {labels.title || 'Title'}
                </label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={labels.enterTitle || 'Enter document title'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {labels.content || 'Content'}
                </label>
                <div className="text-xs text-gray-500 mb-2 bg-blue-50 p-2 rounded">
                  {labels.markdownTip ||
                    'Formatting tips: Use # for headings (# H1, ## H2, ### H3), - or * for bullet lists, 1. for numbered lists, blank lines for paragraphs'}
                </div>
                <textarea
                  value={editingContent}
                  onChange={e => setEditingContent(e.target.value)}
                  className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  placeholder={labels.enterContent || 'Enter document content...'}
                />
              </div>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none">
              <h1 className="text-3xl font-bold mb-6">{editingTitle}</h1>
              <div dangerouslySetInnerHTML={{ __html: formatPreview(editingContent) }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalDocumentEditor;
