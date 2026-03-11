#!/usr/bin/env python3
"""Compatibility wrapper for legacy i18n compare command.

Delegates to scripts/i18n-scan.mjs so existing npm scripts keep working.
"""

from __future__ import annotations

import subprocess
import sys


def main() -> int:
    cmd = ["node", "scripts/i18n-scan.mjs", *sys.argv[1:]]
    return subprocess.run(cmd, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
