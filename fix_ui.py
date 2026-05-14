import re

with open("src/components/topik/WritingExamSession.tsx", "r") as f:
    content = f.read()

# Fix 1: Remove all inline styles matching KT completely from DualFillBlankInputs
content = re.sub(r'style=\{compact \? \{ [^\}]+ \} : undefined\}', '', content)
content = re.sub(r'style=\{compact \? \{[^\}]+\} : undefined\}', '', content)

# Fix 2: Clean up the messy DualFillBlankInputs classes
old_fill = """      <div
        className={cn(
          'border bg-[#fffef8] flex-1',
          compact
            ? 'rounded-[20px] p-4 space-y-4 shadow-sm'
            : 'rounded-2xl p-5 md:p-6 space-y-5 shadow-[4px_4px_0px_0px_#18181B]'
        )}

      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p
            className="text-sm font-black text-zinc-800"

          >"""

new_fill = """      <div
        className={cn(
          'border-border bg-card flex-1',
          compact
            ? 'rounded-[20px] p-4 space-y-4 shadow-sm border'
            : 'rounded-2xl p-5 md:p-6 space-y-5 shadow-sm border-2'
        )}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-black text-foreground">"""

content = content.replace(old_fill, new_fill)

content = content.replace(
"""          <span
            className="text-[11px] font-bold text-zinc-500"

          >""",
"""          <span className="text-[11px] font-bold text-muted-foreground">"""
)

content = content.replace(
"""        <p
          className="text-sm text-zinc-600 font-medium leading-relaxed"

        >""",
"""        <p className="text-sm text-muted-foreground font-medium leading-relaxed">"""
)

content = content.replace(
"""            <span
              className="inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-full border text-sm font-black text-zinc-900 bg-white"

            >""",
"""            <span className="inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-full border border-border text-sm font-black text-foreground bg-background shadow-sm">"""
)

content = content.replace(
"""              className={cn(
                'w-full bg-transparent border-0 border-b-2 border-zinc-900 rounded-none px-1 pb-1 font-semibold text-zinc-900',
                compact ? 'h-12 text-[16px]' : 'h-11 text-base md:text-lg',
                'focus:outline-none focus:border-primary transition-colors',
                'placeholder:text-zinc-400'
              )}

              placeholder""",
"""              className={cn(
                'w-full bg-transparent border-0 border-b-2 border-border rounded-none px-1 pb-1 font-semibold text-foreground',
                compact ? 'h-12 text-[16px]' : 'h-11 text-base md:text-lg',
                'focus:outline-none focus:border-primary transition-colors',
                'placeholder:text-muted-foreground/50'
              )}
              placeholder"""
)


with open("src/components/topik/WritingExamSession.tsx", "w") as f:
    f.write(content)
