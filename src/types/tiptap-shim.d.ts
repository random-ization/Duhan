declare module '@tiptap/core' {
  export type JSONContent = any;
}

declare module '@tiptap/react' {
  export const EditorContent: any;
  export const useEditor: any;
}

declare module '@tiptap/react/menus' {
  export const BubbleMenu: any;
  export const FloatingMenu: any;
}

declare module '@tiptap/starter-kit' {
  const StarterKit: any;
  export default StarterKit;
}

declare module '@tiptap/extension-placeholder' {
  const Placeholder: any;
  export default Placeholder;
}

declare module '@tiptap/extension-link' {
  const Link: any;
  export default Link;
}

declare module '@tiptap/extension-text-align' {
  const TextAlign: any;
  export default TextAlign;
}

declare module '@tiptap/extension-task-list' {
  const TaskList: any;
  export default TaskList;
}

declare module '@tiptap/extension-task-item' {
  const TaskItem: any;
  export default TaskItem;
}

declare module '@tiptap/extension-highlight' {
  const Highlight: any;
  export default Highlight;
}

declare module '@tiptap/extension-underline' {
  const Underline: any;
  export default Underline;
}

declare module '@tiptap/extension-text-style' {
  export const TextStyle: any;
}

declare module '@tiptap/extension-color' {
  const Color: any;
  export default Color;
}

declare module '@tiptap/extension-table' {
  export const Table: any;
}

declare module '@tiptap/extension-table-row' {
  const TableRow: any;
  export default TableRow;
}

declare module '@tiptap/extension-table-cell' {
  const TableCell: any;
  export default TableCell;
}

declare module '@tiptap/extension-table-header' {
  const TableHeader: any;
  export default TableHeader;
}

declare module '@tiptap/extension-bubble-menu' {
  export type BubbleMenuPluginProps = any;
  export const BubbleMenuPlugin: any;
}

declare module '@tiptap/extension-floating-menu' {
  export type FloatingMenuPluginProps = any;
  export const FloatingMenuPlugin: any;
}

declare module '@tiptap/pm/*';
