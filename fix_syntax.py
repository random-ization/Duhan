with open("src/components/topik/WritingExamSession.tsx", "r") as f:
    content = f.read()

# Fix 1: Extra <div
content = content.replace(
"""                    </div>
                    <div
                    <div
                      className="rounded-full border px-3 py-1 text-[11px] font-semibold\"""",
"""                    </div>
                    <div
                      className="rounded-full border px-3 py-1 text-[11px] font-semibold\""""
)

# Fix 2: Missing return (
content = content.replace(
"""                  const hasContent = hasMeaningfulContent(
                    question.number,
                    localAnswers[question.number] ?? ''
                  );
                    <Button""",
"""                  const hasContent = hasMeaningfulContent(
                    question.number,
                    localAnswers[question.number] ?? ''
                  );
                  return (
                    <Button"""
)

with open("src/components/topik/WritingExamSession.tsx", "w") as f:
    f.write(content)
