import React from 'react';
import { clsx } from 'clsx';
import { TopikQuestion } from '../../../types';
import { sanitizeStrictHtml } from '../../../utils/sanitize';

const FILL_BLANK_PATTERN = /\(\s+\)|\(\s*\u3000\s*\)|\(\s*\)/;
const FILL_BLANK_PATTERN_GLOBAL = /\(\s+\)|\(\s*\u3000\s*\)|\(\s*\)/g;

/* ─────────────── KSoft tactile exam styles ─────────────── */
const EXAM_TACTILE_STYLES = `
.card-paper {
  background: #FFFFFF;
  box-shadow:
    0 18px 42px -18px rgba(31,27,23,0.16),
    inset 0 1px 1px rgba(255,255,255,1),
    inset 0 -2px 1px rgba(31,27,23,0.02);
  border: 1px solid rgba(31,27,23,0.08);
}
.topik-option {
  background: linear-gradient(180deg, #FFFFFF 0%, #FBF8F3 100%);
  border: 1px solid rgba(31,27,23,0.1);
  box-shadow: 0 4px 0px rgba(31,27,23,0.12), 0 8px 18px rgba(31,27,23,0.03);
  transition: all 0.1s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
}
.topik-option:active, .topik-option.topik-selected {
  transform: translateY(4px);
  box-shadow: 0 0px 0px rgba(31,27,23,0.12), inset 0 2px 4px rgba(31,27,23,0.04);
  background: #FFF7E1;
  border-color: #A23B2E;
}
.topik-option.topik-selected .option-num {
  background: #A23B2E; color: white; border-color: #8F3429;
}
.topik-option.topik-selected .option-text { color: #1F1B17; font-weight: 900; }
.print-graphic-slot {
  background: #FFFFFF;
  box-shadow: inset 0 2px 8px rgba(31,27,23,0.05), 0 1px 0 rgba(255,255,255,1);
  border: 1px solid rgba(31,27,23,0.1);
  filter: contrast(1.1) grayscale(20%);
}
.sequence-block {
  background: #FBF8F3;
  border: 1px solid rgba(31,27,23,0.08);
  border-left: 3px solid #B38941;
}
.target-sentence-card {
  background: linear-gradient(160deg, #1F1B17 0%, #2F3F68 100%);
  box-shadow: 0 12px 24px -6px rgba(31,27,23,0.3), inset 0 1px 1px rgba(255,255,255,0.1);
  color: white;
}
.insert-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  background: #F5EFE5;
  border-radius: 6px;
  box-shadow: inset 0 2px 4px rgba(31,27,23,0.12), 0 1px 0 rgba(255,255,255,1);
  font-size: 11px;
  font-weight: 900;
  color: #8C8377;
  margin: 0 4px;
  vertical-align: middle;
  transition: all 0.2s;
}
.insert-slot.insert-slot-active {
  background: #A23B2E;
  color: white;
  box-shadow: inset 0 2px 4px rgba(31,27,23,0.3), 0 0 12px rgba(162,59,46,0.24);
  transform: scale(1.1);
}

/* ───────── Newspaper Headline (Q25-27) ───────── */
.newspaper-cutout {
  background: #FDFBF7;
  border-top: 4px solid #1F1B17;
  border-bottom: 2px solid #1F1B17;
  padding: 24px 16px;
  position: relative;
  text-align: center;
  box-shadow: inset 0 0 20px rgba(31,27,23,0.02);
}
.newspaper-cutout::before {
  content: "NEWS FLASH";
  position: absolute;
  top: 0; left: 50%;
  transform: translate(-50%, -50%);
  background: #1F1B17;
  color: white;
  font-size: 9px;
  font-weight: 900;
  padding: 2px 8px;
  letter-spacing: 0.1em;
  border-radius: 4px;
}
.headline-text {
  font-family: inherit; /* use standard system/sans for news title */
  font-weight: 900;
  font-size: 18px;
  line-height: 1.5;
  color: #1F1B17;
  word-break: keep-all;
}

/* ───────── Fill in the Blank (Slot) ───────── */
.blank-slot {
  display: inline-block;
  min-width: 60px;
  height: 24px;
  margin: 0 6px;
  background-color: #F5EFE5;
  border-bottom: 2px dashed #B38941;
  vertical-align: bottom;
  position: relative;
  top: -2px;
}

.reading-text {
  font-family: "KoPub Batang", "Apple Myungjo", "Batang", serif;
  line-height: 1.8;
  color: #3D3832;
  text-align: left;
  word-break: keep-all;
}
`;

