import React from 'react';
import { Trash2, Loader2, ImageIcon } from 'lucide-react';
import {
  TopikQuestion,
  ExamSectionStructure,
  QuestionConfig,
  getQuestionConfig,
} from './TopikConstants';

type UpdateQuestionFn = <K extends keyof TopikQuestion>(
  id: number,
  field: K,
  value: TopikQuestion[K]
) => void;

interface QuestionRendererProps {
  q: TopikQuestion;
  examType: 'READING' | 'LISTENING';
  section: ExamSectionStructure;
  isGroupStart: boolean;
  isGrouped: boolean;
  uploadingItems: Set<string>;
  updateQuestion: UpdateQuestionFn;
  updateOption: (id: number, idx: number, value: string) => void;
  updateOptionImage: (id: number, idx: number, url: string) => void;
  handleFileUpload: (
    file: File,
    onSuccess: (url: string) => void,
    uploadKey: string
  ) => Promise<void>;
}

type QuestionCommonProps = {
  q: TopikQuestion;
  section: ExamSectionStructure;
  uploadingItems: Set<string>;
  updateQuestion: UpdateQuestionFn;
  handleFileUpload: QuestionRendererProps['handleFileUpload'];
};

type QuestionOptionProps = {
  q: TopikQuestion;
  section: ExamSectionStructure;
  qConfig: QuestionConfig | null;
  uploadingItems: Set<string>;
  updateQuestion: UpdateQuestionFn;
  updateOption: QuestionRendererProps['updateOption'];
  updateOptionImage: QuestionRendererProps['updateOptionImage'];
  handleFileUpload: QuestionRendererProps['handleFileUpload'];
};

function getFirstFile(event: React.ChangeEvent<HTMLInputElement>): File | null {
  return event.target.files?.[0] || null;
}

function handleFileSelection(
  event: React.ChangeEvent<HTMLInputElement>,
  onFile: (file: File) => void
) {
  const file = getFirstFile(event);
  if (file) onFile(file);
}

const ImageUploadControl: React.FC<{
  inputId: string;
  uploadKey: string;
  uploadingItems: Set<string>;
  handleFileUpload: QuestionRendererProps['handleFileUpload'];
  onUploadSuccess: (url: string) => void;
  label: string;
  className: string;
  loadingIconClassName: string;
  iconClassName: string;
}> = ({
  inputId,
  uploadKey,
  uploadingItems,
  handleFileUpload,
  onUploadSuccess,
  label,
  className,
  loadingIconClassName,
  iconClassName,
}) => (
  <button
    type="button"
    className={className}
    onClick={() => document.getElementById(inputId)?.click()}
    aria-label={label}
  >
    {uploadingItems.has(uploadKey) ? (
      <Loader2 className={loadingIconClassName} />
    ) : (
      <ImageIcon className={iconClassName} />
    )}
    {label}
    <input
      id={inputId}
      type="file"
      hidden
      accept="image/*"
      onChange={event =>
        handleFileSelection(event, file => {
          void handleFileUpload(file, onUploadSuccess, uploadKey);
        })
      }
    />
  </button>
);

const RemovableImage: React.FC<{
  src: string;
  alt: string;
  imageClassName: string;
  onRemove: () => void;
}> = ({ src, alt, imageClassName, onRemove }) => (
  <div className="relative inline-block group/img">
    <img src={src} className={imageClassName} alt={alt} />
    <button
      type="button"
      onClick={onRemove}
      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover/img:opacity-100"
      aria-label="Remove image"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  </div>
);

const ContextBoxInput: React.FC<{
  q: TopikQuestion;
  updateQuestion: UpdateQuestionFn;
}> = ({ q, updateQuestion }) => (
  <div className="border-2 border-zinc-800 p-4 relative rounded-lg">
    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-zinc-300 rounded">
      &lt;보 기&gt;
    </span>
    <textarea
      className="w-full bg-white p-2 text-[15px] resize-none outline-none h-16"
      placeholder="输入要插入的句子..."
      aria-label="输入要插入的句子"
      value={q.contextBox || ''}
      onChange={event => updateQuestion(q.id, 'contextBox', event.target.value)}
    />
  </div>
);

