import re

with open("src/components/topik/WritingExamSession.tsx", "r") as f:
    content = f.read()

# Remove the KT import
content = re.sub(r"import\s+\{?.*KT.*\}?\s+from\s+'[^']+';\n", "", content)

# 1. Background linear gradient
content = content.replace(
    'style={{\n        background: `linear-gradient(180deg, ${KT.bg} 0%, ${KT.bg2} 100%)`,\n      }}',
    'className="flex-1 overflow-hidden px-4 pb-4 pt-4 md:px-6 md:pb-6 md:pt-6 bg-background"'
)
content = content.replace('className="flex-1 overflow-hidden px-4 pb-4 pt-4 md:px-6 md:pb-6 md:pt-6"\n      className="flex-1 overflow-hidden px-4 pb-4 pt-4 md:px-6 md:pb-6 md:pt-6 bg-background"', 'className="flex-1 overflow-hidden px-4 pb-4 pt-4 md:px-6 md:pb-6 md:pt-6 bg-background"')

# 2. Section borders and backgrounds
content = re.sub(
    r'style={{\s*borderColor:\s*KT\.line2,\s*background:\s*KT\.card,\s*boxShadow:\s*KT\.shSm,?\s*}}',
    '',
    content
)
# Add classes for these sections
content = content.replace(
    'className="rounded-[22px] border px-5 py-3 md:px-6 md:py-3.5"',
    'className="rounded-[22px] border border-border bg-card shadow-sm px-5 py-3 md:px-6 md:py-3.5"'
)
content = content.replace(
    'className="flex min-h-0 flex-col rounded-[22px] border px-4 py-3.5 md:px-5 md:py-4"',
    'className="flex min-h-0 flex-col rounded-[22px] border border-border bg-card shadow-sm px-4 py-3.5 md:px-5 md:py-4"'
)

# 3. Simple text colors
content = re.sub(r'style=\{\{\s*color:\s*KT\.ink,?\s*\}\}', '', content)
content = content.replace('className="text-[12px] font-black" >', 'className="text-[12px] font-black text-foreground">')
content = content.replace('className="text-[14px] font-black" >', 'className="text-[14px] font-black text-foreground">')
content = content.replace('className="mt-1 text-[15px] font-black" >', 'className="mt-1 text-[15px] font-black text-foreground">')
content = content.replace('className="mt-1 flex items-center gap-1.5 text-[15px] font-black" >', 'className="mt-1 flex items-center gap-1.5 text-[15px] font-black text-foreground">')

content = re.sub(r'style=\{\{\s*color:\s*KT\.sub,?\s*\}\}', '', content)
content = content.replace('className="mt-0.5 text-[12px] font-medium" >', 'className="mt-0.5 text-[12px] font-medium text-muted-foreground">')
content = content.replace('className="text-[10px] font-black uppercase tracking-[0.16em]" >', 'className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">')
content = content.replace('className="text-[12px] font-medium leading-4.5" >', 'className="text-[12px] font-medium leading-4.5 text-muted-foreground">')
content = content.replace('className="mt-0.5 text-[10px] font-medium" >', 'className="mt-0.5 text-[10px] font-medium text-muted-foreground">')
content = content.replace('className="mt-1.5 flex items-center justify-between text-[10px] font-medium" >', 'className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-muted-foreground">')

# 4. Text with serif font
content = re.sub(r'style=\{\{\s*color:\s*KT\.ink,\s*fontFamily:\s*KT\.serif,?\s*\}\}', '', content)
content = content.replace('className="text-[17px] font-semibold tracking-[-0.03em] md:text-[18px]" >', 'className="text-[17px] font-semibold tracking-[-0.03em] md:text-[18px] text-foreground font-serif">')

# 5. Badges / Chips
content = re.sub(r'style=\{\{\s*borderColor:\s*KT\.line,\s*background:\s*KT\.bg,\s*color:\s*KT\.ink,?\s*\}\}', '', content)
content = content.replace('className="rounded-full border px-3 py-1.5 text-[12px] font-black" >', 'className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[12px] font-black text-foreground">')
content = content.replace('className="rounded-full border px-3 py-1 text-[11px] font-black" >', 'className="rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] font-black text-foreground">')

