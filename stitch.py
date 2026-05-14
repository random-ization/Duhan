import re

with open("first_150.txt", "r") as f:
    first_lines = f.read().splitlines()

# The first_150.txt ends at line 125 of the original file
# Line 125 is `    return parsed.slotA.length > 0 && parsed.slotB.length > 0;`
# Line 126 is `  }` in the backup.
# Let's check first_150.txt length.
print(f"first_150 length: {len(first_lines)}")
