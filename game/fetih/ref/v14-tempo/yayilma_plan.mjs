// Yayılma planı: mod ve harita başına tur sayısı ve tur başına dağıtılan il (expansionPlan). node ref/v14-tempo/yayilma_plan.mjs
await import('../../test/kanca.mjs');
const { expansionPlan, expansionRoundsFor } = await import('../../src/game/match.js');
for (const [lbl,size,n] of [['1v1 hızlı',12,2],['1v1 karadeniz',18,2],['3lü hızlı',18,3],['4lü/eşli hızlı',24,4],['1v1 Türkiye',81,2],['3lü Türkiye',81,3],['4lü Türkiye',81,4]]) {
  let free = size - n; const T = expansionRoundsFor(free); const rows=[];
  for (let r=1; free>0; r++){ const p = expansionPlan(free,n,Math.max(1,T-r+1)); const tot = r-1+p.length; rows.push(`${p[0].join('+')}(${tot})`); free -= p[0].reduce((a,b)=>a+b,0); }
  console.log(lbl.padEnd(16), rows.length,'tur:', rows.join('  '));
}
