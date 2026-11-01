#!/bin/bash
# 3 sürüm × 4 ölçüm, sırayla (işlemci paylaşılmasın)
for v in eski once yeni; do
  case $v in eski) D=/tmp/eski/game/fetih/dist;; once) D=/tmp/once/game/fetih/dist;; yeni) D=/home/user/GAME-/game/fetih/dist;; esac
  DIST=$D timeout 600 node jank.cjs $v > /dev/null 2>&1
  DIST=$D timeout 600 node pan.cjs $v > /dev/null 2>&1
  DIST=$D MOB=1 timeout 600 node prof.cjs ${v}_mob 1 > /dev/null 2>&1
  DIST=$D MOB=1 timeout 600 node prof.cjs ${v}_mob0 0 > /dev/null 2>&1
  DIST=$D timeout 600 node cpuprof.cjs $v > /dev/null 2>&1
  echo "$v bitti"
done
