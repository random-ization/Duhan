with open("src/components/topik/WritingExamSession.tsx", "r") as f:
    content = f.read()

content = content.replace(", ZoomIn, X} from 'lucide-react';", "  ZoomIn,\n  X\n} from 'lucide-react';")

with open("src/components/topik/WritingExamSession.tsx", "w") as f:
    f.write(content)