const FillQuestionEditor: React.FC<Pick<QuestionCommonProps, 'q' | 'updateQuestion'>> = ({
  q,
  updateQuestion,
}) => (
  <textarea
    className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-20"
    placeholder="输入句子（含填空或下划线）..."
    aria-label="输入句子（含填空或下划线）"
    value={q.question || ''}
    onChange={event => updateQuestion(q.id, 'question', event.target.value)}
  />
);

const ImageRequiredEditor: React.FC<QuestionCommonProps> = ({
  q,
  uploadingItems,
  updateQuestion,
  handleFileUpload,
}) => (
  <div className="mb-2">
    {q.image ? (
      <RemovableImage
        src={q.image}
        alt="Q"
        imageClassName="max-h-48 border-2 border-zinc-200 rounded-lg"
        onRemove={() => updateQuestion(q.id, 'image', '')}
      />
    ) : (
      <ImageUploadControl
        inputId={`file-input-${q.id}`}
        uploadKey={`img-${q.id}`}
        uploadingItems={uploadingItems}
        handleFileUpload={handleFileUpload}
        onUploadSuccess={url => updateQuestion(q.id, 'image', url)}
        label="上传图片 (必须)"
        className="cursor-pointer inline-flex items-center px-4 py-3 bg-blue-50 text-blue-600 text-sm rounded-lg border-2 border-blue-200 hover:border-blue-400"
        loadingIconClassName="w-4 h-4 mr-2 animate-spin"
        iconClassName="w-4 h-4 mr-2"
      />
    )}
  </div>
);

const ImageOrPassageEditor: React.FC<QuestionCommonProps> = ({
  q,
  uploadingItems,
  updateQuestion,
  handleFileUpload,
}) => (
  <div className="space-y-3">
    <div className="flex gap-3">
      {q.image ? (
        <RemovableImage
          src={q.image}
          alt="Q"
          imageClassName="max-h-40 border-2 border-zinc-200 rounded-lg"
          onRemove={() => updateQuestion(q.id, 'image', '')}
        />
      ) : (
        <ImageUploadControl
          inputId={`file-input-9-12-${q.id}`}
          uploadKey={`img-${q.id}`}
          uploadingItems={uploadingItems}
          handleFileUpload={handleFileUpload}
          onUploadSuccess={url => updateQuestion(q.id, 'image', url)}
          label="上传图片"
          className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 text-xs rounded-lg border-2 border-blue-200 hover:border-blue-400"
          loadingIconClassName="w-3 h-3 mr-1 animate-spin"
          iconClassName="w-3 h-3 mr-1"
        />
      )}
    </div>
    <textarea
      className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-24"
      placeholder="或输入阅读文段..."
      aria-label="或输入阅读文段"
      value={q.passage || ''}
      onChange={event => updateQuestion(q.id, 'passage', event.target.value)}
    />
  </div>
);

const OrderingEditor: React.FC<Pick<QuestionCommonProps, 'q' | 'updateQuestion'>> = ({
  q,
  updateQuestion,
}) => (
  <div className="border-2 border-zinc-800 p-4 relative rounded-lg">
    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs font-bold border border-zinc-300 rounded">
      보기
    </span>
    <textarea
      className="w-full bg-white p-2 text-[15px] resize-none outline-none h-24"
      placeholder="输入排序内容 (가), (나), (다), (라)..."
      aria-label="输入排序内容"
      value={q.contextBox || ''}
      onChange={event => updateQuestion(q.id, 'contextBox', event.target.value)}
    />
  </div>
);

const PassageOnlyEditor: React.FC<
  Pick<QuestionCommonProps, 'q' | 'section' | 'updateQuestion'>
> = ({ q, section, updateQuestion }) => {
  const isHeadline = section.style === 'HEADLINE';
  return (
    <textarea
      className={`w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 ${isHeadline ? 'font-bold border-zinc-800 shadow-[3px_3px_0px_#000] h-24' : 'h-32'}`}
      placeholder={isHeadline ? '输入新闻标题...' : '输入阅读文段...'}
      aria-label={isHeadline ? '输入新闻标题' : '输入阅读文段'}
      value={q.passage || ''}
      onChange={event => updateQuestion(q.id, 'passage', event.target.value)}
    />
  );
};

const InsertSentenceEditor: React.FC<
  Pick<QuestionCommonProps, 'q' | 'updateQuestion'> & { grouped: boolean }
