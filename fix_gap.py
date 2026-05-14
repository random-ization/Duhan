import re

with open("first_150.txt", "r") as f:
    first_lines = f.read().splitlines()

with open("src/components/topik/WritingExamSession_backup.txt", "r") as f:
    backup_lines = f.readlines()

parsed_lines = {}
for line in backup_lines:
    match = re.match(r'^(\d+)[:-](.*)', line)
    if match:
        line_num = int(match.group(1))
        content = match.group(2)
        parsed_lines[line_num] = content

# Gap is 1151 to 1324
gap_content = """
                    <div
                      className="rounded-full border px-3 py-1 text-[11px] font-semibold"
                      style={{ borderColor: KT.line, background: KT.bg, color: KT.sub }}
                    >
                      {t('topikWriting.session.remainingChars', {
                        count: remainingChars,
                        defaultValue: '{{count}} left',
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'mt-3 min-h-0 flex-1 rounded-[20px] border p-3 xl:p-3.5',
                  isLongFormQuestion ? 'overflow-hidden' : ''
                )}
                style={{ borderColor: KT.line, background: KT.bg }}
              >
                <div className="flex h-full min-h-0 flex-col">
                  {isLongFormQuestion ? (
                    <WongojiEditor
                      value={currentAnswer}
                      onChange={text => onAnswerChange(currentQuestion.number, text)}
                      maxLength={maxAnswerLength}
                      className="h-full"
                      surfaceTone="paper"
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
            </section>
          </div>
        </div>

        <aside className="min-h-0 xl:pb-4">
          <div className="sticky top-5 space-y-2.5">
            <section
              className="rounded-[20px] border p-3.5"
              style={{
                borderColor: KT.line2,
                background: 'rgba(255,255,255,0.96)',
                boxShadow: KT.shSm,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-[11px]"
                  style={{ background: KT.bg2, color: KT.crimson }}
                >
                  <ShieldCheck size={15} />
                </div>
                <div>
                  <h3 className="text-[14px] font-black" style={{ color: KT.ink }}>
                    {t('topikWriting.session.examStatus', {
                      defaultValue: 'Exam status',
                    })}
                  </h3>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                <div className="rounded-[16px] border px-3 py-2.5" style={{ borderColor: KT.line, background: KT.bg }}>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: KT.sub }}>
                    {t('topikWriting.session.time', { defaultValue: 'Time' })}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[15px] font-black" style={{ color: KT.ink }}>
                    <Clock size={14} />
                    {formatTime(remainingMs)}
                  </div>
                </div>

                <div className="rounded-[16px] border px-3 py-2.5" style={{ borderColor: KT.line, background: KT.bg }}>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: KT.sub }}>
                    {t('topikWriting.session.progress', { defaultValue: 'Progress' })}
                  </div>
                  <div className="mt-1 text-[15px] font-black" style={{ color: KT.ink }}>
                    {completedQuestionCount}/{questions.length}
                  </div>
                  <div className="mt-0.5 text-[12px] font-medium" style={{ color: KT.sub }}>
                    {t('topikWriting.session.pointsSummary', {
                      total: questions.reduce((sum, question) => sum + question.score, 0),
                      defaultValue: `${questions.reduce((sum, question) => sum + question.score, 0)} pts total`,
                    })}
                  </div>
                </div>

                <div className="rounded-[16px] border px-3 py-2.5" style={{ borderColor: KT.line, background: KT.bg }}>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: KT.sub }}>
                    {t('topikWriting.session.saveState', { defaultValue: 'Save state' })}
                  </div>
                  <div
                    className={cn('mt-1.5 text-[13px] font-black transition-all', getSaveStatusClass(saveStatus))}
                  >
                    {getSaveStatusText(saveStatus, t)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={onRequestExit}
                  disabled={isSubmitting || isExiting}
                  className="h-10 justify-center rounded-[14px] border font-black text-[13px]"
                  style={{
                    borderColor: KT.line2,
                    background: KT.card,
                    color: KT.ink,
                  }}
                >
                  <LogOut size={15} className="mr-2" />
                  {isExiting
                    ? t('topikWriting.session.exiting', { defaultValue: 'Exiting...' })
                    : t('dashboard.topik.controller.exit', { defaultValue: 'Exit' })}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={onRequestSubmit}
                  disabled={isSubmitting || isExiting}
                  className="h-10 justify-center rounded-[14px] font-black text-[13px] text-white"
                  style={{
                    background: KT.ink,
                    boxShadow: KT.shSm,
                  }}
                >
                  <Send size={15} className="mr-2" />
                  {isSubmitting
                    ? t('topikWriting.session.submitting', { defaultValue: 'Submitting...' })
                    : t('topikWriting.session.submitButton', { defaultValue: 'Submit' })}
                </Button>
              </div>
            </section>

            <section
              className="rounded-[20px] border p-3.5"
              style={{
                borderColor: KT.line2,
                background: 'rgba(255,255,255,0.96)',
                boxShadow: KT.shSm,
              }}
            >
              <h3 className="text-[14px] font-black" style={{ color: KT.ink }}>
                {t('topikWriting.session.questionNavigator', {
                  defaultValue: 'Question navigator',
                })}
              </h3>

              <div className="mt-3 space-y-2">
                {questions.map(question => {
                  const isActive = question.number === currentQuestion.number;
                  const hasContent = hasMeaningfulContent(
                    question.number,
                    localAnswers[question.number] ?? ''
                  );
"""

# Let's insert the gap directly into the parsed lines correctly!
gap_lines = gap_content.strip("\n").split("\n")
# Start index is 1151
for i, line in enumerate(gap_lines):
    parsed_lines[1151 + i] = line

with open("src/components/topik/WritingExamSession.tsx", "w") as f:
    for line in first_lines:
        f.write(line + "\n")

    max_line = max(parsed_lines.keys())
    for i in range(126, max_line + 1):
        if i in parsed_lines:
            f.write(parsed_lines[i] + "\n")
        else:
            f.write("\n")
