const $ = (sel, root=document) => root.querySelector(sel);

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

function initResults(){
  const root = $("#resultsApp");
  if (!root) return;

  const resultId = Number(root.getAttribute("data-result")) || 1;
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get("seed")) || Math.floor(Math.random()*999999);
  const picked = Number(params.get("picked")) || resultId;

  // deterministic-ish RNG
  let s = seed >>> 0;
  function rng(){
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }
  function rint(a,b){ return Math.floor(a + rng()*(b-a+1)); }

  const titleEl = $("#resultTitle");
  const diagEl  = $("#diagLine");
  const stampEl = $("#timeStamp");

  if (titleEl) titleEl.textContent = `Result ${resultId}`;
  if (diagEl) diagEl.textContent = `DIAG CODE: LL-${picked} / CONFIDENCE: ${rint(7,183)}% / TOTAL: ${rint(130,520)}%`;
  if (stampEl) stampEl.textContent = `PRINTED: ${new Date().toLocaleString()}`;

  // other results links
  const other = $("#otherResults");
  if (other){
    other.innerHTML = "";
    for (let i=1; i<=5; i++){
      const a = document.createElement("a");
      a.className = "resultBtn" + (i===resultId ? " isHere" : "");
      a.href = `./result${i}.html?picked=${picked}&seed=${seed}`;
      a.textContent = `Result ${i}`;
      other.appendChild(a);
    }
  }

  function setupCanvas(id){
    const c = document.getElementById(id);
    if (!c) return null;
    const wrap = c.parentElement;
    const W = Math.max(1, Math.floor(wrap.clientWidth));
    const H = Math.max(1, Math.floor(wrap.clientHeight));
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    c.width = Math.floor(W*dpr);
    c.height = Math.floor(H*dpr);
    c.style.width = W+"px";
    c.style.height = H+"px";
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return {c,ctx,W,H};
  }

  function neonText(ctx, txt, x, y){
    ctx.save();
    ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillStyle = "rgba(255,247,255,0.92)";
    ctx.shadowColor = "rgba(255,0,184,0.30)";
    ctx.shadowBlur = 14;
    ctx.fillText(txt, x, y);
    ctx.restore();
  }

  function rainbowStroke(ctx){
    const g = ctx.createLinearGradient(0,0,ctx.canvas.width,0);
    g.addColorStop(0.00,"rgba(255,0,184,0.95)");
    g.addColorStop(0.22,"rgba(255,138,0,0.92)");
    g.addColorStop(0.42,"rgba(182,255,46,0.88)");
    g.addColorStop(0.62,"rgba(40,215,255,0.92)");
    g.addColorStop(0.82,"rgba(139,91,255,0.92)");
    g.addColorStop(1.00,"rgba(255,0,184,0.95)");
    return g;
  }

  // canvases
  const radar = setupCanvas("radarCanvas");
  const pie   = setupCanvas("pieCanvas");
  const ekg   = setupCanvas("ekgMiniCanvas");
  const spark = setupCanvas("sparkCanvas");

  // stable nonsense values
  const pieRaw = Array.from({length:5}, () => rint(5,220));
  const pieTotal = pieRaw.reduce((a,b)=>a+b,0);
  const pieSlices = pieRaw.map(v=>v/pieTotal);

  const blips = Array.from({length:5}, (_,i)=>({
    isYou: (i+1)===resultId,
    ang: rng()*Math.PI*2,
    rr: 0.18 + rng()*0.85,
    wob: 0.6 + rng()*1.4
  }));

  // EKG path points (scrolling)
  const ekgPts = [];
  const ekgLen = 220;
  for (let i=0;i<ekgLen;i++){
    ekgPts.push({
      spike: rng() < 0.14,
      amp: rint(14,44),
      wob: rng()*10-5
    });
  }
  let ekgPhase = 0;

  // telemetry lines drift
  let sparkPhase = 0;

  function drawRadar(t){
    if (!radar) return;
    const {ctx,W,H} = radar;
    ctx.clearRect(0,0,W,H);

    // background glaze
    ctx.fillStyle="rgba(0,0,0,0.16)";
    ctx.fillRect(0,0,W,H);

    const cx=W/2, cy=H/2;
    const rMax=Math.min(W,H)*0.42;

    // rings
    ctx.lineWidth=2;
    for (let k=1;k<=4;k++){
      ctx.strokeStyle=`rgba(40,215,255,${0.10 + k*0.03})`;
      ctx.beginPath(); ctx.arc(cx,cy,rMax*(k/4),0,Math.PI*2); ctx.stroke();
    }

    // crosshair
    ctx.strokeStyle="rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(cx,14); ctx.lineTo(cx,H-14);
    ctx.moveTo(14,cy); ctx.lineTo(W-14,cy);
    ctx.stroke();

    // sweep (animated)
    const sweep = (t*0.9) % (Math.PI*2);
    const cone = 0.22;

    const g = ctx.createRadialGradient(cx,cy,0,cx,cy,rMax);
    g.addColorStop(0,"rgba(255,0,184,0.10)");
    g.addColorStop(1,"rgba(255,0,184,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx,cy,rMax,sweep-cone,sweep+cone);
    ctx.lineTo(cx,cy); ctx.closePath(); ctx.fill();

    // sweep line
    ctx.strokeStyle="rgba(255,0,184,0.70)";
    ctx.shadowColor="rgba(255,0,184,0.30)";
    ctx.shadowBlur=18;
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(sweep)*rMax, cy+Math.sin(sweep)*rMax);
    ctx.stroke();
    ctx.shadowBlur=0;

    // blips (subtle motion)
    blips.forEach((b,i)=>{
      const rr = rMax * b.rr * (1 + Math.sin(t*b.wob + i)*0.02);
      const ang = b.ang + Math.sin(t*0.7 + i)*0.03;
      const x = cx + Math.cos(ang)*rr;
      const y = cy + Math.sin(ang)*rr;

      const col = b.isYou ? "255,0,184" : (i%2===0 ? "40,215,255" : "182,255,46");

      ctx.fillStyle=`rgba(${col},0.92)`;
      ctx.beginPath(); ctx.arc(x,y,b.isYou?4.4:3.2,0,Math.PI*2); ctx.fill();

      ctx.fillStyle=`rgba(${col},0.14)`;
      ctx.beginPath(); ctx.arc(x,y,b.isYou?16:11,0,Math.PI*2); ctx.fill();
    });

    neonText(ctx,"PLANE RADAR DIAGNOSTICS",12,18);
  }

  function drawPie(t){
    if (!pie) return;
    const {ctx,W,H} = pie;
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle="rgba(0,0,0,0.16)";
    ctx.fillRect(0,0,W,H);

    const cx=W/2, cy=H/2;
    const baseR=Math.min(W,H)*0.34;
    const pulse = 1 + Math.sin(t*1.1)*0.03;
    const r = baseR * pulse;

    const colors=[
      "rgba(255,0,184,0.88)",
      "rgba(40,215,255,0.88)",
      "rgba(182,255,46,0.84)",
      "rgba(255,232,74,0.84)",
      "rgba(139,91,255,0.88)"
    ];

    // slow rotate so it feels alive
    let a0 = -Math.PI/2 + Math.sin(t*0.35)*0.25;

    for (let i=0;i<pieSlices.length;i++){
      const a1 = a0 + pieSlices[i]*Math.PI*2;

      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,a0,a1);
      ctx.closePath();

      ctx.fillStyle = colors[i%colors.length];
      ctx.shadowColor = "rgba(255,0,184,0.18)";
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle="rgba(255,255,255,0.12)";
      ctx.lineWidth=2;
      ctx.stroke();

      a0=a1;
    }

    // ring glow
    ctx.strokeStyle = rainbowStroke(ctx);
    ctx.lineWidth = 3;
    ctx.shadowColor="rgba(40,215,255,0.18)";
    ctx.shadowBlur=18;
    ctx.beginPath(); ctx.arc(cx,cy,r+6,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0;

    neonText(ctx,"AFFECT DISTRIBUTION (UNVERIFIED)",12,18);
    ctx.font="12px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillStyle="rgba(255,247,255,0.88)";
    ctx.fillText(`TOTAL: ${rint(130,520)}%`, 12, H-14);
  }

  function drawEkg(t){
    if (!ekg) return;
    const {ctx,W,H} = ekg;
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle="rgba(0,0,0,0.16)";
    ctx.fillRect(0,0,W,H);

    const mid = H*0.55;

    // scrolling index
    ekgPhase += 0.9; // speed
    const offset = ekgPhase;

    ctx.lineWidth=4;
    ctx.strokeStyle = rainbowStroke(ctx);
    ctx.shadowColor="rgba(255,0,184,0.25)";
    ctx.shadowBlur=18;

    ctx.beginPath();
    ctx.moveTo(0, mid);

    let x = 0;
    const step = 10;
    const flatWindow = Math.floor((Math.sin(t*0.35)+1)*0.5 * 120); // pretend flatline window shifts
    const flatStart = 90 + flatWindow;

    for (let i=0; x<=W; i++){
      const p = ekgPts[(Math.floor(i + offset/step)) % ekgPts.length];

      // “flatline zone” in the middle for drama
      if (x > flatStart && x < flatStart + 110){
        ctx.lineTo(x, mid);
        x += step;
        continue;
      }

      if (p.spike){
        ctx.lineTo(x+6, mid);
        ctx.lineTo(x+10, mid - p.amp);
        ctx.lineTo(x+14, mid + (p.amp*0.55));
        ctx.lineTo(x+20, mid - (p.amp*0.35));
        ctx.lineTo(x+28, mid);
        x += 30;
      } else {
        ctx.lineTo(x+step, mid + (Math.sin(t*2 + i*0.9)*2) + p.wob*0.15);
        x += step;
      }
    }

    ctx.stroke();
    ctx.shadowBlur=0;

    // scan line
    const scanX = ((t*180) % (W+80)) - 40;
    ctx.fillStyle="rgba(255,255,255,0.10)";
    ctx.fillRect(scanX, 0, 60, H);

    neonText(ctx,"CARDIAC TRACE (DRAMATIZED)",12,18);
  }

  function drawSpark(t){
    if (!spark) return;
    const {ctx,W,H} = spark;
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle="rgba(0,0,0,0.16)";
    ctx.fillRect(0,0,W,H);

    sparkPhase += 0.6;

    function line(yBase, color, speed){
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = color.replace("0.88","0.20").replace("0.84","0.18");
      ctx.shadowBlur = 14;

      ctx.beginPath();
      let x = 0;
      const phase = (t*speed) + sparkPhase*0.01;

      while (x <= W){
        const y = yBase
          + Math.sin(phase + x*0.02)*6
          + Math.sin(phase*1.7 + x*0.011)*4
          + (Math.sin(phase*0.8 + x*0.06) * 2);

        ctx.lineTo(x, clamp(y, 10, H-10));
        x += 12;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    line(H*0.30, "rgba(40,215,255,0.88)", 1.0);
    line(H*0.55, "rgba(255,0,184,0.88)", 1.2);
    line(H*0.78, "rgba(182,255,46,0.84)", 0.9);

    neonText(ctx,`MOOD: ${rint(-20,140)}%`, 12, 18);
    neonText(ctx,`WILLPOWER: ${rint(0,999)}mg`, 12, 36);
    neonText(ctx,`CUTE: ${rint(5,300)} units`, 12, 54);
  }

  let start = performance.now();
  function loop(now){
    const t = (now - start) / 1000;

    drawRadar(t);
    drawPie(t);
    drawEkg(t);
    drawSpark(t);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // resize handling
  window.addEventListener("resize", () => {
    // just reload for simplicity (keeps it stable and avoids partial resizes)
    // if you’d rather not reload, I can make a proper resize recalculation.
    location.reload();
  }, { once: true });
}

document.addEventListener("DOMContentLoaded", initResults);