> = ({ q, updateQuestion, grouped }) => {
  if (grouped) return <ContextBoxInput q={q} updateQuestion={updateQuestion} />;

  return (
    <div className="space-y-4">
      <textarea
        className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-40"
        placeholder="输入主文段 (含 ㉠ ㉡ ㉢ ㉣ 标记)..."
        aria-label="输入主文段"
        value={q.passage || ''}
        onChange={event => updateQuestion(q.id, 'passage', event.target.value)}
      />
      <ContextBoxInput q={q} updateQuestion={updateQuestion} />
    </div>
  );
};

const GroupedSharedEditor: React.FC<
  Pick<QuestionCommonProps, 'q' | 'updateQuestion'> & {
    qConfig: QuestionConfig;
    isGroupStart: boolean;
    isGrouped: boolean;
  }
> = ({ q, qConfig, isGroupStart, isGrouped, updateQuestion }) => {
  if (!isGroupStart || isGrouped) return null;
  return (
    <div className="space-y-4">
      <textarea
        className="w-full bg-white border-2 border-zinc-200 rounded-lg p-3 text-[16px] leading-7 font-serif resize-none outline-none focus:border-zinc-900 h-48"
        placeholder="输入共享阅读文段..."
        aria-label="输入共享阅读文段"
        value={q.passage || ''}
        onChange={event => updateQuestion(q.id, 'passage', event.target.value)}
      />
      {qConfig.needsContextBox ? <ContextBoxInput q={q} updateQuestion={updateQuestion} /> : null}
    </div>
  );
};

const QuestionStemEditor: React.FC<
  QuestionCommonProps & {
    qConfig: QuestionConfig | null;
    isGroupStart: boolean;
    isGrouped: boolean;
  }
> = ({
  q,
  section,
  qConfig,
  isGroupStart,
  isGrouped,
  uploadingItems,
  updateQuestion,
  handleFileUpload,
}) => {
  if (!qConfig) return null;

  switch (qConfig.uiType) {
    case 'FILL_QUESTION':
      return <FillQuestionEditor q={q} updateQuestion={updateQuestion} />;
    case 'IMAGE_REQUIRED':
      return (
        <ImageRequiredEditor
          q={q}
          section={section}
          uploadingItems={uploadingItems}
          updateQuestion={updateQuestion}
          handleFileUpload={handleFileUpload}
        />
      );
    case 'IMAGE_OR_PASSAGE':
      return (
        <ImageOrPassageEditor
          q={q}
          section={section}
          uploadingItems={uploadingItems}
          updateQuestion={updateQuestion}
          handleFileUpload={handleFileUpload}
        />
      );
    case 'ORDERING':
      return <OrderingEditor q={q} updateQuestion={updateQuestion} />;
    case 'PASSAGE_ONLY':
      return <PassageOnlyEditor q={q} section={section} updateQuestion={updateQuestion} />;
    case 'INSERT_SENTENCE':
      return (
        <InsertSentenceEditor
          q={q}
          updateQuestion={updateQuestion}
          grouped={Boolean(qConfig.grouped)}
        />
      );
    case 'GROUPED':
      return (
        <GroupedSharedEditor
          q={q}
          qConfig={qConfig}
          isGroupStart={isGroupStart}
          isGrouped={isGrouped}
          updateQuestion={updateQuestion}
        />
      );
    default:
      return null;
  }
};

const QuestionTitleEditor: React.FC<{
  q: TopikQuestion;
  qConfig: QuestionConfig | null;
  examType: 'READING' | 'LISTENING';
  updateQuestion: UpdateQuestionFn;
}> = ({ q, qConfig, examType, updateQuestion }) => {
  if (qConfig?.needsQuestionInput) {
    return (
      <input
        className="w-full font-bold text-[17px] bg-white border-b-2 border-zinc-200 hover:border-zinc-400 focus:border-zinc-900 outline-none py-2"
        placeholder="输入问题..."
        aria-label="输入问题"
        value={q.question || ''}
        onChange={event => updateQuestion(q.id, 'question', event.target.value)}
      />
    );
  }

  if (qConfig?.question) {
    return (
      <div className="font-bold text-[17px] text-zinc-700 py-2 border-b border-zinc-200">
        {qConfig.question}
      </div>
    );
  }

  if (!qConfig && examType === 'LISTENING') {
    return (
      <input
        className="w-full font-bold text-[17px] bg-white border-b-2 border-zinc-200 hover:border-zinc-400 focus:border-zinc-900 outline-none py-2"
        placeholder="输入问题..."
        aria-label="输入问题"
        value={q.question || ''}
        onChange={event => updateQuestion(q.id, 'question', event.target.value)}
      />
    );
  }

  return null;
};