/* ─────────────── Insert Slot Markers ─────────────── */
const INSERT_MARKERS = ['㉠', '㉡', '㉢', '㉣'];

/* ─────────────── Sequence Markers ─────────────── */
const SEQUENCE_MARKER_REGEX = /\(([가-라])\)\s*/g;

function parseSequenceBlocks(text: string): { label: string; content: string }[] {
  const blocks: { label: string; content: string }[] = [];
  const parts = text.split(SEQUENCE_MARKER_REGEX);
  // parts = ["prefix", "가", "content after 가", "나", "content after 나", ...]
  for (let i = 1; i < parts.length; i += 2) {
    const label = parts[i];
    const content = (parts[i + 1] || '').trim();
    if (label && content) {
      blocks.push({ label: `(${label})`, content });
    }
  }
  return blocks;
}

/* ─────────────── Question Type Detection ─────────────── */
function getQuestionVariant(
  question: TopikQuestion
): 'sequence' | 'insert' | 'visual' | 'headline' | 'fill-blank' | 'default' {
  const qNum = question.number || question.id;

  // Q25-27 Newspaper Headlines
  if (question.layout === 'NEWS_HEADLINE' || (qNum >= 25 && qNum <= 27)) {
    return 'headline';
  }

  // Q39-41 Sentence Insertion: fixed options ㉠㉡㉢㉣ and contextBox present
  if (
    qNum >= 39 &&
    qNum <= 41 &&
    question.contextBox &&
    question.options?.some(opt => INSERT_MARKERS.includes(opt))
  ) {
    return 'insert';
  }
  // Q13-15 Sequence ordering: contextBox contains (가)(나)(다)(라)
  if (
    qNum >= 13 &&
    qNum <= 15 &&
    question.contextBox &&
    /\([가나다라]\)/.test(question.contextBox)
  ) {
    return 'sequence';
  }
  // Q5-12 Visual/Graph: has image
  if (question.layout === 'IMAGE' || question.imageUrl || question.image) {
    return 'visual';
  }

  // Fill in the blank (checks for empty parentheses pattern in question or passage)
  const isFillBlank = (text?: string) => Boolean(text && FILL_BLANK_PATTERN.test(text));
  if (
    isFillBlank(question.question) ||
    isFillBlank(question.passage) ||
    isFillBlank(question.instruction)
  ) {
    return 'fill-blank';
  }

  return 'default';
}

/* ─────────────── Get Question Type Label ─────────────── */
function getQuestionTypeLabel(
  variant: ReturnType<typeof getQuestionVariant>,
  question: TopikQuestion
): string {
  switch (variant) {
    case 'visual':
      return '图表阅读';
    case 'sequence':
      return '段落排序';
    case 'insert':
      return '句子插入';
    case 'headline':
      return '新闻阅读';
    case 'fill-blank':
      return '信息填空';
    default:
      if (question.passage) return '阅读理解';
      return '选择题';
  }
}

/* ─────────────── Advanced Text Formatters ─────────────── */
function formatFillBlank(text: string): string {
  // Matches any empty parentheses, replacing them with a custom physical slot HTML
  return text.replace(FILL_BLANK_PATTERN_GLOBAL, '<span class="blank-slot"></span>');
}

