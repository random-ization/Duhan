/**
 * WongojiEditor.tsx
 *
 * A Korean manuscript-paper (원고지) editor.
 *
 * Architecture
 * ────────────
 *  - BOTTOM layer: native <textarea>, absolutely positioned, fully transparent.
 *    It handles all keyboard events and Korean IME composition states.
 *  - TOP layer: CSS-grid of 20 cells per row rendered purely from `value`.
 *    It is pointer-events-none so all clicks fall through to the textarea.
 *
 * Behaviour
 * ─────────
 *  - '\n' in the string advances rendering to the next row boundary (fills
 *    remaining cells of the current row with empty cells then starts fresh).
 *  - Characters beyond maxLength are not rendered and the textarea enforces
 *    the limit via maxLength.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { KT } from '../../theme/ksoftTokens';

const COLS = 20; // fixed columns per row

export interface WongojiEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Maximum characters allowed. Default 700 (Q54). Use 300 for Q53. */
  maxLength?: number;
  className?: string;
  readOnly?: boolean;
  surfaceTone?: 'default' | 'paper';
  fullWidth?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Expand `value` into a flat array of cells, each being either a character
 * string or the sentinel `null` (empty/padding cell).
 * `\n` forces padding to the end of the current row so the next character
 * starts on a fresh row.
 */
function buildCells(value: string, totalCells: number): Array<string | null> {
  const cells: Array<string | null> = [];

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];

    if (ch === '\n') {
      // Pad remainder of current row with null cells
      const filled = cells.length % COLS;
      if (filled !== 0) {
        const padding = COLS - filled;
        for (let p = 0; p < padding; p++) cells.push(null);
      }
      // If we're already at a newline boundary, we still add one blank row to
      // represent the newline visually (like an empty paragraph break).
      if (cells.length % COLS === 0) {
        for (let p = 0; p < COLS; p++) cells.push(null);
      }
    } else {
      cells.push(ch);
    }
  }

  // Pad to fill the last row and reach totalCells
  while (cells.length < totalCells) cells.push(null);

  return cells.slice(0, totalCells);
}

// ─── sub-components ───────────────────────────────────────────────────────────

interface CellProps {
  char: string | null;
  /** Whether this cell is at the cursor position */
  isCursor: boolean;
  /** 0-indexed column */
  col: number;
  /** 0-indexed row */
  row: number;
  compact?: boolean;
  paperTone?: boolean;
  fullWidth?: boolean;
}

const Cell = React.memo(
  ({
    char,
    isCursor,
    col,
    row,
    compact = false,
    paperTone = false,
    fullWidth = false,
  }: CellProps) => {
    // First column of each row gets a slightly thicker left border (classic
    // 원고지 style) and every 5th column has a mid-weight separator.
    const isRowStart = col === 0;
    const isFifthCol = (col + 1) % 5 === 0 && col !== COLS - 1;

    // Top border is thicker at row 0 and every 10 rows (traditional 원고지).
    const isTenthRow = (row + 1) % 10 === 0;

    return (
      <div
        className={cn(
          'relative flex items-center justify-center',
          fullWidth
            ? 'min-w-0 text-[13px] md:text-sm'
            : compact
              ? 'h-[1.3rem] w-[1.3rem] text-[11px]'
              : 'w-8 h-8 text-sm',
          'font-medium leading-none select-none',
          'border-b border-r',
          isRowStart && 'border-l',
          row === 0 && 'border-t',
          isFifthCol && 'border-r',
          isTenthRow && 'border-b',
          isCursor && 'bg-primary/5 z-10'
        )}
        style={
          paperTone
            ? {
                background: KT.bg,
                borderColor: KT.line2,
                height: fullWidth ? '2.15rem' : undefined,
              }
            : {
                borderColor: 'rgba(31,27,23,0.22)',
                height: fullWidth ? '2.15rem' : undefined,
              }
        }
      >
        {isCursor && (
          <div className="absolute left-1 top-1.5 bottom-1.5 w-[2px] bg-primary animate-pulse" />
        )}
        {char !== null ? (
          <span style={paperTone ? { color: KT.ink } : undefined}>{char}</span>
        ) : null}
      </div>
    );
  }
);
Cell.displayName = 'WongojiCell';

// ─── main component ───────────────────────────────────────────────────────────

