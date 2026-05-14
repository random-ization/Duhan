import re

with open("src/components/topik/WritingExamSession.tsx", "r") as f:
    content = f.read()

# 1. Inject DRail component
drail_code = """
function DRail({ kanji, title, action, children, pad = 14 }: { kanji?: string; title: string; action?: string; children: React.ReactNode; pad?: number }) {
  return (
    <div className="mb-[22px]">
      <div className="mb-2.5 flex items-baseline px-0.5">
        {kanji && (
          <span className="mr-2 font-serif text-[15px] font-bold text-destructive">
            {kanji}
          </span>
        )}
        <span className="text-[13px] font-extrabold tracking-[0.5px] text-foreground">
          {title}
        </span>
        {action && (
          <span className="ml-auto cursor-pointer text-[11px] font-bold text-muted-foreground hover:text-foreground">
            {action}
          </span>
        )}
      </div>
      <div className="rounded-[16px] bg-card shadow-sm border border-border" style={{ padding: pad }}>
        {children}
      </div>
    </div>
  );
}

const WritingSessionBody
"""
content = content.replace("const WritingSessionBody", drail_code)


# 2. Extract and replace the desktop return block
start_marker = "  const completedQuestionCount = questions.filter(question =>\n    hasMeaningfulContent(question.number, localAnswers[question.number] ?? '')\n  ).length;\n\n  return ("

# We need to find the matching closing brace for this return.
# The component ends at `};\n\n// ─── Main Component ───────────────────────────────────────────────────────────`
end_marker = "};\n\n// ─── Main Component"

