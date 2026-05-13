import type { JSONContent } from '@tiptap/core';
import OfficialTiptapEditor from '../notebook/OfficialTiptapEditor';
import { EMPTY_QA_DOC } from './qaRichText';

interface QARichTextEditorProps {
  value: JSONContent;
  onChange: (value: JSONContent) => void;
  placeholder: string;
}

export function QARichTextEditor({ value, onChange, placeholder }: QARichTextEditorProps) {
  return (
    <div className="rounded-[24px] border border-k-line bg-k-card shadow-k-shSm">
      <OfficialTiptapEditor
        value={value || EMPTY_QA_DOC}
        onChange={onChange}
        placeholder={placeholder}
        preset="full"
      />
    </div>
  );
}
