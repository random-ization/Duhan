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

with open("src/components/topik/WritingExamSession.tsx", "w") as f:
    # Write 1 to 125
    for line in first_lines:
        f.write(line + "\n")

    # Write 126 to max
    max_line = max(parsed_lines.keys())
    for i in range(126, max_line + 1):
        if i in parsed_lines:
            f.write(parsed_lines[i] + "\n")
        else:
            # this shouldn't happen but just in case
            f.write("\n")

print("Restored.")
