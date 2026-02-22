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

const COLS = 20; // fixed columns per row

export interface WongojiEditorProps {
    value: string;
    onChange: (value: string) => void;
    /** Maximum characters allowed. Default 700 (Q54). Use 300 for Q53. */
    maxLength?: number;
    className?: string;
    readOnly?: boolean;
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
    index: number;
    /** Whether this cell is at the cursor position */
    isCursor: boolean;
    /** 0-indexed column */
    col: number;
    /** 0-indexed row */
    row: number;
}

const Cell = React.memo(({ char, isCursor, col, row }: CellProps) => {
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
                'w-8 h-8 text-sm font-medium leading-none select-none',
                // Base borders – black/white styling (dark gray in light mode, white in dark mode)
                'border-b border-r border-neutral-400 dark:border-white/20',
                isRowStart && 'border-l border-neutral-400 dark:border-white/20',
                row === 0 && 'border-t border-neutral-400 dark:border-white/20',
                // Keep the same opacity for the "thick" borders to make it uniform but slightly thicker if needed, or just uniform.
                // The user complained it looks uneven, so let's use the exactly same color/opacity
                isFifthCol && 'border-r border-neutral-400 dark:border-white/20',
                isTenthRow && 'border-b border-neutral-400 dark:border-white/20',
                // Cursor cell background highlight
                isCursor && 'bg-primary/5 z-10',
            )}
        >
            {isCursor && (
                <div className="absolute left-1 top-1.5 bottom-1.5 w-[2px] bg-primary animate-pulse" />
            )}
            {char !== null ? (
                <span className="text-foreground">{char}</span>
            ) : null}
        </div>
    );
});
Cell.displayName = 'WongojiCell';

// ─── main component ───────────────────────────────────────────────────────────

export const WongojiEditor = React.forwardRef<
    HTMLTextAreaElement,
    WongojiEditorProps
>(({ value, onChange, maxLength = 700, className, readOnly = false }, forwardedRef) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (forwardedRef as React.RefObject<HTMLTextAreaElement>) ?? internalRef;
    const { t } = useTranslation();

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
        [onChange, maxLength, updateCursor],
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

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            {/* ── Header stats ── */}
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
                <span>
                    <span className={cn('font-black', charCount > maxLength * 0.95 ? 'text-destructive' : 'text-foreground')}>
                        {charCount}
                    </span>
                    {' / '}
                    {maxLength} {t('topikWriting.session.characterCount', { count: '', defaultValue: 'chars' }).trim()}
                </span>
                <div className="flex items-center gap-3">
                    <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all duration-300',
                                percentage >= 95 ? 'bg-destructive' : percentage >= 70 ? 'bg-amber-500' : 'bg-primary',
                            )}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                    </div>
                    <span>
                        {t('topikWriting.session.remainingChars', { count: remaining, defaultValue: `{{count}} left` })}
                    </span>
                </div>
            </div>

            {/* ── Paper + transparent textarea (layered) ── */}
            <div className="flex justify-center border-y border-border py-4 bg-background">
                <div className="relative overflow-auto rounded-lg border-2 border-border shadow-inner bg-background">
                    {/* Visual grid — pointer-events-none so all input reaches the textarea */}
                    <div
                        className="pointer-events-none"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${COLS}, 2rem)`,
                            width: `${COLS * 2}rem`,
                        }}
                        aria-hidden
                    >
                        {cells.map((char, idx) => {
                            const col = idx % COLS;
                            const row = Math.floor(idx / COLS);
                            return (
                                <Cell
                                    key={idx}
                                    index={idx}
                                    char={char}
                                    isCursor={!readOnly && idx === visualCursorIndex}
                                    col={col}
                                    row={row}
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
                            aria-label="원고지 입력"
                            className={cn(
                                'absolute inset-0 w-full h-full resize-none',
                                'opacity-0 cursor-text',
                                // Ensure caret is still visible in some browsers when opacity 0 trick fails
                                'caret-transparent',
                                'bg-transparent border-0 outline-none',
                                'text-transparent selection:bg-primary/20',
                                'focus:outline-none focus:ring-0',
                            )}
                            style={{
                                // Match grid dimensions so scrolling stays in sync
                                minHeight: `${totalRows * 2}rem`,
                                fontFamily: 'monospace',
                            }}
                        />
                    )}
                </div>
            </div>

            {/* ── Row / line info ── */}
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground px-1">
                <span>
                    {t('wongojiEditor.row', { defaultValue: 'Row' })}{' '}
                    {Math.ceil(visualCursorIndex / COLS)} / {totalRows}
                </span>
                <span>
                    {t('wongojiEditor.column', { defaultValue: 'Column' })}{' '}
                    {(visualCursorIndex % COLS) + 1}
                </span>
                <span className="ml-auto opacity-60">
                    {t('wongojiEditor.perLine', {
                        defaultValue: '{{count}} chars per line · Wongoji',
                        count: COLS,
                    })}
                </span>
            </div>
        </div>
    );
});

WongojiEditor.displayName = 'WongojiEditor';

export default WongojiEditor;
