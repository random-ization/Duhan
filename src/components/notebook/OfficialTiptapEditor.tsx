import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useTranslation } from 'react-i18next';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import {
  Bold,
  CheckSquare,
  ChevronDown,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreHorizontal,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Undo2,
  Underline as UnderlineIcon,
} from 'lucide-react';

const EMPTY_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type SlashState = {
  query: string;
  from: number;
  to: number;
  left: number;
  top: number;
};

type SlashCommand = {
  id: string;
  label: string;
  hint: string;
  keywords: string[];
  run: (editor: NonNullable<ReturnType<typeof useEditor>>) => void;
};

type ColorOption = {
  label: string;
  value: string | null;
};

type ColorTokenDef = {
  key: string;
  value: string | null;
};

const TEXT_COLOR_TOKENS: ColorTokenDef[] = [
  { key: 'default', value: null },
  { key: 'gray', value: '#6b7280' },
  { key: 'brown', value: '#b7791f' },
  { key: 'orange', value: '#dd6b20' },
  { key: 'yellow', value: '#ca8a04' },
  { key: 'green', value: '#15803d' },
  { key: 'blue', value: '#0369a1' },
  { key: 'purple', value: '#7e22ce' },
  { key: 'pink', value: '#be185d' },
  { key: 'red', value: '#dc2626' },
];

const HIGHLIGHT_COLOR_TOKENS: ColorTokenDef[] = [
  { key: 'default', value: null },
  { key: 'grayBg', value: '#e5e7eb' },
  { key: 'brownBg', value: '#f3e8d5' },
  { key: 'orangeBg', value: '#ffedd5' },
  { key: 'yellowBg', value: '#fef3c7' },
  { key: 'greenBg', value: '#dcfce7' },
  { key: 'blueBg', value: '#dbeafe' },
  { key: 'purpleBg', value: '#ede9fe' },
  { key: 'pinkBg', value: '#fce7f3' },
  { key: 'redBg', value: '#fee2e2' },
];

const ToolButton: React.FC<{
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, label, onClick, children }) => (
  <button
    type="button"
    title={label}
    onMouseDown={event => {
      event.preventDefault();
      onClick();
    }}
    className={`inline-flex h-8 items-center justify-center rounded-md px-2 text-muted-foreground transition ${
      active ? 'bg-muted text-foreground' : 'hover:bg-muted/70 hover:text-foreground'
    }`}
  >
    {children}
  </button>
);

const getSlashMatch = (
  editor: NonNullable<ReturnType<typeof useEditor>>,
  container: HTMLDivElement | null
): SlashState | null => {
  const { $from } = editor.state.selection;
  const text = $from.parent.textContent || '';
  const cursor = $from.parentOffset;
  const beforeCursor = text.slice(0, cursor);
  const match = beforeCursor.match(/\/(\w*)$/);
  if (!match) return null;

  const query = match[1] || '';
  const from = $from.start() + cursor - query.length - 1;
  const to = $from.start() + cursor;

  const coords = editor.view.coordsAtPos(to);
  const box = container?.getBoundingClientRect();

  return {
    query,
    from,
    to,
    left: box ? coords.left - box.left : 16,
    top: box ? coords.bottom - box.top + 6 : 36,
  };
};

const toRecentColors = (current: string[], next: string | null) => {
  if (!next) return current;
  return [next, ...current.filter(item => item !== next)].slice(0, 5);
};

const ColorToken: React.FC<{
  type: 'text' | 'highlight';
  color: string | null;
  active: boolean;
  onSelect: () => void;
  label: string;
}> = ({ type, color, active, onSelect, label }) => {
  if (type === 'text') {
    return (
      <button
        type="button"
        title={label}
        onMouseDown={event => {
          event.preventDefault();
          onSelect();
        }}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
          active ? 'border-foreground' : 'border-border hover:border-foreground/40'
        }`}
      >
        <span style={{ color: color || '#4b5563' }} className="text-base font-medium leading-none">
          A
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      title={label}
      onMouseDown={event => {
        event.preventDefault();
        onSelect();
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
        active ? 'border-foreground' : 'border-border hover:border-foreground/40'
      }`}
    >
      <span
        className="h-[22px] w-[22px] rounded-full border"
        style={{
          backgroundColor: color || 'transparent',
          borderColor: color ? color : '#d1d5db',
        }}
      />
    </button>
  );
};

