import React from 'react';
import { Edit2 } from 'lucide-react';

interface WordRowProps {
  word: {
    _id: string;
    word: string;
    meaning: string;
    meaningEn?: string;
    meaningVi?: string;
    meaningMn?: string;
    unitId?: number;
    partOfSpeech?: string;
    exampleSentence?: string;
    appearanceId?: string;
  };
  onEdit: (word: any) => void;
}

const VocabWordRow: React.FC<WordRowProps> = ({ word, onEdit }) => {
  return (
    <tr
      key={word.appearanceId ?? word._id}
      className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors"
    >
      <td className="px-3 py-2 text-zinc-600">{word.unitId ?? '-'}</td>
      <td className="px-3 py-2 font-bold text-zinc-900">{word.word}</td>
      <td className="px-3 py-2 text-zinc-500 text-xs">{word.partOfSpeech || '-'}</td>
      <td
        className="px-3 py-2 text-zinc-600 max-w-[120px] truncate"
        title={word.meaningMn}
      >
        {word.meaningMn || '-'}
      </td>
      <td
        className="px-3 py-2 text-zinc-600 max-w-[120px] truncate"
        title={word.meaningVi}
      >
        {word.meaningVi || '-'}
      </td>
      <td
        className="px-3 py-2 text-zinc-600 max-w-[120px] truncate"
        title={word.meaningEn}
      >
        {word.meaningEn || '-'}
      </td>
      <td
        className="px-3 py-2 text-zinc-600 max-w-[120px] truncate"
        title={word.meaning}
      >
        {word.meaning}
      </td>
      <td
        className="px-3 py-2 text-zinc-500 text-xs max-w-[150px] truncate"
        title={word.exampleSentence}
      >
        {word.exampleSentence || '-'}
      </td>
      <td className="px-3 py-2">
        <button
          onClick={() => onEdit(word)}
          className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors"
          title="编辑"
          aria-label={`编辑单词 ${word.word}`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

export default VocabWordRow;
