import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
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

const TEXT_COLORS: ColorOption[] = [
  { label: 'Default', value: null },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Brown', value: '#b7791f' },
  { label: 'Orange', value: '#dd6b20' },
  { label: 'Yellow', value: '#ca8a04' },
  { label: 'Green', value: '#15803d' },
  { label: 'Blue', value: '#0369a1' },
  { label: 'Purple', value: '#7e22ce' },
  { label: 'Pink', value: '#be185d' },
  { label: 'Red', value: '#dc2626' },
];

const HIGHLIGHT_COLORS: ColorOption[] = [
  { label: 'Default', value: null },
  { label: 'Gray BG', value: '#e5e7eb' },
  { label: 'Brown BG', value: '#f3e8d5' },
  { label: 'Orange BG', value: '#ffedd5' },
  { label: 'Yellow BG', value: '#fef3c7' },
  { label: 'Green BG', value: '#dcfce7' },
  { label: 'Blue BG', value: '#dbeafe' },
  { label: 'Purple BG', value: '#ede9fe' },
  { label: 'Pink BG', value: '#fce7f3' },
  { label: 'Red BG', value: '#fee2e2' },
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

const askForLink = (currentHref: string | null): string | null => {
  const next = globalThis.window.prompt('Paste link URL', currentHref || 'https://');
  if (next === null) return null;
  const normalized = next.trim();
  if (!normalized) return '';
  return normalized;
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
}

export const OfficialTiptapEditor: React.FC<OfficialTiptapEditorProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const toolbarColorRef = useRef<HTMLDivElement | null>(null);
  const bubbleColorRef = useRef<HTMLDivElement | null>(null);

  const [slashState, setSlashState] = useState<SlashState | null>(null);
  const [toolbarColorOpen, setToolbarColorOpen] = useState(false);
  const [bubbleColorOpen, setBubbleColorOpen] = useState(false);
  const [recentTextColors, setRecentTextColors] = useState<string[]>([]);
  const [recentHighlightColors, setRecentHighlightColors] = useState<string[]>([]);

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
        placeholder: placeholder || 'Type / for commands',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value || EMPTY_DOC,
    editorProps: {
      attributes: {
        class: 'notion-editor-content min-h-[460px] px-14 py-10 text-[15px] text-foreground focus:outline-none',
      },
    },
    onUpdate: ({ editor: nextEditor }: any) => {
      onChange(nextEditor.getJSON());
      const match = getSlashMatch(nextEditor as NonNullable<ReturnType<typeof useEditor>>, wrapperRef.current);
      setSlashState(match);
    },
    onSelectionUpdate: ({ editor: nextEditor }: any) => {
      const match = getSlashMatch(nextEditor as NonNullable<ReturnType<typeof useEditor>>, wrapperRef.current);
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
        label: 'Text',
        hint: 'Plain paragraph text',
        keywords: ['text', 'paragraph'],
        run: current => current.chain().focus().setParagraph().run(),
      },
      {
        id: 'h1',
        label: 'Heading 1',
        hint: 'Large section title',
        keywords: ['h1', 'heading', 'title'],
        run: current => current.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: 'h2',
        label: 'Heading 2',
        hint: 'Medium section heading',
        keywords: ['h2', 'heading', 'subtitle'],
        run: current => current.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: 'bullet',
        label: 'Bullet List',
        hint: 'Simple bullet points',
        keywords: ['list', 'bullet', 'ul'],
        run: current => current.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'ordered',
        label: 'Numbered List',
        hint: 'Ordered items',
        keywords: ['number', 'ordered', 'ol'],
        run: current => current.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'todo',
        label: 'To-do List',
        hint: 'Track tasks with checkboxes',
        keywords: ['task', 'todo', 'checkbox'],
        run: current => current.chain().focus().toggleTaskList().run(),
      },
      {
        id: 'quote',
        label: 'Quote',
        hint: 'Emphasized quotation block',
        keywords: ['quote', 'blockquote'],
        run: current => current.chain().focus().toggleBlockquote().run(),
      },
      {
        id: 'code',
        label: 'Code Block',
        hint: 'Formatted code snippet',
        keywords: ['code', 'snippet'],
        run: current => current.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: 'divider',
        label: 'Divider',
        hint: 'Horizontal separator line',
        keywords: ['divider', 'line', 'hr'],
        run: current => current.chain().focus().setHorizontalRule().run(),
      },
      {
        id: 'table',
        label: 'Table',
        hint: 'Insert a 3x3 table',
        keywords: ['table', 'grid'],
        run: current => current.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      },
    ],
    []
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
    const merged = [...recentTextColors, ...recentHighlightColors.filter(c => !recentTextColors.includes(c))];
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
    const nextHref = askForLink(currentHref);
    if (nextHref === null) return;
    if (nextHref === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: nextHref }).run();
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
  const activeHighlightColor = (editor?.getAttributes('highlight').color as string | undefined) || null;

  const renderColorPanel = () => (
    <div className="w-[270px] rounded-2xl border border-border bg-card p-3 shadow-2xl">
      <div>
        <p className="text-sm font-semibold text-foreground">Recently Used</p>
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
                <span className="h-[22px] w-[22px] rounded-full" style={{ backgroundColor: color }} />
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mt-3.5">
        <p className="text-sm font-semibold text-foreground">Text Color</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {TEXT_COLORS.map(item => (
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
        <p className="text-sm font-semibold text-foreground">Highlight Color</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {HIGHLIGHT_COLORS.map(item => (
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
    return <div className="rounded-xl border border-border bg-muted p-4 text-sm">Loading editor...</div>;
  }

  return (
    <div ref={wrapperRef} className="notion-editor-shell relative rounded-2xl border border-border bg-card shadow-sm">
      <div className="sticky top-0 z-20 border-b border-border/80 bg-card/85 px-3 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-1">
          <ToolButton label="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Numbered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Task List" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
            <CheckSquare className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Code Block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            <Code2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Table" active={editor.isActive('table')} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <Table2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Divider" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="h-4 w-4" />
          </ToolButton>

          <span className="mx-1 h-5 w-px bg-border" />

          <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Strike" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Link" active={editor.isActive('link')} onClick={toggleLink}>
            <Link2 className="h-4 w-4" />
          </ToolButton>

          <div ref={toolbarColorRef} className="relative">
            <button
              type="button"
              title="Text and Highlight colors"
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
              <span style={{ color: activeTextColor || undefined }} className="text-lg font-medium leading-none">
                A
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {toolbarColorOpen ? <div className="absolute right-0 top-10 z-30">{renderColorPanel()}</div> : null}
          </div>

          <span className="mx-1 h-5 w-px bg-border" />

          <ToolButton label="Undo" active={false} onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Redo" active={false} onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </ToolButton>
        </div>
      </div>

      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="flex items-center gap-0.5 rounded-2xl border border-border bg-card/95 p-1.5 text-foreground shadow-xl">
          <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Strike" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-4 w-4" />
          </ToolButton>

          <div ref={bubbleColorRef} className="relative">
            <button
              type="button"
              title="Text and Highlight colors"
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
              <span style={{ color: activeTextColor || undefined }} className="text-lg font-medium leading-none">
                A
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {bubbleColorOpen ? <div className="absolute right-0 top-10 z-30">{renderColorPanel()}</div> : null}
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
            Slash Commands
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
