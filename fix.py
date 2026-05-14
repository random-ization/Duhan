with open("src/components/topik/WritingExamSession.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'className={cn(..., isPaperTone && "text-foreground")}',
    ''
)

# And wait, the previous cn had its closing tag, but we should make sure the text color is correctly applied.
# The original was: `style={isPaperTone ? { color: KT.ink } : undefined}`
# So it was setting the text color. We can just append it to the existing `cn()`

content = content.replace(
    "'whitespace-pre-wrap break-words font-semibold',",
    "'whitespace-pre-wrap break-words font-semibold', isPaperTone && 'text-foreground',"
)

content = content.replace(
    "'whitespace-pre-wrap break-words',",
    "'whitespace-pre-wrap break-words', isPaperTone && 'text-foreground',"
)

with open("src/components/topik/WritingExamSession.tsx", "w") as f:
    f.write(content)