new_desktop_return = """  return (
    <div className="flex-1 overflow-y-auto bg-background px-4 py-6 md:px-8 md:py-8 lg:px-12">
      <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[1fr_320px]">

        {/* Main Column */}
        <div className="flex flex-col gap-6">
          {/* Prompt Card */}
          <div className="rounded-[24px] bg-card p-6 md:p-8 shadow-sm border border-border/80">
            <div className="flex items-center gap-2 mb-5">
               <span className="bg-destructive text-destructive-foreground text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm tracking-wide">
                 第 {currentQuestion.number} 题 · {currentQuestionTypeLabel} · {currentQuestion.score}分
               </span>
            </div>

            <div className={cn("grid gap-6", currentQuestion.image ? "xl:grid-cols-[1fr_1.2fr] items-start" : "grid-cols-1")}>
              <div className="space-y-5">
                 {/* Instruction */}
                 <div className="text-[17px] md:text-[19px] font-serif font-medium leading-[1.8] text-foreground whitespace-pre-wrap">
                   {currentQuestion.instruction}
                 </div>
                 {/* Context Box */}
                 {currentQuestion.contextBox && (
                    <div className="bg-muted/30 rounded-2xl p-5 text-[15px] md:text-[16px] leading-[1.8] text-foreground whitespace-pre-wrap border border-border/60">
                       {currentQuestion.contextBox}
                    </div>
                 )}
              </div>

              {/* Image */}
              {currentQuestion.image && (
                 <div className="flex items-start justify-center bg-muted/20 rounded-2xl p-4 border border-border/50">
                    <img
                      src={currentQuestion.image}
                      alt="Question"
                      className="max-w-full rounded-xl shadow-sm object-contain"
                      style={{ maxHeight: '480px' }}
                    />
                 </div>
              )}
            </div>
          </div>

          {/* Answer Card */}
          <div className="flex flex-col rounded-[24px] bg-card shadow-sm border border-border/80 overflow-hidden min-h-[500px]">
             {/* Header */}
             <div className="flex items-center gap-3 border-b border-border/60 bg-muted/10 px-6 py-4 flex-wrap">
                <span className="font-extrabold text-foreground text-[14px]">作答区</span>
                <span className="bg-muted text-muted-foreground text-[11px] font-bold px-3 py-1 rounded-full">
                   已写 {currentCharCount} 字
                </span>
                {remainingChars > 0 ? (
                  <span className="bg-muted text-muted-foreground text-[11px] font-bold px-3 py-1 rounded-full">
                     还需 {remainingChars} 字
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-full">
                     字数达标
                  </span>
                )}

                <div className="flex-1 min-w-[20px]" />
                <span className="bg-[#F7E8B8] text-[#A8872E] text-[12px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                   <Clock size={14} />
                   {formatTime(remainingMs)} / 50:00
                </span>
             </div>

             {/* Editor */}
             <div className="flex-1 p-6 md:p-8 flex flex-col">
                {isLongFormQuestion ? (
                  <WongojiEditor
                    value={currentAnswer}
                    onChange={text => onAnswerChange(currentQuestion.number, text)}
                    maxLength={maxAnswerLength}
                    className="flex-1 h-full min-h-[350px]"
                    surfaceTone="default"
                  />
                ) : isDualFillQuestion ? (
                  <DualFillBlankInputs
                    value={currentAnswer}
                    onChange={text => onAnswerChange(currentQuestion.number, text)}
                    maxLength={maxAnswerLength}
                    compact
                  />
                ) : (
                  <FillBlankTextarea
                    value={currentAnswer}
                    onChange={text => onAnswerChange(currentQuestion.number, text)}
                    maxLength={maxAnswerLength}
                    compact
                  />
                )}
             </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-3 mt-2">
             <Button variant="outline" className="rounded-xl border-border/80 hover:bg-muted font-bold text-[13px] h-11 px-5">
                📝 段落模板
             </Button>
             <Button
               variant="outline"
               className="rounded-xl border-border/80 hover:bg-muted font-bold text-[13px] h-11 px-5"
               onClick={() => {}}
             >
                💾 {getSaveStatusText(saveStatus, t)}
             </Button>
             <div className="flex-1" />
             <Button
               className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-extrabold text-[14px] h-11 px-8 shadow-sm transition-transform active:scale-95"
               onClick={onRequestSubmit}
               disabled={isSubmitting || isExiting}
             >
                {isSubmitting ? '提交中...' : '提交 AI 评分 →'}
             </Button>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-2 pt-2">
           <DRail kanji="考" title="题目导航" pad={16}>
              <div className="grid grid-cols-4 gap-2.5">
                 {questions.map(q => {
                    const isCurrent = q.number === currentQuestion.number;
                    const hasAns = hasMeaningfulContent(q.number, localAnswers[q.number] ?? '');
                    return (
                      <button
                        key={q.number}
                        onClick={() => onSelectQuestion(q.number)}
                        className={cn(
                          "rounded-[10px] py-2.5 text-center text-[13px] font-black border transition-all",
                          isCurrent
                            ? "bg-destructive text-destructive-foreground border-destructive shadow-sm"
                            : hasAns
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                              : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                         {q.number}
                      </button>
                    );
                 })}
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-muted-foreground border-t border-border/50 pt-3">
                 <span>进度: {completedQuestionCount}/{questions.length}</span>
                 <button onClick={onRequestExit} className="hover:text-destructive transition-colors flex items-center gap-1">
                   <LogOut size={12} />
                   退出考试
                 </button>
              </div>
           </DRail>

           <DRail kanji="評" title="AI 实时反馈 (预估)" pad={16}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                 {[
                   { label: '内容', score: '-' },
                   { label: '语法', score: '-' },
                   { label: '词汇', score: '-' },
                   { label: '结构', score: '-' },
                 ].map((item, idx) => (
                    <div key={idx} className="bg-muted/30 rounded-[12px] p-2.5">
                       <div className="text-[10px] font-bold text-muted-foreground mb-1.5">{item.label}</div>
                       <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                             <div className="h-full bg-destructive/30 rounded-full" style={{ width: '0%' }} />
                          </div>
                          <span className="text-[12px] font-black text-foreground w-5 text-right">{item.score}</span>
                       </div>
                    </div>
                 ))}
              </div>
              <p className="text-[11px] text-muted-foreground italic leading-relaxed font-medium">
                「交卷后，AI 将在此处为您提供详细的多维度评分与改进建议。」
              </p>
           </DRail>

           <DRail kanji="句" title="句型推荐" pad={16}>
              <div className="space-y-3">
                 {currentQuestion.questionType === 'OPINION_ESSAY' && (
                    <>
                      <div className="border-b border-border/40 pb-2.5">
                         <div className="text-[13px] font-extrabold text-foreground">~에 대해 논하시오</div>
                         <div className="text-[11px] text-muted-foreground mt-1 font-medium">论述现代社会环境保护的重要性</div>
                      </div>
                      <div className="border-b border-border/40 pb-2.5">
                         <div className="text-[13px] font-extrabold text-foreground">뿐만 아니라</div>
                         <div className="text-[11px] text-muted-foreground mt-1 font-medium">不仅如此</div>
                      </div>
                      <div className="border-b border-border/40 pb-2.5">
                         <div className="text-[13px] font-extrabold text-foreground">결론적으로</div>
                         <div className="text-[11px] text-muted-foreground mt-1 font-medium">综上所述</div>
                      </div>
                    </>
                 )}
                 {currentQuestion.questionType === 'GRAPH_ESSAY' && (
                    <>
                      <div className="border-b border-border/40 pb-2.5">
                         <div className="text-[13px] font-extrabold text-foreground">~을/를 살펴보면</div>
                         <div className="text-[11px] text-muted-foreground mt-1 font-medium">观察图表可以看出</div>
                      </div>
                      <div className="border-b border-border/40 pb-2.5">
                         <div className="text-[13px] font-extrabold text-foreground">크게 증가했다</div>
                         <div className="text-[11px] text-muted-foreground mt-1 font-medium">呈现大幅增长的趋势</div>
                      </div>
                    </>
                 )}
                 {currentQuestion.questionType === 'FILL_BLANK' && (
                    <div className="text-[11px] text-muted-foreground italic leading-relaxed">
                      💡 仔细阅读前后文逻辑，<br/>特别注意<b>时态</b>和<b>敬语</b>的一致性。
                    </div>
                 )}
              </div>
           </DRail>
        </div>

      </div>
    </div>
  );
"""

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx + len(start_marker)] + new_desktop_return + content[end_idx:]
else:
    print("Could not find markers.")

with open("src/components/topik/WritingExamSession.tsx", "w") as f:
    f.write(content)