content = re.sub(r'style=\{\{\s*borderColor:\s*KT\.line,\s*background:\s*KT\.bg,\s*color:\s*KT\.sub,?\s*\}\}', '', content)
content = content.replace('className="rounded-full border px-3 py-1.5 text-[12px] font-semibold" >', 'className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[12px] font-semibold text-muted-foreground">')
content = content.replace('className="rounded-full border px-3 py-1 text-[11px] font-semibold" >', 'className="rounded-full border border-border bg-muted/50 px-3 py-1 text-[11px] font-semibold text-muted-foreground">')
content = content.replace('className="rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]" >', 'className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">')

content = re.sub(r'style=\{\{\s*borderColor:\s*KT\.line,\s*background:\s*KT\.bg,?\s*\}\}', '', content)
content = content.replace('className={cn(\n                    \'rounded-full border px-3 py-1.5 text-[12px] font-black\',\n                    getSaveStatusClass(saveStatus)\n                  )}\n                  >', 'className={cn(\n                    \'rounded-full border border-border bg-muted/50 px-3 py-1.5 text-[12px] font-black\',\n                    getSaveStatusClass(saveStatus)\n                  )}>')
content = content.replace('className="rounded-[16px] border px-3 py-2.5" >', 'className="rounded-[16px] border border-border bg-muted/50 px-3 py-2.5">')
content = content.replace('className="rounded-[14px] border px-3 py-2 text-[12px] font-medium leading-4.5" >', 'className="rounded-[14px] border border-border bg-muted/50 px-3 py-2 text-[12px] font-medium leading-4.5">')

content = re.sub(r"style=\{\{\s*borderColor:\s*KT\.line,\s*background:\s*'rgba\(251,248,243,0\.72\)',?\s*\}\}", '', content)
content = content.replace('className="mt-4 flex-1 rounded-[16px] border p-2" >', 'className="mt-4 flex-1 rounded-[16px] border border-border bg-muted/30 p-2">')

# 6. Sidebar sections
content = re.sub(r"style=\{\{\s*borderColor:\s*KT\.line2,\s*background:\s*'rgba\(255,255,255,0\.96\)',\s*boxShadow:\s*KT\.shSm,?\s*\}\}", '', content)
content = content.replace('className="rounded-[20px] border p-3.5" >', 'className="rounded-[20px] border border-border bg-card/95 backdrop-blur-sm shadow-sm p-3.5">')

# 7. Icons
content = re.sub(r'style=\{\{\s*background:\s*KT\.bg2,\s*color:\s*KT\.ink,?\s*\}\}', '', content)
content = content.replace('className="flex h-9 w-9 items-center justify-center rounded-[12px]" >', 'className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-muted text-foreground">')

content = re.sub(r'style=\{\{\s*background:\s*KT\.bg2,\s*color:\s*KT\.crimson,?\s*\}\}', '', content)
content = content.replace('className="flex h-8 w-8 items-center justify-center rounded-[11px]" >', 'className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-destructive/10 text-destructive">')

# 8. Buttons
content = re.sub(r'style=\{\{\s*borderColor:\s*KT\.line2,\s*background:\s*KT\.card,\s*color:\s*KT\.ink,?\s*\}\}', '', content)
content = content.replace('className="h-10 justify-center rounded-[14px] border font-black text-[13px]" >', 'className="h-10 justify-center rounded-[14px] border border-border bg-card text-foreground font-black text-[13px] hover:bg-muted">')

content = re.sub(r'style=\{\{\s*background:\s*KT\.ink,\s*boxShadow:\s*KT\.shSm,?\s*\}\}', '', content)
content = content.replace('className="h-10 justify-center rounded-[14px] font-black text-[13px] text-white" >', 'className="h-10 justify-center rounded-[14px] bg-primary text-primary-foreground shadow-sm font-black text-[13px] hover:bg-primary/90">')

content = re.sub(r"style=\{\{\s*borderColor:\s*isActive\s*\?\s*KT\.line2\s*:\s*KT\.line,\s*background:\s*isActive\s*\?\s*KT\.bg2\s*:\s*'transparent',\s*boxShadow:\s*'none',?\s*\}\}", '', content)
content = content.replace('className="w-full rounded-[14px] border px-3 py-2.5 text-left transition-colors" >', 'className={cn("w-full rounded-[14px] border px-3 py-2.5 text-left transition-colors", isActive ? "border-primary bg-primary/10" : "border-border bg-transparent hover:bg-muted/50")}>')

