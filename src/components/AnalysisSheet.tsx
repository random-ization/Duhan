import React from 'react';
import { X, BookOpen, MessageSquare, Lightbulb } from 'lucide-react';
import { Button } from './ui';
import { Sheet, SheetClose, SheetContent, SheetOverlay, SheetPortal } from './ui';

interface VocabularyItem {
  word: string;
  root: string;
  meaning: string;
  type: string;
}

interface GrammarItem {
  structure: string;
  explanation: string;
}

interface AnalysisData {
  vocabulary: VocabularyItem[];
  grammar: GrammarItem[];
  nuance: string;
  cached?: boolean;
}

interface AnalysisSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sentence: string;
  analysis: AnalysisData | null;
  loading: boolean;
}

// Sub-components for better organization and reduced cognitive complexity
const SectionTitle = ({
  icon: Icon,
  title,
  colorClass,
}: {
  icon: any;
  title: string;
  colorClass: string;
}) => (
  <div className="flex items-center gap-2 mb-3">
    <Icon className={`w-4 h-4 ${colorClass}`} />
    <h3 className="font-bold text-muted-foreground">{title}</h3>
  </div>
);

const VocabularySection = ({ items }: { items: VocabularyItem[] }) => (
  <section>
    <SectionTitle icon={BookOpen} title="词汇 Vocabulary" colorClass="text-amber-500" />
    <div className="grid grid-cols-2 gap-3">
      {items.map(item => (
        <div
          key={`vocab-${item.word}-${item.root}`}
          className="bg-gradient-to-br from-slate-50 to-white border border-border rounded-xl p-3 hover:shadow-md transition-shadow"
        >
          <p className="font-bold text-muted-foreground mb-1">{item.word}</p>
          <p className="text-xs text-muted-foreground mb-1">
            {item.root} · <span className="text-indigo-500">{item.type}</span>
          </p>
          <p className="text-sm text-muted-foreground">{item.meaning}</p>
        </div>
      ))}
    </div>
  </section>
);

const GrammarSection = ({ items }: { items: GrammarItem[] }) => (
  <section>
    <SectionTitle icon={MessageSquare} title="语法 Grammar" colorClass="text-emerald-500" />
    <div className="space-y-3">
      {items.map(item => (
        <div
          key={`grammar-${item.structure}`}
          className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"
        >
          <p className="font-bold text-emerald-700 mb-1">{item.structure}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.explanation}</p>
        </div>
      ))}
    </div>
  </section>
);

const NuanceSection = ({ nuance }: { nuance: string }) => (
  <section>
    <SectionTitle icon={Lightbulb} title="语感 Nuance" colorClass="text-purple-500" />
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{nuance}</p>
    </div>
  </section>
);

const AnalysisSheet: React.FC<AnalysisSheetProps> = ({
  isOpen,
  onClose,
  sentence,
  analysis,
  loading,
}) => {
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">AI 正在分析句子...</p>
        </div>
      );
    }

    if (!analysis) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>分析结果将显示在这里</p>
        </div>
      );
    }

    return (
      <>
        <VocabularySection items={analysis.vocabulary} />
        <GrammarSection items={analysis.grammar} />
        <NuanceSection nuance={analysis.nuance} />

        {analysis.cached && (
          <p className="text-xs text-center text-muted-foreground">✨ 已缓存结果</p>
        )}
      </>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetPortal>
        {/* Backdrop */}
        <SheetOverlay
          unstyled
          className="fixed inset-0 bg-black/50 z-40 transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
        />

        {/* Bottom Sheet */}
        <SheetContent
          unstyled
          forceMount
          closeOnEscape={false}
          lockBodyScroll={false}
          className="fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out data-[state=open]:translate-y-0 data-[state=closed]:translate-y-[105%]"
        >
          <div className="bg-card rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-muted rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-indigo-600 mb-1 uppercase tracking-wider flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    AI 句子分析
                  </p>
                  <p className="text-lg font-bold text-muted-foreground leading-relaxed">
                    {sentence}
                  </p>
                </div>
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    className="p-2 hover:bg-muted rounded-full transition-colors -mr-2"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </SheetClose>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6 space-y-6">
              {renderContent()}
            </div>

            {/* Safe area padding for mobile */}
            <div className="h-6" />
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};

export default AnalysisSheet;
