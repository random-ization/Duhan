import React, { useState, useRef } from 'react';
import {
  Institute,
  Language,
  TextbookContextMap,
  TextbookContent,
  VocabularyItem,
  GrammarPoint,
} from '../../types';
import { getLabels } from '../../utils/i18n';
import {
  Upload,
  FileSpreadsheet,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Lock,
  Unlock,
  DollarSign,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ContentEditorProps {
  institutes: Institute[];
  textbookContexts: TextbookContextMap;
  language: Language;
  onSaveContext: (key: string, content: TextbookContent) => void;
}

type ContentType = 'vocab' | 'reading' | 'listening' | 'grammar';
type UploadStatus = 'IDLE' | 'PARSING' | 'READY' | 'SAVING' | 'SUCCESS' | 'ERROR';
type ViewMode = 'upload' | 'payment';

const ContentEditor: React.FC<ContentEditorProps> = ({
  institutes,
  textbookContexts,
  language,
  onSaveContext,
}) => {
  const labels = getLabels(language);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [contentType, setContentType] = useState<ContentType>('vocab');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [bulkCount, setBulkCount] = useState<number>(3);

  // Helper: Get or create content object
  const getContent = (level: number, unit: number): TextbookContent => {
    if (!selectedInstitute) throw new Error('No institute selected');

    const key = `${selectedInstitute.id}-${level}-${unit}`;
    const existing = textbookContexts[key];

    return existing
      ? { ...existing }
      : {
          generalContext: '',
          vocabularyList: '',
          readingText: '',
          readingTranslation: '',
          readingTitle: `Lesson ${unit}`,
          listeningScript: '',
          listeningTranslation: '',
          listeningTitle: `Lesson ${unit}`,
          listeningAudioUrl: null,
          grammarList: '',
        };
  };

  // Handle Excel file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('PARSING');
    setErrorMessage('');

    const reader = new FileReader();

    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Get array of arrays, skipping header row
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        // Remove header row and filter empty rows
        const rows = data.slice(1).filter(r => r && r.length > 0 && r[0] !== undefined);

        if (rows.length === 0) {
          throw new Error('No valid data found in Excel file');
        }

        setPreviewData(rows);
        setUploadStatus('READY');
      } catch (err) {
        console.error('Excel parse error:', err);
        setErrorMessage(err instanceof Error ? err.message : 'Failed to parse Excel file');
        setUploadStatus('ERROR');
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read file');
      setUploadStatus('ERROR');
    };

    reader.readAsBinaryString(file);
  };

  // Handle batch save
  const handleBatchSave = () => {
    if (!selectedInstitute || previewData.length === 0) return;

    setUploadStatus('SAVING');
    setErrorMessage('');

    try {
      // Temporary storage for batch updates
      const updates: Record<string, TextbookContent> = {};

      if (contentType === 'vocab') {
        // Group vocabulary by Level/Unit
        const grouped: Record<string, VocabularyItem[]> = {};

        previewData.forEach(row => {
          // Expected columns: Level(0), Unit(1), Word(2), POS(3), Meaning(4), Example(5)
          const level = parseInt(row[0]);
          const unit = parseInt(row[1]);

          if (!level || !unit) return;

          const key = `${selectedInstitute.id}-${level}-${unit}`;
          if (!grouped[key]) grouped[key] = [];

          grouped[key].push({
            korean: row[2] || '',
            pos: row[3] || '',
            english: row[4] || '',
            exampleSentence: row[5] || '',
            exampleTranslation: '',
            unit: unit,
          });
        });

        // Apply updates
        Object.keys(grouped).forEach(key => {
          const [_, lvl, unt] = key.split('-');
          const content = updates[key] || getContent(parseInt(lvl), parseInt(unt));
          content.vocabularyList = JSON.stringify(grouped[key]);
          updates[key] = content;
        });
      }

      if (contentType === 'reading') {
        previewData.forEach(row => {
          // Expected columns: Level(0), Unit(1), Text(2), Translation(3)
          const level = parseInt(row[0]);
          const unit = parseInt(row[1]);

          if (!level || !unit) return;

          const key = `${selectedInstitute.id}-${level}-${unit}`;
          const content = updates[key] || getContent(level, unit);

          content.readingText = row[2] || '';
          content.readingTranslation = row[3] || '';
          updates[key] = content;
        });
      }

      if (contentType === 'listening') {
        previewData.forEach(row => {
          // Expected columns: Level(0), Unit(1), Script(2), Translation(3)
          const level = parseInt(row[0]);
          const unit = parseInt(row[1]);

          if (!level || !unit) return;

          const key = `${selectedInstitute.id}-${level}-${unit}`;
          const content = updates[key] || getContent(level, unit);

          content.listeningScript = row[2] || '';
          content.listeningTranslation = row[3] || '';
          updates[key] = content;
        });
      }

      if (contentType === 'grammar') {
        // Group grammar by Level/Unit
        const grouped: Record<string, GrammarPoint[]> = {};

        previewData.forEach(row => {
          // Expected columns: Level(0), Unit(1), Pattern(2), Definition(3), Example(4), ExampleTranslation(5)
          const level = parseInt(row[0]);
          const unit = parseInt(row[1]);

          if (!level || !unit) return;

          const key = `${selectedInstitute.id}-${level}-${unit}`;
          if (!grouped[key]) grouped[key] = [];

          grouped[key].push({
            pattern: row[2] || '',
            explanation: row[3] || '',
            usages: [
              {
                situation: 'General',
                example: row[4] || '',
                translation: row[5] || '',
              },
            ],
          });
        });

        // Apply updates
        Object.keys(grouped).forEach(key => {
          const [_, lvl, unt] = key.split('-');
          const content = updates[key] || getContent(parseInt(lvl), parseInt(unt));
          content.grammarList = JSON.stringify(grouped[key]);
          updates[key] = content;
        });
      }

      // Commit all updates
      Object.keys(updates).forEach(key => {
        onSaveContext(key, updates[key]);
      });

      setUploadStatus('SUCCESS');

      // Reset after success
      setTimeout(() => {
        setUploadStatus('IDLE');
        setPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
    } catch (err) {
      console.error('Save error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save content');
      setUploadStatus('ERROR');
    }
  };

  // Clear upload
  const handleClearUpload = () => {
    setPreviewData([]);
    setUploadStatus('IDLE');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Payment management functions
  const toggleUnitPaymentStatus = (level: number, unit: number) => {
    if (!selectedInstitute) return;

    const key = `${selectedInstitute.id}-${level}-${unit}`;
    const content = getContent(level, unit);
    content.isPaid = !content.isPaid;
    onSaveContext(key, content);
  };

  const setFirstNUnitsFree = () => {
    if (!selectedInstitute) return;

    const count = bulkCount;
    let unitCounter = 0;

    selectedInstitute.levels.forEach(level => {
      const levelNum = typeof level === 'number' ? level : (level as any).level;
      const maxUnits = typeof level === 'number' ? 10 : (level as any).units;

      for (let unit = 1; unit <= maxUnits; unit++) {
        const key = `${selectedInstitute.id}-${levelNum}-${unit}`;
        const content = getContent(levelNum, unit);
        content.isPaid = unitCounter >= count;
        onSaveContext(key, content);
        unitCounter++;
      }
    });
  };

  const setAllUnits = (isPaid: boolean) => {
    if (!selectedInstitute) return;

    selectedInstitute.levels.forEach(level => {
      const levelNum = typeof level === 'number' ? level : (level as any).level;
      const maxUnits = typeof level === 'number' ? 10 : (level as any).units;

      for (let unit = 1; unit <= maxUnits; unit++) {
        const key = `${selectedInstitute.id}-${levelNum}-${unit}`;
        const content = getContent(levelNum, unit);
        content.isPaid = isPaid;
        onSaveContext(key, content);
      }
    });
  };

  const getUnitPaymentStatus = (level: number, unit: number): boolean => {
    if (!selectedInstitute) return false;
    const key = `${selectedInstitute.id}-${level}-${unit}`;
    return textbookContexts[key]?.isPaid || false;
  };

  // Content type tabs
  const contentTypes = [
    { value: 'vocab', label: labels.vocabulary || 'Vocabulary', icon: '📚' },
    { value: 'reading', label: labels.reading || 'Reading', icon: '📖' },
    { value: 'listening', label: labels.listening || 'Listening', icon: '🎧' },
    { value: 'grammar', label: labels.grammar || 'Grammar', icon: '📝' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {labels.contentManagement || 'Content Management'}
        </h2>
        <p className="text-gray-600">
          {viewMode === 'upload'
            ? 'Upload Excel files to batch update textbook content'
            : 'Manage free/paid status for textbook units'}
        </p>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white p-2 rounded-lg border border-gray-200 flex gap-2">
        <button
          onClick={() => setViewMode('upload')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            viewMode === 'upload'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          Content Upload
        </button>
        <button
          onClick={() => setViewMode('payment')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            viewMode === 'payment'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Payment Management
        </button>
      </div>

      {/* Institute Selection */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {labels.selectTextbook || 'Select Textbook'}
        </label>
        <select
          value={selectedInstitute?.id || ''}
          onChange={e => {
            const inst = institutes.find(i => i.id === e.target.value);
            setSelectedInstitute(inst || null);
            handleClearUpload();
          }}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- {labels.select || 'Select'} --</option>
          {institutes.map(inst => (
            <option key={inst.id} value={inst.id}>
              {inst.name}
            </option>
          ))}
        </select>
      </div>

      {/* Payment Management View */}
      {viewMode === 'payment' && selectedInstitute && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
          {/* Bulk Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Bulk Actions</h3>
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={bulkCount}
                  onChange={e => setBulkCount(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={setFirstNUnitsFree}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  {labels.bulkSetFree || 'Set first N units free'}
                </button>
              </div>
              <button
                onClick={() => setAllUnits(false)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                {labels.bulkSetAllFree || 'Set all free'}
              </button>
              <button
                onClick={() => setAllUnits(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {labels.bulkSetAllPaid || 'Set all paid'}
              </button>
            </div>
          </div>

          {/* Units List by Level */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Units by Level</h3>
            {selectedInstitute.levels.map(level => {
              const levelNum = typeof level === 'number' ? level : (level as any).level;
              const maxUnits = typeof level === 'number' ? 10 : (level as any).units;

              return (
                <div key={levelNum} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Level {levelNum}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: maxUnits }, (_, i) => i + 1).map(unit => {
                      const isPaid = getUnitPaymentStatus(levelNum, unit);

                      return (
                        <button
                          key={unit}
                          onClick={() => toggleUnitPaymentStatus(levelNum, unit)}
                          className={`p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                            isPaid
                              ? 'border-orange-300 bg-orange-50 hover:bg-orange-100'
                              : 'border-green-300 bg-green-50 hover:bg-green-100'
                          }`}
                        >
                          <span className="font-medium text-gray-800">Unit {unit}</span>
                          <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                              isPaid ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <Lock className="w-3 h-3" />
                                {labels.paidContent || 'Paid'}
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" />
                                {labels.freeContent || 'Free'}
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Type Tabs */}
      {viewMode === 'upload' && selectedInstitute && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {contentTypes.map(ct => (
              <button
                key={ct.value}
                onClick={() => {
                  setContentType(ct.value as ContentType);
                  handleClearUpload();
                }}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  contentType === ct.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{ct.icon}</span>
                {ct.label}
              </button>
            ))}
          </div>

          {/* Excel Format Instructions */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm">
            <p className="font-medium text-blue-900 mb-1">Expected Excel format:</p>
            <p className="text-blue-700">
              {contentType === 'vocab' && 'Level | Unit | Word | POS | Meaning | Example'}
              {contentType === 'reading' && 'Level | Unit | Text | Translation'}
              {contentType === 'listening' && 'Level | Unit | Script | Translation'}
              {contentType === 'grammar' &&
                'Level | Unit | Pattern | Definition | Example | Example Translation'}
            </p>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {viewMode === 'upload' && selectedInstitute && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              <FileSpreadsheet className="inline mr-2 w-5 h-5" />
              Upload Excel File
            </h3>
            {previewData.length > 0 && uploadStatus !== 'SAVING' && (
              <button
                onClick={handleClearUpload}
                className="text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          {/* File Input */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploadStatus === 'PARSING' || uploadStatus === 'SAVING'}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
          </div>

          {/* Status Messages */}
          {uploadStatus === 'PARSING' && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Parsing Excel file...</span>
            </div>
          )}

          {uploadStatus === 'ERROR' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMessage || 'An error occurred'}</span>
            </div>
          )}

          {uploadStatus === 'SUCCESS' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span>Successfully saved {Object.keys(previewData).length} items!</span>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && uploadStatus !== 'SUCCESS' && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">
                  Preview: {previewData.length} rows
                </p>
                <button
                  onClick={handleBatchSave}
                  disabled={uploadStatus === 'SAVING'}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadStatus === 'SAVING' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save to Database
                    </>
                  )}
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      {previewData[0]?.map((_: any, idx: number) => (
                        <th key={idx} className="px-3 py-2 text-left">
                          Col {idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                        {row.map((cell: any, cellIdx: number) => (
                          <td key={cellIdx} className="px-3 py-2">
                            {cell?.toString() || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 bg-gray-50 text-center text-sm text-gray-600">
                    ... and {previewData.length - 10} more rows
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Institute Selected */}
      {!selectedInstitute && (
        <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
          {viewMode === 'upload' ? (
            <>
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">
                {labels.selectTextbookFirst || 'Please select a textbook first'}
              </p>
            </>
          ) : (
            <>
              <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">
                {labels.selectTextbookFirst || 'Please select a textbook first'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentEditor;