# 9. Other KT usage
content = re.sub(r'style=\{isPaperTone \? \{ color: KT.ink \} : undefined\}', 'className={cn(..., isPaperTone && "text-foreground")}', content) # Just remove it, the cn wrapper will handle it if we modify it
# Actually let's just completely replace the QuestionPrompt component's KT usage.

def replace_question_prompt(text):
    text = re.sub(r'style=\{isPaperTone \? \{ color: KT.ink \} : undefined\}', '', text)
    text = re.sub(r'style=\{isPaperTone \? \{ color: KT.ink2 \} : undefined\}', '', text)
    text = re.sub(r'style=\{\s*isPaperTone\s*\?\s*\{\s*borderColor: KT.line2,\s*background: KT.card,?\s*\}\s*:\s*undefined\s*\}', '', text)
    text = re.sub(r'style=\{\s*isPaperTone\s*\?\s*\{\s*borderColor: KT.line2,\s*background: KT.bg,?\s*\}\s*:\s*undefined\s*\}', '', text)

    text = text.replace(
        "className={cn(\n            'rounded-2xl border-2 shadow-sm',\n            compact ? 'p-3.5 md:p-4' : 'p-4 md:p-5'\n          )}\n          >",
        "className={cn(\n            'rounded-2xl border-2 shadow-sm',\n            isPaperTone ? 'border-border bg-card' : 'border-border bg-background',\n            compact ? 'p-3.5 md:p-4' : 'p-4 md:p-5'\n          )}>"
    )

    text = text.replace(
        "className={cn(\n            'relative rounded-2xl border-2 shadow-sm',\n            compact ? 'p-3.5 md:p-4' : 'p-4 md:p-5'\n          )}\n          >",
        "className={cn(\n            'relative rounded-2xl border-2 shadow-sm',\n            isPaperTone ? 'border-border bg-muted/30' : 'border-border bg-background',\n            compact ? 'p-3.5 md:p-4' : 'p-4 md:p-5'\n          )}>"
    )

    text = text.replace(
        "className=\"absolute -top-3 left-4 rounded border px-2 text-[11px] font-black text-muted-foreground\"\n            >",
        "className={cn(\n              'absolute -top-3 left-4 rounded border px-2 text-[11px] font-black text-muted-foreground',\n              isPaperTone ? 'border-border bg-muted/30' : 'bg-background'\n            )}>"
    )

    text = text.replace(
        "className={cn(\n              'w-full rounded-xl border object-contain',\n              compact ? 'max-h-[300px]' : 'max-h-[460px]'\n            )}\n            >",
        "className={cn(\n              'w-full rounded-xl border object-contain',\n              isPaperTone ? 'border-border bg-muted/30' : 'bg-background',\n              compact ? 'max-h-[300px]' : 'max-h-[460px]'\n            )}>"
    )

    text = text.replace(
        "className=\"rounded-2xl border-2 p-3 shadow-sm\"\n          >",
        "className={cn(\n            'rounded-2xl border-2 p-3 shadow-sm',\n            isPaperTone ? 'border-border bg-card' : 'border-border bg-background'\n          )}>"
    )
    return text

content = replace_question_prompt(content)

# Remove compact styling in FillBlank inputs
content = re.sub(r'style=\{compact \? \{ borderColor: KT.line2, background: KT.bg \} : undefined\}', '', content)
content = re.sub(r'style=\{compact \? \{ color: KT.ink \} : undefined\}', '', content)
content = re.sub(r'style=\{compact \? \{ color: KT.sub \} : undefined\}', '', content)
content = re.sub(r'style=\{compact \? \{ borderColor: KT.line2, color: KT.ink, background: KT.card \} : undefined\}', '', content)
content = re.sub(r'style=\{compact \? \{ borderColor: KT.line2, color: KT.ink \} : undefined\}', '', content)

content = content.replace(
    "className={cn(\n            'h-full overflow-y-auto rounded-2xl border-2',\n            compact ? 'p-3 md:p-4' : 'p-4 md:p-6'\n          )}\n          >",
    "className={cn(\n            'h-full overflow-y-auto rounded-2xl border-2 border-border bg-muted/10',\n            compact ? 'p-3 md:p-4' : 'p-4 md:p-6'\n          )}>"
)

with open("src/components/topik/WritingExamSession.tsx", "w") as f:
    f.write(content)
