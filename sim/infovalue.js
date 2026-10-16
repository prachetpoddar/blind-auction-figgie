const fs=require("fs");
const SEED = +(process.env.SEED || 1);
Math.random = (() => { let a = SEED >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();

let src=fs.readFileSync(require("path").join(__dirname, "../src/logic.js"),"utf8").split("\n").slice(0,144).join("\n");
src+=`
const res={};
for(let r=0;r<20000;r++){const cfg=CONFIGS[Math.floor(rnd()*NC)];const deck=shuffle(cfg.c.flatMap((x,s)=>Array(x).fill(s)));const h=[0,0,0,0];deck.slice(0,10).forEach(s=>h[s]++);
 const w=norm(handLik(h)), base=goalProbs(w)[cfg.goal]>=Math.max(...goalProbs(w))-1e-12?1:0, b0=Math.max(...goalProbs(w));
 for(const n of [1,3,5,10,20]){ const v=[0,0,0,0]; deck.slice(10,10+n).forEach(s=>v[s]++);
   const w2=norm(w.map((x,i)=>x*mvh(CONFIGS[i].c.map((c,s)=>c-h[s]),v))); const gp=goalProbs(w2);
   (res[n]=res[n]||[]).push(100*(Math.max(...gp)-b0)); }
 const X=Math.floor(rnd()*4); (res.ans=res.ans||[]).push(voiPP(w,X)); }
for(const k in res) console.log(k, (res[k].reduce((a,b)=>a+b,0)/res[k].length).toFixed(2));`;
new Function("console",src)(console);