export interface OfficialTiptapEditorProps {
  value: JSONContent;
  placeholder?: string;
  onChange: (doc: JSONContent) => void;
  preset?: 'full' | 'study';
}

export const OfficialTiptapEditor: React.FC<OfficialTiptapEditorProps> = ({
  value,
  onChange,
  placeholder,
  preset = 'full',
}) => {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const toolbarColorRef = useRef<HTMLDivElement | null>(null);
  const bubbleColorRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const [slashState, setSlashState] = useState<SlashState | null>(null);
  const [toolbarColorOpen, setToolbarColorOpen] = useState(false);
  const [bubbleColorOpen, setBubbleColorOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [recentTextColors, setRecentTextColors] = useState<string[]>([]);
  const [recentHighlightColors, setRecentHighlightColors] = useState<string[]>([]);

  const textColors = useMemo<ColorOption[]>(
    () =>
      TEXT_COLOR_TOKENS.map(item => ({
        value: item.value,
        label: t(`notes.v2.editor.colors.text.${item.key}`, { defaultValue: item.key }),
      })),
    [t]
  );
  const highlightColors = useMemo<ColorOption[]>(
    () =>
      HIGHLIGHT_COLOR_TOKENS.map(item => ({
        value: item.value,
        label: t(`notes.v2.editor.colors.highlight.${item.key}`, { defaultValue: item.key }),
      })),
    [t]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder:
          placeholder ||
          t('notes.v2.editor.commandPlaceholder', { defaultValue: 'Type / for commands' }),
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value || EMPTY_DOC,
    editorProps: {
      attributes: {
        class:
          'notion-editor-content min-h-[460px] px-14 py-10 text-[15px] text-foreground focus:outline-none',
      },
    },
    onUpdate: ({ editor: nextEditor }: any) => {
      onChange(nextEditor.getJSON());
      const match = getSlashMatch(
        nextEditor as NonNullable<ReturnType<typeof useEditor>>,
        wrapperRef.current
      );
      setSlashState(match);
    },
    onSelectionUpdate: ({ editor: nextEditor }: any) => {
      const match = getSlashMatch(
        nextEditor as NonNullable<ReturnType<typeof useEditor>>,
        wrapperRef.current
      );
      setSlashState(match);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = value || EMPTY_DOC;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(incoming)) {
      editor.commands.setContent(incoming, false);
    }
  }, [editor, value]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const node = event.target as Node;
      if (toolbarColorRef.current && !toolbarColorRef.current.contains(node)) {
        setToolbarColorOpen(false);
      }
      if (bubbleColorRef.current && !bubbleColorRef.current.contains(node)) {
        setBubbleColorOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  const slashCommands = useMemo<SlashCommand[]>(
    () => [
      {
        id: 'paragraph',
        label: t('notes.v2.editor.slash.text.label', { defaultValue: 'Text' }),
        hint: t('notes.v2.editor.slash.text.hint', { defaultValue: 'Plain paragraph text' }),
        keywords: ['text', 'paragraph'],
        run: current => current.chain().focus().setParagraph().run(),
      },
      {
        id: 'h1',
        label: t('notes.v2.editor.slash.h1.label', { defaultValue: 'Heading 1' }),
        hint: t('notes.v2.editor.slash.h1.hint', { defaultValue: 'Large section title' }),
        keywords: ['h1', 'heading', 'title'],
        run: current => current.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: 'h2',
        label: t('notes.v2.editor.slash.h2.label', { defaultValue: 'Heading 2' }),
        hint: t('notes.v2.editor.slash.h2.hint', { defaultValue: 'Medium section heading' }),
        keywords: ['h2', 'heading', 'subtitle'],
        run: current => current.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: 'bullet',
        label: t('notes.v2.editor.slash.bullet.label', { defaultValue: 'Bullet List' }),
        hint: t('notes.v2.editor.slash.bullet.hint', { defaultValue: 'Simple bullet points' }),
        keywords: ['list', 'bullet', 'ul'],
        run: current => current.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'ordered',
        label: t('notes.v2.editor.slash.ordered.label', { defaultValue: 'Numbered List' }),
        hint: t('notes.v2.editor.slash.ordered.hint', { defaultValue: 'Ordered items' }),
        keywords: ['number', 'ordered', 'ol'],
        run: current => current.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'todo',
        label: t('notes.v2.editor.slash.todo.label', { defaultValue: 'To-do List' }),
        hint: t('notes.v2.editor.slash.todo.hint', {
          defaultValue: 'Track tasks with checkboxes',
        }),
        keywords: ['task', 'todo', 'checkbox'],
        run: current => current.chain().focus().toggleTaskList().run(),
      },
      {
        id: 'quote',
        label: t('notes.v2.editor.slash.quote.label', { defaultValue: 'Quote' }),
        hint: t('notes.v2.editor.slash.quote.hint', {
          defaultValue: 'Emphasized quotation block',
        }),
        keywords: ['quote', 'blockquote'],
        run: current => current.chain().focus().toggleBlockquote().run(),
      },
      {
        id: 'code',
        label: t('notes.v2.editor.slash.code.label', { defaultValue: 'Code Block' }),
        hint: t('notes.v2.editor.slash.code.hint', { defaultValue: 'Formatted code snippet' }),
        keywords: ['code', 'snippet'],
        run: current => current.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: 'divider',
        label: t('notes.v2.editor.slash.divider.label', { defaultValue: 'Divider' }),
        hint: t('notes.v2.editor.slash.divider.hint', {
          defaultValue: 'Horizontal separator line',
        }),
        keywords: ['divider', 'line', 'hr'],
        run: current => current.chain().focus().setHorizontalRule().run(),
      },
      {
        id: 'table',
        label: t('notes.v2.editor.slash.table.label', { defaultValue: 'Table' }),
        hint: t('notes.v2.editor.slash.table.hint', { defaultValue: 'Insert a 3x3 table' }),
        keywords: ['table', 'grid'],
        run: current =>
          current.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
    ],
    [t]
  );

  const visibleSlashCommands = useMemo(() => {
    const query = slashState?.query?.toLowerCase() || '';
    if (!query) return slashCommands;
    return slashCommands.filter(item => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.hint.toLowerCase().includes(query) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    });
  }, [slashCommands, slashState?.query]);

  const recentColors = useMemo(() => {
    const merged = [
      ...recentTextColors,
      ...recentHighlightColors.filter(c => !recentTextColors.includes(c)),
    ];
    return merged.slice(0, 6);
  }, [recentTextColors, recentHighlightColors]);

  const runSlash = (command: SlashCommand) => {
    if (!editor || !slashState) return;
    editor.chain().focus().deleteRange({ from: slashState.from, to: slashState.to }).run();
    command.run(editor);
    setSlashState(null);
  };

  const toggleLink = () => {
    if (!editor) return;
    const currentHref = editor.getAttributes('link').href as string | null;
    const nextHref = globalThis.window.prompt(
      t('notes.v2.editor.linkPrompt', { defaultValue: 'Paste link URL' }),
      currentHref || 'https://'
    );
    if (nextHref === null) return;
    const normalizedHref = nextHref.trim();
    if (!normalizedHref) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: normalizedHref }).run();
  };

  const setTextColor = (color: string | null) => {
    if (!editor) return;
    editor.chain().focus();
    if (color) {
      editor.chain().focus().setColor(color).run();
      setRecentTextColors(prev => toRecentColors(prev, color));
    } else {
      editor.chain().focus().unsetColor().run();
    }
    setToolbarColorOpen(false);
    setBubbleColorOpen(false);
  };

  const setHighlightColor = (color: string | null) => {
    if (!editor) return;
    if (color) {
      editor.chain().focus().setHighlight({ color }).run();
      setRecentHighlightColors(prev => toRecentColors(prev, color));
    } else {
      editor.chain().focus().unsetHighlight().run();
    }
    setToolbarColorOpen(false);
    setBubbleColorOpen(false);
  };

  const activeTextColor = (editor?.getAttributes('textStyle').color as string | undefined) || null;
  const activeHighlightColor =
    (editor?.getAttributes('highlight').color as string | undefined) || null;
  const isStudyPreset = preset === 'study';

  const insertLearningTemplate = (kind: 'grammar' | 'mistake' | 'example') => {
    if (!editor) return;
    if (kind === 'grammar') {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: t('notes.v2.editor.study.grammarPoint', { defaultValue: 'Grammar Point:' }),
            },
          ],
        })
        .run();
      return;
    }
    if (kind === 'mistake') {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: t('notes.v2.editor.study.commonMistake', {
                        defaultValue: 'Common Mistake:',
                      }),
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: t('notes.v2.editor.study.correctExpression', {
                        defaultValue: 'Correct Expression:',
                      }),
                    },
                  ],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: t('notes.v2.editor.study.reason', { defaultValue: 'Reason:' }),
                    },
                  ],
                },
              ],
            },
          ],
        })
        .run();
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: t('notes.v2.editor.study.exampleSentence', {
                defaultValue: 'Example Sentence:',
              }),
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: t('notes.v2.editor.study.translation', { defaultValue: 'Translation:' }),
            },
          ],
        },
      ])
      .run();
  };

  const applyCloze = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, ' ').trim();
    if (selected) {
      editor
        .chain()
        .focus()
        .insertContent(
          t('notes.v2.editor.study.clozeFormat', {
            text: selected,
            defaultValue: '____ ({{text}})',
          })
        )
        .run();
      return;
    }
    editor.chain().focus().insertContent('____').run();
  };

  const renderColorPanel = () => (
    <div className="w-[270px] rounded-2xl border border-border bg-card p-3 shadow-2xl">
      <div>
        <p className="text-sm font-semibold text-foreground">
          {t('notes.v2.editor.colors.recent', { defaultValue: 'Recently Used' })}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recentColors.length === 0 ? (
            <span className="inline-flex h-8 w-8 rounded-full border border-border" />
          ) : (
            recentColors.map(color => (
              <button
                key={color}
                type="button"
                onMouseDown={event => {
                  event.preventDefault();
                  setTextColor(color);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border hover:border-foreground/40"
                title={color}
              >
                <span
                  className="h-[22px] w-[22px] rounded-full"
                  style={{ backgroundColor: color }}
                />
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mt-3.5">
        <p className="text-sm font-semibold text-foreground">
          {t('notes.v2.editor.colors.textTitle', { defaultValue: 'Text Color' })}
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {textColors.map(item => (
            <ColorToken
              key={item.label}
              type="text"
              color={item.value}
              active={activeTextColor === item.value}
              label={item.label}
              onSelect={() => setTextColor(item.value)}
            />
          ))}
        </div>
      </div>

      <div className="mt-3.5">
        <p className="text-sm font-semibold text-foreground">
          {t('notes.v2.editor.colors.highlightTitle', { defaultValue: 'Highlight Color' })}
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {highlightColors.map(item => (
            <ColorToken
              key={item.label}
              type="highlight"
              color={item.value}
              active={activeHighlightColor === item.value}
              label={item.label}
              onSelect={() => setHighlightColor(item.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (!editor) {
    return (
      <div className="rounded-xl border border-border bg-muted p-4 text-sm">
        {t('notes.v2.editor.loading', { defaultValue: 'Loading editor...' })}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="notion-editor-shell relative rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="sticky top-0 z-20 border-b border-border/80 bg-card/85 px-3 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-1">
          <ToolButton
            label={t('notes.v2.editor.actions.bulletList', { defaultValue: 'Bullet List' })}
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            label={t('notes.v2.editor.actions.numberedList', { defaultValue: 'Numbered List' })}
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            label={t('notes.v2.editor.actions.taskList', { defaultValue: 'Task List' })}
            active={editor.isActive('taskList')}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <CheckSquare className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            label={t('notes.v2.editor.actions.quote', { defaultValue: 'Quote' })}
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </ToolButton>

          <span className="mx-1 h-5 w-px bg-border" />

          <ToolButton
            label={t('notes.v2.editor.actions.bold', { defaultValue: 'Bold' })}
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolButton>
          {!isStudyPreset ? (
            <ToolButton
              label={t('notes.v2.editor.actions.italic', { defaultValue: 'Italic' })}
              active={editor.isActive('italic')}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </ToolButton>
          ) : null}
          <ToolButton
            label={t('notes.v2.editor.actions.underline', { defaultValue: 'Underline' })}
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            label={t('notes.v2.editor.actions.strike', { defaultValue: 'Strike' })}
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            label={t('notes.v2.editor.actions.link', { defaultValue: 'Link' })}
            active={editor.isActive('link')}
            onClick={toggleLink}
          >
            <Link2 className="h-4 w-4" />
          </ToolButton>

          <div ref={toolbarColorRef} className="relative">
            <button
              type="button"
              title={t('notes.v2.editor.actions.textAndHighlightColors', {
                defaultValue: 'Text and Highlight colors',
              })}
              onMouseDown={event => {
                event.preventDefault();
                setBubbleColorOpen(false);
                setToolbarColorOpen(prev => !prev);
              }}
              className={`inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-muted-foreground transition ${
                activeTextColor || activeHighlightColor
                  ? 'bg-muted text-foreground'
                  : 'hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              <span
                style={{ color: activeTextColor || undefined }}
                className="text-lg font-medium leading-none"
              >
                A
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {toolbarColorOpen ? (
              <div className="absolute right-0 top-10 z-30">{renderColorPanel()}</div>
            ) : null}
          </div>

          {isStudyPreset ? (
            <>
              <span className="mx-1 h-5 w-px bg-border" />
              <ToolButton
                label={t('notes.v2.editor.study.keyWord', { defaultValue: 'Key Word' })}
                active={editor.isActive('underline') && editor.isActive('highlight')}
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .toggleUnderline()
                    .toggleHighlight({
                      color: 'var(--editor-highlight-yellow, hsl(var(--accent)))',
                    })
                    .run()
                }
              >
                <span className="text-xs font-semibold">
                  {t('notes.v2.editor.study.keyWord', { defaultValue: 'Key Word' })}
                </span>
              </ToolButton>
              <ToolButton
                label={t('notes.v2.editor.study.grammarTemplate', {
                  defaultValue: 'Grammar Template',
                })}
                active={false}
                onClick={() => insertLearningTemplate('grammar')}
              >
                <span className="text-xs font-semibold">
                  {t('notes.v2.editor.study.grammarPointShort', { defaultValue: 'Grammar' })}
                </span>
              </ToolButton>
              <ToolButton
                label={t('notes.v2.editor.study.mistakeTemplate', {
                  defaultValue: 'Mistake Template',
                })}
                active={false}
                onClick={() => insertLearningTemplate('mistake')}
              >
                <span className="text-xs font-semibold">
                  {t('notes.v2.editor.study.mistakeShort', { defaultValue: 'Mistake' })}
                </span>
              </ToolButton>
              <ToolButton
                label={t('notes.v2.editor.study.exampleTemplate', {
                  defaultValue: 'Example Template',
                })}
                active={false}
                onClick={() => insertLearningTemplate('example')}
              >
                <span className="text-xs font-semibold">
                  {t('notes.v2.editor.study.exampleShort', { defaultValue: 'Example' })}
                </span>
              </ToolButton>
              <ToolButton
                label={t('notes.v2.editor.study.clozeTemplate', {
                  defaultValue: 'Cloze Template',
                })}
                active={false}
                onClick={applyCloze}
              >
                <span className="text-xs font-semibold">
                  {t('notes.v2.editor.study.clozeShort', { defaultValue: 'Cloze' })}
                </span>
              </ToolButton>
            </>
          ) : null}

          <span className="mx-1 h-5 w-px bg-border" />

          <div ref={moreMenuRef} className="relative">
            <ToolButton
              label={t('notes.v2.editor.actions.moreTools', { defaultValue: 'More tools' })}
              active={moreMenuOpen}
              onClick={() => setMoreMenuOpen(prev => !prev)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </ToolButton>
            {moreMenuOpen ? (
              <div className="absolute left-0 top-10 z-30 w-52 rounded-xl border border-border bg-card p-1.5 shadow-xl">
                <button
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Heading1 className="h-4 w-4" />{' '}
                  {t('notes.v2.editor.actions.h1', { defaultValue: 'Heading 1' })}
                </button>
                <button
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Heading2 className="h-4 w-4" />{' '}
                  {t('notes.v2.editor.actions.h2', { defaultValue: 'Heading 2' })}
                </button>
                <button
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Heading3 className="h-4 w-4" />{' '}
                  {t('notes.v2.editor.actions.h3', { defaultValue: 'Heading 3' })}
                </button>
                <button
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    editor.chain().focus().toggleCodeBlock().run();
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Code2 className="h-4 w-4" />{' '}
                  {t('notes.v2.editor.actions.codeBlock', { defaultValue: 'Code Block' })}
                </button>
                <button
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                      .run();
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Table2 className="h-4 w-4" />{' '}
                  {t('notes.v2.editor.actions.table', { defaultValue: 'Table' })}
                </button>
                <button
                  type="button"
                  onMouseDown={event => {
                    event.preventDefault();
                    editor.chain().focus().setHorizontalRule().run();
                    setMoreMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Minus className="h-4 w-4" />{' '}
                  {t('notes.v2.editor.actions.divider', { defaultValue: 'Divider' })}
                </button>
              </div>
            ) : null}
          </div>

          <span className="mx-1 h-5 w-px bg-border" />

          <ToolButton
            label={t('notes.v2.editor.actions.undo', { defaultValue: 'Undo' })}
            active={false}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            label={t('notes.v2.editor.actions.redo', { defaultValue: 'Redo' })}
            active={false}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolButton>
        </div>
      </div>

      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="flex items-center gap-0.5 rounded-2xl border border-border bg-card/95 p-1.5 text-foreground shadow-xl">
          <ToolButton
            label={t('notes.v2.editor.actions.bold', { defaultValue: 'Bold' })}
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            label={t('notes.v2.editor.actions.italic', { defaultValue: 'Italic' })}
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            label={t('notes.v2.editor.actions.underline', { defaultValue: 'Underline' })}
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            label={t('notes.v2.editor.actions.strike', { defaultValue: 'Strike' })}
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="h-4 w-4" />
          </ToolButton>

          <div ref={bubbleColorRef} className="relative">
            <button
              type="button"
              title={t('notes.v2.editor.actions.textAndHighlightColors', {
                defaultValue: 'Text and Highlight colors',
              })}
              onMouseDown={event => {
                event.preventDefault();
                setToolbarColorOpen(false);
                setBubbleColorOpen(prev => !prev);
              }}
              className={`inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-muted-foreground transition ${
                activeTextColor || activeHighlightColor
                  ? 'bg-muted text-foreground'
                  : 'hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              <span
                style={{ color: activeTextColor || undefined }}
                className="text-lg font-medium leading-none"
              >
                A
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {bubbleColorOpen ? (
              <div className="absolute right-0 top-10 z-30">{renderColorPanel()}</div>
            ) : null}
          </div>
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} />

      {slashState && visibleSlashCommands.length > 0 && (
        <div
          className="absolute z-30 w-72 rounded-xl border border-border bg-card p-2 shadow-2xl"
          style={{ left: `${slashState.left}px`, top: `${slashState.top}px` }}
        >
          <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('notes.v2.editor.slash.title', { defaultValue: 'Slash Commands' })}
          </p>
          <div className="space-y-1">
            {visibleSlashCommands.slice(0, 8).map(item => (
              <button
                key={item.id}
                type="button"
                onMouseDown={event => {
                  event.preventDefault();
                  runSlash(item);
                }}
                className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-muted"
              >
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficialTiptapEditor;
