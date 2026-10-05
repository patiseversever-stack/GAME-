#!/usr/bin/env bash
# Site klasörünü (aksoy-site/) Vercel'in kurduğu varsayılan dala da kopyalar.
# Varsayılan daldaki diğer dosyalara (oyun projesi) dokunmaz.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
DEF=claude/jolly-franklin-9mnytx
WT=/tmp/aksoy-defbr
git fetch -q origin "$DEF"
rm -rf "$WT"; git worktree prune
git worktree add -q "$WT" "origin/$DEF"
( cd "$WT" && git checkout -q -B "$DEF" "origin/$DEF" && rm -rf aksoy-site )
git archive HEAD aksoy-site | tar -x -C "$WT"
cd "$WT"
git add -A aksoy-site
if git diff --cached --quiet; then echo "Değişiklik yok"; else
  git commit -q -m "aksoy-site: $(cd - >/dev/null; git log -1 --format=%s)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01WzrkaBK6SRZNp3GfY6DdeC"
  git push -q origin "$DEF"
  git log --oneline -1
fi
cd - >/dev/null
git worktree remove --force "$WT"