export const WongojiEditor = React.forwardRef<HTMLTextAreaElement, WongojiEditorProps>(
  (
    {
      value,
      onChange,
      maxLength = 700,
      className,
      readOnly = false,
      surfaceTone = 'default',
      fullWidth = false,
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (forwardedRef as React.RefObject<HTMLTextAreaElement>) ?? internalRef;
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const isPaperTone = surfaceTone === 'paper';

    // Track cursor position so we can highlight the active cell.
    const [cursorPos, setCursorPos] = React.useState<number>(value.length);

    // Keep cursor position in sync after every render.
    const updateCursor = useCallback(() => {
      const ta = textareaRef.current;
      if (ta) setCursorPos(ta.selectionStart ?? 0);
    }, [textareaRef]);

    // ── event handlers ──────────────────────────────────────────────────────────

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value;
        if (next.length <= maxLength) {
          onChange(next);
        } else {
          // Hard-cap: truncate and keep cursor at maxLength
          onChange(next.slice(0, maxLength));
        }
        updateCursor();
      },
      [onChange, maxLength, updateCursor]
    );

    const handleKeyUp = useCallback(() => updateCursor(), [updateCursor]);
    const handleClick = useCallback(() => updateCursor(), [updateCursor]);
    const handleSelect = useCallback(() => updateCursor(), [updateCursor]);

    // Sync cursor after value changes from outside
    useEffect(() => {
      setCursorPos(value.length);
    }, [value]);

    // ── build grid data ─────────────────────────────────────────────────────────

    const totalRows = Math.ceil(maxLength / COLS);
    const totalCells = totalRows * COLS;

    // Map logical string index → visual cell index (skipping over \n padding).
    // We also need the visual cell index of the cursor.
    const cells = buildCells(value, totalCells);

    // Determine visual cursor cell: walk value up to cursorPos
    const visualCursorIndex = (() => {
      let visual = 0;
      for (let i = 0; i < Math.min(cursorPos, value.length); i++) {
        if (value[i] === '\n') {
          // skip to next row boundary
          const col = visual % COLS;
          if (col !== 0) visual += COLS - col;
          // ensure we consume at least one extra row-worth if already aligned
          visual += COLS;
        } else {
          visual++;
        }
      }
      return visual;
    })();

    // ── stats ───────────────────────────────────────────────────────────────────

    const charCount = value.replace(/\n/g, '').length;
    const percentage = Math.round((charCount / maxLength) * 100);
    const remaining = maxLength - charCount;
    const cellRem = isMobile ? 1.3 : isPaperTone ? 1.62 : 1.8;
    const fullWidthCellRem = 2.15;
    const visualRow = Math.floor(visualCursorIndex / COLS) + 1;
    const visualColumn = (visualCursorIndex % COLS) + 1;
    const charsUnit = t('topikWriting.session.charsUnit', { defaultValue: 'chars' });

    return (
      <div className={cn('flex h-full min-h-0 flex-col gap-2', className)}>
        {/* ── Header stats ── */}
        <div
          className={cn(
            'px-1 text-[11px] font-medium',
            isMobile ? 'space-y-3' : 'flex items-center justify-between'
          )}
          style={isPaperTone ? { color: KT.sub } : undefined}
        >
          <div className="flex items-center justify-between gap-3">
            <span>
              <span
                className={cn('font-black', charCount > maxLength * 0.95 ? 'text-destructive' : '')}
                style={
                  charCount <= maxLength * 0.95
                    ? { color: isPaperTone ? KT.ink : KT.ink }
                    : undefined
                }
              >
                {charCount}
              </span>
              {' / '}
              {maxLength} {charsUnit}
            </span>
            <span
              className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]"
              style={
                isPaperTone
                  ? {
                      borderColor: KT.line2,
                      background: KT.card,
                      color: KT.sub,
                    }
                  : {
                      borderColor: KT.line2,
                      background: KT.card,
                      color: KT.sub,
                    }
              }
            >
              {t('wongojiEditor.lineStatus', {
                defaultValue: 'Row {{row}} · Col {{column}}',
                row: visualRow,
                column: visualColumn,
              })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn('h-1.5 overflow-hidden rounded-full', isMobile ? 'flex-1' : 'w-32')}
              style={{ background: KT.line }}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  percentage >= 95 ? 'bg-destructive' : percentage >= 70 ? 'bg-amber-500' : ''
                )}
                style={{
                  width: `${Math.min(100, percentage)}%`,
                  backgroundColor: percentage < 70 ? KT.mintDeep : undefined,
                }}
              />
            </div>
            <span className="shrink-0">
              {t('topikWriting.session.remainingChars', {
                count: remaining,
                defaultValue: `{{count}} left`,
              })}
            </span>
          </div>
        </div>

        {/* ── Paper + transparent textarea (layered) ── */}
        <div
          className={cn(
            isPaperTone ? '' : 'bg-background',
            isMobile
              ? 'rounded-3xl border border-border/80 px-3 py-3'
              : 'min-h-0 flex-1 rounded-[22px] border border-border px-2.5 py-2.5'
          )}
          style={
            isPaperTone
              ? {
                  background: KT.bg,
                  borderColor: KT.line2,
                }
              : {
                  background: KT.bg,
                  borderColor: KT.line2,
                }
          }
        >
          <div
            className={cn(
              'relative overflow-auto',
              isPaperTone ? '' : 'bg-background',
              isMobile
                ? 'rounded-2xl border border-border shadow-inner'
                : 'h-full min-h-0 rounded-[18px] border-2 border-border shadow-inner'
            )}
            style={
              isPaperTone
                ? {
                    background: KT.bg,
                    borderColor: KT.line2,
                  }
                : {
                    background: KT.bg,
                    borderColor: KT.line2,
                  }
            }
          >
            {/* Visual grid — pointer-events-none so all input reaches the textarea */}
            <div
              className="pointer-events-none"
              style={{
                display: 'grid',
                gridTemplateColumns: fullWidth
                  ? `repeat(${COLS}, minmax(0, 1fr))`
                  : `repeat(${COLS}, ${cellRem}rem)`,
                width: fullWidth ? '100%' : `${COLS * cellRem}rem`,
              }}
              aria-hidden
            >
              {cells.map((char, idx) => {
                const col = idx % COLS;
                const row = Math.floor(idx / COLS);
                return (
                  <Cell
                    key={idx}
                    char={char}
                    isCursor={!readOnly && idx === visualCursorIndex}
                    col={col}
                    row={row}
                    compact={isMobile}
                    paperTone={isPaperTone}
                    fullWidth={fullWidth}
                  />
                );
              })}
            </div>

            {/* Invisible textarea — sits on top, captures all input */}
            {!readOnly && (
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyUp={handleKeyUp}
                onClick={handleClick}
                onSelect={handleSelect}
                onCompositionUpdate={updateCursor}
                onCompositionEnd={updateCursor}
                maxLength={maxLength + 10} // allow slight overage; we truncate in handler
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                aria-label={t('topikWriting.session.answerArea', { defaultValue: 'Answer Area' })}
                className={cn(
                  'absolute inset-0 w-full h-full resize-none',
                  'opacity-0 cursor-text',
                  // Ensure caret is still visible in some browsers when opacity 0 trick fails
                  'caret-transparent',
                  'bg-transparent border-0 outline-none',
                  'text-transparent selection:bg-primary/20',
                  'focus:outline-none focus:ring-0'
                )}
                style={{
                  // Match grid dimensions so scrolling stays in sync
                  minHeight: `${totalRows * (fullWidth ? fullWidthCellRem : cellRem)}rem`,
                  fontFamily: 'monospace',
                }}
              />
            )}
          </div>
        </div>

        {/* ── Row / line info ── */}
        <div
          className="flex items-center gap-3 px-1 text-[10px] text-muted-foreground"
          style={isPaperTone ? { color: KT.sub } : undefined}
        >
          <span>
            {t('wongojiEditor.row', { defaultValue: 'Row' })} {visualRow} / {totalRows}
          </span>
          <span>
            {t('wongojiEditor.column', { defaultValue: 'Column' })} {visualColumn}
          </span>
          <span className="ml-auto opacity-60">
            {isMobile
              ? t('wongojiEditor.mobileHint', {
                  defaultValue: 'Scroll sideways if needed',
                })
              : t('wongojiEditor.perLine', {
                  defaultValue: '{{count}} chars per line · Wongoji',
                  count: COLS,
                })}
          </span>
        </div>
      </div>
    );
  }
);

WongojiEditor.displayName = 'WongojiEditor';

export default WongojiEditor;
