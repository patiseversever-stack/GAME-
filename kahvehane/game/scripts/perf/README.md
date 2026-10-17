# Görsel bozulma / GPU karo yoklaması

`probe.mjs` oyunu kendiliğinden oynatıp her kareyi ve efekt olaylarını kaydeder; `tiles.py` karelerde eksik karo (bütçe aşımında
koyu zemin rengiyle çizilen kare parçası) arar, varsa çıkış kodu 1 döner. Kısıtlı karo bütçesiyle (`--force-gpu-mem-available-mb=28`)
1'e 1 Pişti tohum 3: düzeltme öncesi 46 eksik karolu kare, sonrası 0. Kullanım ve ortam değişkenleri dosyaların başında.

```sh
NOLT=1 THROTTLE=1 CHROME_ARGS="--force-gpu-mem-available-mb=28" node scripts/perf/probe.mjs \
  "http://127.0.0.1:4190/?auto=1&game=pisti&mode=1v1&len=tek&seed=3&q=high" /tmp/kh-probe 80 412 915 0 1 1
python3 scripts/perf/tiles.py /tmp/kh-probe
```
