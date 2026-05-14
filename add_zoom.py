import re

with open("src/components/topik/WritingExamSession.tsx", "r") as f:
    content = f.read()

# 1. Add ZoomIn, X to lucide-react imports
content = re.sub(
    r"import \{([^}]+)\} from 'lucide-react';",
    lambda m: "import {" + m.group(1) + ", ZoomIn, X} from 'lucide-react';" if "ZoomIn" not in m.group(1) else m.group(0),
    content
)

# 2. Update QuestionPrompt signature to include state
if "const [isZoomed, setIsZoomed] = useState(false);" not in content:
    content = content.replace(
        "const QuestionPrompt: React.FC<QuestionPromptProps> = ({",
        "const QuestionPrompt: React.FC<QuestionPromptProps> = ({\n"
    )
    content = content.replace(
        "  const { t } = useTranslation();\n  const isPaperTone = surfaceTone === 'paper';\n  return (",
        "  const { t } = useTranslation();\n  const isPaperTone = surfaceTone === 'paper';\n  const [isZoomed, setIsZoomed] = useState(false);\n  return ("
    )

# 3. Replace image rendering logic
old_image_block = """      {question.image && (
        <div
          className="rounded-2xl border-2 p-3 shadow-sm"
          style={
            isPaperTone
              ? {
                  borderColor: KT.line2,
                  background: KT.card,
                }
              : undefined
          }
        >
          <img
            src={question.image}
            alt={String(question.number)}
            className={cn(
              'w-full rounded-xl border object-contain',
              compact ? 'max-h-[300px]' : 'max-h-[460px]'
            )}
            style={
              isPaperTone
                ? {
                    borderColor: KT.line2,
                    background: KT.bg,
                  }
                : undefined
            }
          />
        </div>
      )}"""

new_image_block = """      {question.image && (
        <>
          <div
            className="group relative cursor-zoom-in rounded-2xl border-2 p-3 shadow-sm transition-all hover:border-[rgba(31,27,23,0.3)]"
            style={
              isPaperTone
                ? {
                    borderColor: KT.line2,
                    background: KT.card,
                  }
                : undefined
            }
            onClick={() => setIsZoomed(true)}
          >
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[rgba(31,27,23,0.04)] opacity-0 transition-opacity group-hover:opacity-100">
              <div className="rounded-full bg-white/90 p-2 shadow-sm backdrop-blur-sm">
                <ZoomIn size={20} style={{ color: KT.ink }} />
              </div>
            </div>
            <img
              src={question.image}
              alt={String(question.number)}
              className={cn(
                'w-full rounded-xl border object-contain',
                compact ? 'max-h-[400px]' : 'max-h-[500px]'
              )}
              style={
                isPaperTone
                  ? {
                      borderColor: KT.line2,
                      background: KT.bg,
                    }
                  : undefined
              }
            />
          </div>

          {isZoomed && (
            <div
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-md transition-all animate-in fade-in duration-200 md:p-12 cursor-zoom-out"
              style={{ background: 'rgba(31,27,23,0.85)' }}
              onClick={() => setIsZoomed(false)}
            >
              <div className="relative flex max-h-full max-w-5xl flex-col items-center" onClick={e => e.stopPropagation()}>
                <button
                  className="absolute -top-12 right-0 p-2 transition-colors hover:scale-110"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onClick={() => setIsZoomed(false)}
                >
                  <X size={32} />
                </button>
                <img
                  src={question.image}
                  alt={String(question.number)}
                  className="max-h-[85vh] w-full rounded-2xl object-contain p-4 shadow-2xl"
                  style={{ background: KT.card }}
                />
              </div>
            </div>
          )}
        </>
      )}"""

content = content.replace(old_image_block, new_image_block)

# 4. Change grid ratios for desktop layout
# Original:
#           isLongFormQuestion
#             ? 'md:grid-cols-[minmax(280px,0.58fr)_minmax(0,1.42fr)]'
#             : 'md:grid-cols-[minmax(280px,0.62fr)_minmax(0,1.38fr)]'

content = content.replace(
    "'md:grid-cols-[minmax(280px,0.58fr)_minmax(0,1.42fr)]'",
    "'md:grid-cols-[minmax(380px,0.85fr)_minmax(0,1.15fr)]'"
)
content = content.replace(
    "'md:grid-cols-[minmax(280px,0.62fr)_minmax(0,1.38fr)]'",
    "'md:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.1fr)]'"
)

with open("src/components/topik/WritingExamSession.tsx", "w") as f:
    f.write(content)