/* ─────────────── Render Passage with Insert Slots ─────────────── */
function renderPassageWithSlots(passage: string, selectedOption?: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const markerRegex = /[㉠㉡㉢㉣]/g;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(passage)) !== null) {
    // Add text before the marker
    if (match.index > lastIndex) {
      nodes.push(<span key={`t-${lastIndex}`}>{passage.slice(lastIndex, match.index)}</span>);
    }
    // Add the slot marker
    const markerChar = match[0];
    const markerIndex = INSERT_MARKERS.indexOf(markerChar);
    const isActive = selectedOption === markerIndex;
    nodes.push(
      <span
        key={`slot-${markerIndex}`}
        className={clsx('insert-slot', isActive && 'insert-slot-active')}
      >
        {markerChar}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  // Add remaining text
  if (lastIndex < passage.length) {
    nodes.push(<span key={`t-end`}>{passage.slice(lastIndex)}</span>);
  }
  return nodes;
}

/* ═══════════════════════════════════════════════════════════════
   Component: MobileQuestionRenderer (Premium Tactile V3)
   ═══════════════════════════════════════════════════════════════ */

interface MobileQuestionRendererProps {
  question: TopikQuestion;
  userAnswer?: number;
  onAnswerChange: (optionIndex: number) => void;
  showPassage?: boolean;
}

export const MobileQuestionRenderer: React.FC<MobileQuestionRendererProps> = ({
  question,
  userAnswer,
  onAnswerChange,
  showPassage = false,
}) => {
  const sanitize = (html?: string) => sanitizeStrictHtml(String(html ?? ''));
  const variant = getQuestionVariant(question);
  const typeLabel = getQuestionTypeLabel(variant, question);
  const questionImage = question.imageUrl || question.image;

  return (
    <div className="flex flex-col gap-6">
      <style>{EXAM_TACTILE_STYLES}</style>

      <section className="card-paper w-full rounded-[1.5rem] p-5 relative">
        {/* ── Header ── */}
        <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
          <span className="bg-slate-800 text-white rounded-full px-2.5 py-0.5 text-[11px] font-black">
            {question.number || '?'}
          </span>
          <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase">
            {typeLabel}
          </span>
        </div>

        {/* ── Instruction (if present) ── */}
        {question.instruction && (
          <p
            className="text-[11px] font-bold text-slate-400 leading-relaxed mb-3 tracking-wide"
            dangerouslySetInnerHTML={{
              __html: sanitize(
                variant === 'fill-blank'
                  ? formatFillBlank(question.instruction)
                  : question.instruction
              ),
            }}
          />
        )}

        {/* ── Question Text ── */}
        {question.question && (
          <h4
            className="text-[14px] font-black text-slate-900 leading-relaxed mb-4 tracking-wide break-keep"
            dangerouslySetInnerHTML={{
              __html: sanitize(
                variant === 'fill-blank' ? formatFillBlank(question.question) : question.question
              ),
            }}
          />
        )}

        {/* ═══════ Variant: VISUAL / GRAPH (Q9-12) ═══════ */}
        {variant === 'visual' && questionImage && (
          <div className="print-graphic-slot rounded-[1rem] p-3 mb-6 flex items-center justify-center min-h-[160px] overflow-hidden">
            <img
              src={questionImage}
              alt={question.number ? String(question.number) : ''}
              className="w-full h-auto max-h-[280px] object-contain"
            />
          </div>
        )}

        {/* ═══════ Variant: SEQUENCE / ORDERING (Q13-15) ═══════ */}
        {variant === 'sequence' &&
          question.contextBox &&
          (() => {
            const blocks = parseSequenceBlocks(question.contextBox);
            if (blocks.length === 0) {
              // Fallback: render raw contextBox
              return (
                <div className="bg-[#F8F9FA] rounded-[1.2rem] p-4 mb-6 border border-slate-100 shadow-inner">
                  <p className="reading-text text-[14px]">{question.contextBox}</p>
                </div>
              );
            }
            return (
              <div className="space-y-2 mb-6">
                {blocks.map((block, idx) => (
                  <div
                    key={idx}
                    className="sequence-block rounded-r-[0.8rem] p-3 flex items-start space-x-3"
                  >
                    <span className="text-[12px] font-black text-slate-500 shrink-0 mt-0.5">
                      {block.label}
                    </span>
                    <p className="reading-text text-[14px]">{block.content}</p>
                  </div>
                ))}
              </div>
            );
          })()}

        {/* ═══════ Variant: INSERT / SENTENCE INSERTION (Q39-41) ═══════ */}
        {variant === 'insert' && (
          <>
            {/* Target Sentence Card */}
            {question.contextBox && (
              <div className="target-sentence-card rounded-[1.2rem] p-4 mb-6 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-2 py-0.5 rounded-[4px] text-[9px] font-black tracking-widest uppercase shadow-sm">
                  Target Sentence
                </div>
                <p className="text-[15px] font-bold text-center leading-relaxed tracking-wide text-white mt-1">
                  {question.contextBox}
                </p>
              </div>
            )}

            {/* Passage with Insert Slots */}
            {question.passage && (
              <div className="bg-[#F8F9FA] rounded-[1.2rem] p-5 mb-6 border border-slate-100 shadow-inner">
                <p className="reading-text text-[15px]">
                  {renderPassageWithSlots(question.passage, userAnswer)}
                </p>
              </div>
            )}
          </>
        )}

        {/* ═══════ Variant: HEADLINE (Q25-27) ═══════ */}
        {variant === 'headline' && question.passage && (
          <div className="newspaper-cutout mb-6 mt-2">
            <h5
              className="headline-text"
              dangerouslySetInnerHTML={{ __html: sanitize(question.passage) }}
            />
          </div>
        )}

        {/* ═══════ Variant: FILL IN THE BLANK ═══════ */}
        {variant === 'fill-blank' && showPassage && question.passage && (
          <div className="bg-[#F8F9FA] rounded-[1.2rem] p-5 mb-6 border border-slate-100 shadow-inner">
            <p
              className="reading-text text-[15px] whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitize(formatFillBlank(question.passage)) }}
            />
          </div>
        )}

        {/* ═══════ Default: Standard Passage ═══════ */}
        {variant === 'default' && showPassage && question.passage && (
          <div className="bg-[#F8F9FA] rounded-[1.2rem] p-5 mb-6 border border-slate-100 shadow-inner">
            <p
              className="reading-text text-[15px] whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitize(question.passage) }}
            />
          </div>
        )}

        {/* ═══════ Context Box Fallback ═══════ */}
        {(variant === 'default' || variant === 'fill-blank') && question.contextBox && (
          <div className="bg-[#F8F9FA] rounded-[1.2rem] p-5 mb-6 border border-slate-100 shadow-inner">
            <p
              className="reading-text text-[15px] whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: sanitize(
                  variant === 'fill-blank'
                    ? formatFillBlank(question.contextBox)
                    : question.contextBox
                ),
              }}
            />
          </div>
        )}

        {/* ═══════ Options ═══════ */}

        {/* Image-based options (Listening Q1-3) */}
        {question.optionImages && question.optionImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {question.optionImages.map((imgUrl, idx) => {
              const isSelected = userAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => onAnswerChange(idx)}
                  className={clsx(
                    'topik-option relative rounded-xl overflow-hidden aspect-[4/3] flex items-center justify-center active:scale-[0.98] transition-transform select-none touch-manipulation',
                    isSelected && 'topik-selected'
                  )}
                >
                  <img
                    src={imgUrl}
                    alt={String(idx + 1)}
                    className="w-full h-full object-contain"
                  />
                  <span
                    className={clsx(
                      'option-num absolute top-2 left-2 w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-[11px] font-black',
                      isSelected && 'bg-blue-500 text-white border-blue-600'
                    )}
                  >
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        ) : variant === 'insert' ? (
          /* Insert questions: 4-column grid with compact ㉠㉡㉢㉣ buttons */
          <div className="grid grid-cols-4 gap-3">
            {question.options.map((option, idx) => {
              const isSelected = userAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => onAnswerChange(idx)}
                  className={clsx(
                    'topik-option w-full rounded-xl py-3 flex justify-center active:scale-[0.98] transition-transform select-none touch-manipulation',
                    isSelected && 'topik-selected'
                  )}
                >
                  <span
                    className={clsx(
                      'option-num w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-[11px] font-black'
                    )}
                  >
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Standard text options */
          <div className="space-y-3">
            {question.options.map((option, idx) => {
              const isSelected = userAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => onAnswerChange(idx)}
                  className={clsx(
                    'topik-option w-full rounded-[1rem] py-3 px-4 flex items-center text-left active:scale-[0.98] transition-transform select-none touch-manipulation',
                    isSelected && 'topik-selected'
                  )}
                >
                  <span
                    className={clsx(
                      'option-num w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-[11px] font-black shrink-0 mr-3'
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className="option-text font-bold text-[13px] text-slate-700">{option}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