const FixedOptionsEditor: React.FC<{
  q: TopikQuestion;
  fixedOptions: string[];
  updateQuestion: UpdateQuestionFn;
}> = ({ q, fixedOptions, updateQuestion }) => (
  <div className="grid grid-cols-4 gap-3">
    {fixedOptions.map((opt, optionIndex) => (
      <button
        key={opt}
        onClick={() => updateQuestion(q.id, 'correctAnswer', optionIndex)}
        className={`py-3 px-4 rounded-lg border-2 text-lg font-bold transition-colors ${q.correctAnswer === optionIndex ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-300 text-zinc-600 hover:border-zinc-600'}`}
        aria-label={`Select option ${optionIndex + 1}: ${opt}`}
        aria-pressed={q.correctAnswer === optionIndex}
      >
        {optionIndex + 1} {opt}
      </button>
    ))}
  </div>
);

const EditableOptionsEditor: React.FC<{
  q: TopikQuestion;
  updateQuestion: UpdateQuestionFn;
  updateOption: QuestionRendererProps['updateOption'];
}> = ({ q, updateQuestion, updateOption }) => (
  <div
    className={`grid ${q.options.some(option => option.length > 25) ? 'grid-cols-1' : 'grid-cols-2'} gap-x-8 gap-y-2`}
  >
    {q.options.map((opt, optionIndex) => (
      <div key={`opt-${q.id}-${optionIndex}`} className="flex items-center gap-2">
        <button
          onClick={() => updateQuestion(q.id, 'correctAnswer', optionIndex)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-sans transition-colors ${q.correctAnswer === optionIndex ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-300 text-zinc-400 hover:border-zinc-600'}`}
          aria-label={`Mark option ${optionIndex + 1} as correct`}
          aria-pressed={q.correctAnswer === optionIndex}
        >
          {optionIndex + 1}
        </button>
        <input
          className="flex-1 bg-white border-b-2 border-transparent hover:border-zinc-200 focus:border-zinc-900 outline-none text-[16px] py-1"
          value={opt}
          onChange={event => updateOption(q.id, optionIndex, event.target.value)}
          placeholder={`选项 ${optionIndex + 1}`}
          aria-label={`选项 ${optionIndex + 1}`}
        />
      </div>
    ))}
  </div>
);

const ImageChoiceOptionCard: React.FC<{
  q: TopikQuestion;
  optionIndex: number;
  uploadingItems: Set<string>;
  updateQuestion: UpdateQuestionFn;
  updateOptionImage: QuestionRendererProps['updateOptionImage'];
  handleFileUpload: QuestionRendererProps['handleFileUpload'];
}> = ({ q, optionIndex, uploadingItems, updateQuestion, updateOptionImage, handleFileUpload }) => {
  const image = q.optionImages?.[optionIndex];
  const inputId = `file-input-opt-${q.id}-${optionIndex}`;
  const uploadKey = `opt-${q.id}-${optionIndex}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-full aspect-[4/3] group/optImg">
        <div
          className={`w-full h-full border-2 rounded-lg flex flex-col items-center justify-center overflow-hidden transition-all ${
            q.correctAnswer === optionIndex
              ? 'border-zinc-900 ring-2 ring-lime-300'
              : 'border-zinc-200 hover:border-zinc-400'
          }`}
        >
          {image ? (
            <img
              src={image}
              className="w-full h-full object-contain"
              alt={`Option ${optionIndex + 1}`}
            />
          ) : (
            <button
              type="button"
              className="flex flex-col items-center text-zinc-400 cursor-pointer w-full h-full justify-center hover:bg-zinc-50 transition-colors border-none bg-transparent"
              onClick={() => document.getElementById(inputId)?.click()}
            >
              {uploadingItems.has(uploadKey) ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <ImageIcon className="w-8 h-8 mb-2" />
              )}
              <span className="text-xs font-bold">上传选项 {optionIndex + 1}</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => updateQuestion(q.id, 'correctAnswer', optionIndex)}
          className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm border-2 ${
            q.correctAnswer === optionIndex
              ? 'bg-zinc-900 text-white border-zinc-900 scale-110'
              : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-900 hover:text-zinc-900'
          }`}
          aria-label="Select as correct answer"
          aria-pressed={q.correctAnswer === optionIndex}
        >
          {optionIndex + 1}
        </button>

        {image ? (
          <div className="absolute top-2 right-2 opacity-0 group-hover/optImg:opacity-100 transition-opacity">
            <button
              type="button"
              className="p-1.5 bg-white border-2 border-zinc-900 rounded-full text-red-500 hover:bg-red-50 shadow-[1px_1px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all"
              onClick={event => {
                event.stopPropagation();
                updateOptionImage(q.id, optionIndex, '');
              }}
              aria-label="Remove image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        <input
          id={inputId}
          type="file"
          hidden
          accept="image/*"
          onChange={event =>
            handleFileSelection(event, file => {
              void handleFileUpload(
                file,
                url => updateOptionImage(q.id, optionIndex, url),
                uploadKey
              );
            })
          }
        />
      </div>
    </div>
  );
};

const ImageChoiceOptionsEditor: React.FC<{
  q: TopikQuestion;
  uploadingItems: Set<string>;
  updateQuestion: UpdateQuestionFn;
  updateOptionImage: QuestionRendererProps['updateOptionImage'];
  handleFileUpload: QuestionRendererProps['handleFileUpload'];
}> = ({ q, uploadingItems, updateQuestion, updateOptionImage, handleFileUpload }) => (
  <div className="grid grid-cols-2 gap-4">
    {[0, 1, 2, 3].map(optionIndex => (
      <ImageChoiceOptionCard
        key={`img-opt-${q.id}-${optionIndex}`}
        q={q}
        optionIndex={optionIndex}
        uploadingItems={uploadingItems}
        updateQuestion={updateQuestion}
        updateOptionImage={updateOptionImage}
        handleFileUpload={handleFileUpload}
      />
    ))}
  </div>
);

const QuestionOptions: React.FC<QuestionOptionProps> = ({
  q,
  section,
  qConfig,
  uploadingItems,
  updateQuestion,
  updateOption,
  updateOptionImage,
  handleFileUpload,
}) => {
  if (section.type === 'IMAGE_CHOICE') {
    return (
      <ImageChoiceOptionsEditor
        q={q}
        uploadingItems={uploadingItems}
        updateQuestion={updateQuestion}
        updateOptionImage={updateOptionImage}
        handleFileUpload={handleFileUpload}
      />
    );
  }

  if (qConfig?.fixedOptions) {
    return (
      <FixedOptionsEditor
        q={q}
        fixedOptions={qConfig.fixedOptions}
        updateQuestion={updateQuestion}
      />
    );
  }

  return (
    <EditableOptionsEditor q={q} updateQuestion={updateQuestion} updateOption={updateOption} />
  );
};

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  q,
  examType,
  section,
  isGroupStart,
  isGrouped,
  uploadingItems,
  updateQuestion,
  updateOption,
  updateOptionImage,
  handleFileUpload,
}) => {
  const qConfig = getQuestionConfig(q.id, examType);

  return (
    <div className="mb-8 p-4 rounded-xl hover:bg-zinc-50 transition-colors border-2 border-transparent hover:border-zinc-200">
      <div className="flex gap-4">
        <span className="text-xl font-bold font-serif pt-1">{q.id}.</span>
        <div className="flex-1 space-y-4">
          <QuestionStemEditor
            q={q}
            section={section}
            qConfig={qConfig}
            isGroupStart={isGroupStart}
            isGrouped={isGrouped}
            uploadingItems={uploadingItems}
            updateQuestion={updateQuestion}
            handleFileUpload={handleFileUpload}
          />

          <QuestionTitleEditor
            q={q}
            qConfig={qConfig}
            examType={examType}
            updateQuestion={updateQuestion}
          />

          <QuestionOptions
            q={q}
            section={section}
            qConfig={qConfig}
            uploadingItems={uploadingItems}
            updateQuestion={updateQuestion}
            updateOption={updateOption}
            updateOptionImage={updateOptionImage}
            handleFileUpload={handleFileUpload}
          />
        </div>
      </div>
    </div>
  );
};
