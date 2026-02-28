// js/sky.js
(function(){
  function initSkyTrails(canvasId = "skyCanvas", opts = {}){
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const EMOJIS = opts.emojis || ["🛩️","✈️","🛫","🛬","🚁","🛸"];
    const planeCount = opts.planeCount ?? 10;

    const TRAIL_MAX = opts.trailMax ?? 320;
    const SPEED_MIN = opts.speedMin ?? 0.8;
    const SPEED_MAX = opts.speedMax ?? 1.8;

    let W = 0, H = 0;

    function resize(){
      W = Math.floor(window.innerWidth);
      H = Math.floor(window.innerHeight);
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    window.addEventListener("resize", resize, { passive: true });
    resize();

    function rand(min, max){ return Math.random() * (max - min) + min; }
    function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

    // Catmull-Rom interpolation
    function catmullRom(p0, p1, p2, p3, t){
      const t2 = t * t;
      const t3 = t2 * t;
      return {
        x: 0.5 * (
          (2*p1.x) +
          (-p0.x + p2.x)*t +
          (2*p0.x - 5*p1.x + 4*p2.x - p3.x)*t2 +
          (-p0.x + 3*p1.x - 3*p2.x + p3.x)*t3
        ),
        y: 0.5 * (
          (2*p1.y) +
          (-p0.y + p2.y)*t +
          (2*p0.y - 5*p1.y + 4*p2.y - p3.y)*t2 +
          (-p0.y + 3*p1.y - 3*p2.y + p3.y)*t3
        )
      };
    }

    function randomPoint(){
      // allow off-screen so paths enter/exit
      return { x: rand(-120, W + 120), y: rand(-120, H + 120) };
    }

    function hueAt(i, n, shift){
      const base = (i / Math.max(1, n-1)) * 330;
      return (base + shift) % 360;
    }

    const planes = Array.from({ length: planeCount }, () => {
      const p0 = randomPoint();
      const p1 = randomPoint();
      const p2 = randomPoint();
      const p3 = randomPoint();

      return {
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        size: rand(22, 44),
        speed: rand(SPEED_MIN, SPEED_MAX),
        p0, p1, p2, p3,
        t: rand(0, 1),
        hueShift: rand(0, 360),
        trail: [],
        alpha: rand(0.70, 0.95)
      };
    });

    function stepPlane(pl){
      pl.t += 0.0046 * pl.speed;

      if (pl.t >= 1){
        pl.t = 0;

        pl.p0 = pl.p1;
        pl.p1 = pl.p2;
        pl.p2 = pl.p3;
        pl.p3 = randomPoint();

        if (Math.random() < 0.25){
          pl.emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        }
        pl.size = clamp(pl.size + rand(-3, 3), 20, 48);
        pl.speed = clamp(pl.speed + rand(-0.25, 0.25), SPEED_MIN, SPEED_MAX);
      }

      const pos = catmullRom(pl.p0, pl.p1, pl.p2, pl.p3, pl.t);

      pl.trail.push({ x: pos.x, y: pos.y });
      if (pl.trail.length > TRAIL_MAX) pl.trail.shift();

      return pos;
    }

    function drawTrail(pl){
      const pts = pl.trail;
      if (pts.length < 2) return;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // two-pass: soft underglow + crisp neon
      for (let pass = 0; pass < 2; pass++){
        const width = pass === 0 ? 10 : 4;

        for (let i = 1; i < pts.length; i++){
          const a = pts[i-1], b = pts[i];
          const fade = i / pts.length;
          const hue = hueAt(i, pts.length, pl.hueShift);
          const alpha = (pass === 0 ? 0.10 : 0.55) * pl.alpha * fade;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);

          ctx.lineWidth = width;
          ctx.strokeStyle = `hsla(${hue}, 100%, ${pass === 0 ? 62 : 55}%, ${alpha})`;
          ctx.shadowBlur = pass === 0 ? 18 : 10;
          ctx.shadowColor = `hsla(${hue}, 100%, 60%, ${alpha})`;
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;
    }

    function drawPlane(pl, pos){
      ctx.save();
      ctx.globalAlpha = pl.alpha;

      let angle = 0;
      const pts = pl.trail;
      if (pts.length >= 2){
        const a = pts[pts.length - 2];
        const b = pts[pts.length - 1];
        angle = Math.atan2(b.y - a.y, b.x - a.x);
      }

      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);

      ctx.font = `${pl.size}px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.shadowBlur = 18;
      ctx.shadowColor = `hsla(${(pl.hueShift+40)%360}, 100%, 60%, 0.55)`;

      ctx.fillText(pl.emoji, 0, 0);
      ctx.restore();
    }

    function tick(){
      ctx.clearRect(0, 0, W, H);

      for (const pl of planes){
        stepPlane(pl);
        drawTrail(pl);
      }
      for (const pl of planes){
        const pos = pl.trail[pl.trail.length - 1];
        if (pos) drawPlane(pl, pos);
      }

      requestAnimationFrame(tick);
    }

    tick();
  }

  window.initSkyTrails = initSkyTrails;

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("skyCanvas")){
      initSkyTrails("skyCanvas", { planeCount: 11, trailMax: 360 });
    }
  });
})();