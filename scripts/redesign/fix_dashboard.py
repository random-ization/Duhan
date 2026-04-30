import re

with open('src/components/mobile/MobileDashboard.tsx', 'r') as f:
    content = f.read()

# Pattern 1: Find `const path: PathStep[] = [` and everything until `const streakDoneDays = `
# Actually `const dateLabel = useMemo` is right after `const streakDoneDays`
# Let's just find `const path: PathStep[] = ` and remove until `const dateLabel`
# Note: we need to keep `const streakDoneDays`
pattern1 = r"const path: PathStep\[\] = \[.*?const streakDoneDays = Math\.min\(7, Math\.max\(0, streak % 7 \|\| \(streak > 0 \? 7 : 0\)\)\);\n"
match1 = re.search(pattern1, content, flags=re.DOTALL)
if match1:
    content = content[:match1.start()] + "const streakDoneDays = Math.min(7, Math.max(0, streak % 7 || (streak > 0 ? 7 : 0)));\n" + content[match1.end():]
    print("Pattern 1 replaced")
else:
    print("Could not find Pattern 1, let's try a looser regex")
    alt_pattern = r"const path: PathStep\[\] = \[.*?\n  \];\n\n.*?const step = Math\.min\(doneCount, path\.length\);\n"
    match_alt = re.search(alt_pattern, content, flags=re.DOTALL)
    if match_alt:
        content = content[:match_alt.start()] + content[match_alt.end():]
        print("Alt pattern 1 replaced")
    else:
        print("Still couldn't find pattern 1")

with open('src/components/mobile/MobileDashboard.tsx', 'w') as f:
    f.write(content)
