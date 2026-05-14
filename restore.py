import re

# Read first part
with open("src/components/topik/WritingExamSession.tsx", "r") as f:
    orig_lines = f.read().splitlines()

# We need the user's version of the first 150 lines. Let's look at the first chat turn:
# The user's version had KT imported. Let's check my chat history.
