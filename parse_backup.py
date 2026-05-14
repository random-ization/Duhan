import re

with open("src/components/topik/WritingExamSession_backup.txt", "r") as f:
    lines = f.readlines()

parsed_lines = {}
for line in lines:
    match = re.match(r'^(\d+)[:-](.*)', line)
    if match:
        line_num = int(match.group(1))
        content = match.group(2)
        parsed_lines[line_num] = content

# Check how many lines we have
print(f"Parsed {len(parsed_lines)} lines")
print(f"Min line: {min(parsed_lines.keys()) if parsed_lines else 'N/A'}")
print(f"Max line: {max(parsed_lines.keys()) if parsed_lines else 'N/A'}")
