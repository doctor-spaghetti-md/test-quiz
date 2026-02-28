const $ = (sel, root=document) => root.querySelector(sel);

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* EDIT ME */
const QUIZ = [
  {
    label: "QUESTION 1",
    text: "Question 1",
    answers: [
      { img:"./img/img1.jpg", blurb:"Answer 1 blurb text." },
      { img:"./img/img2.jpg", blurb:"Answer 2 blurb text." },
      { img:"./img/img3.jpg", blurb:"Answer 3 blurb text." },
      { img:"./img/img4.jpg", blurb:"Answer 4 blurb text." }
    ]
  },
  {
    label: "QUESTION 2",
    text: "Question 2",
    answers: [
      { img:"./img/img1.jpg", blurb:"Answer 2.1 blurb text." },
      { img:"./img/img2.jpg", blurb:"Answer 2.2 blurb text." },
      { img:"./img/img3.jpg", blurb:"Answer 2.3 blurb text." },
      { img:"./img/img4.jpg", blurb:"Answer 2.4 blurb text." }
    ]
  },
  {
    label: "QUESTION 3",
    text: "Question 3",
    answers: [
      { img:"./img/img2.jpg", blurb:"Answer 3.1 blurb text." },
      { img:"./img/img3.jpg", blurb:"Answer 3.2 blurb text." },
      { img:"./img/img4.jpg", blurb:"Answer 3.3 blurb text." },
      { img:"./img/img1.jpg", blurb:"Answer 3.4 blurb text." }
    ]
  }
];

let qIndex = 0;
const history = [];

/* Title animation */
function animateTitle(){
  const title = $("#pageTitle");
  if (!title) return;

  if (window.gsap){
    window.gsap.to(title, { scale: 1.06, duration: 0.9, yoyo: true, repeat: -1, ease: "sine.inOut" });
  } else {
    title.animate([{ transform:"scale(1)" },{ transform:"scale(1.06)" },{ transform:"scale(1)" }],
      { duration: 1800, iterations: Infinity, easing: "ease-in-out" });
  }

  if (window.anime){
    window.anime({
      targets: ".rainbowWord",
      filter: [
        { value: "saturate(1.35) contrast(1.08)", duration: 0 },
        { value: "saturate(1.60) contrast(1.12)", duration: 1100 },
        { value: "saturate(1.35) contrast(1.08)", duration: 1100 }
      ],
      easing: "easeInOutSine",
      loop: true
    });
  }
}

function animatePanelIn(){
  const panel = $("#quizPanel");
  if (!panel) return;
  panel.classList.remove("animate__animated","animate__fadeInUp");
  void panel.offsetWidth;
  panel.classList.add("animate__animated","animate__fadeInUp");
}

function renderQuestion(){
  const q = QUIZ[qIndex];
  const total = QUIZ.length;

  $("#qPill") && ($("#qPill").textContent = `Q: ${qIndex + 1} / ${total}`);
  $("#qLabel") && ($("#qLabel").textContent = q.label || `QUESTION ${qIndex + 1}`);
  $("#qTitle") && ($("#qTitle").textContent = q.text || `Question ${qIndex + 1}`);

  const backBtn = $("#backBtn");
  if (backBtn){
    const disabled = (qIndex === 0);
    backBtn.disabled = disabled;
    backBtn.setAttribute("aria-disabled", String(disabled));
  }

  const grid = $("#answersGrid");
  if (!grid) return;
  grid.innerHTML = "";

  q.answers.forEach((a, i) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "answerCard";
    card.setAttribute("aria-label", `Answer choice ${i+1}`);

    const src = a.img || "./img/img1.jpg";
    const blurb = a.blurb || `Answer ${i+1} blurb text.`;

    card.innerHTML = `
      <div class="answerImgWrap">
        <img class="answerImg" src="${escapeHtml(src)}" alt="Stock photo choice" loading="lazy" />
      </div>
      <div class="answerBlurb">${escapeHtml(blurb)}</div>
    `;

    card.addEventListener("click", () => {
      history[qIndex] = i;
      card.classList.add("picked");
      setTimeout(() => card.classList.remove("picked"), 170);
      nextQuestion();
    });

    grid.appendChild(card);
  });

  animatePanelIn();
}

function nextQuestion(){
  if (qIndex < QUIZ.length - 1){
    qIndex++;
    renderQuestion();
  } else {
    goToRandomResult();
  }
}

function prevQuestion(){
  if (qIndex === 0) return;
  qIndex--;
  renderQuestion();
}

function goToRandomResult(){
  const picked = 1 + Math.floor(Math.random() * 5);
  const seed = Math.floor(Math.random() * 999999);
  const p = encodeURIComponent(history.join(","));
  window.location.href = `./results/result${picked}.html?picked=${picked}&seed=${seed}&p=${p}`;
}

/* EKG */
function initBpmAndEkg(){
  const pill = $("#bpmPill");
  const ekg = $("#ekgLine");
  const scan = $(".ekgScan");
  if (!pill || !ekg) return;

  const HEARTBEAT_D =
`M0 75
 L90 75 L110 75
 L125 55 L135 95 L145 30 L160 75
 L220 75 L250 75
 L265 58 L275 92 L290 38 L305 75
 L390 75 L420 75
 L435 62 L445 90 L460 45 L475 75
 L560 75 L590 75
 L605 60 L615 92 L630 36 L645 75
 L800 75`;
  const FLATLINE_D = "M0 75 H800";

  let bpm = 72;
  let beatsUntilFlatline = 8 + Math.floor(Math.random() * 8);
  let flatTicksLeft = 0;

  function setFlatline(on){
    ekg.setAttribute("d", on ? FLATLINE_D : HEARTBEAT_D);
    ekg.style.animationPlayState = on ? "paused" : "running";
    if (on){
      ekg.style.strokeDashoffset = "0";
      if (scan) scan.style.animationPlayState = "paused";
    } else {
      ekg.style.strokeDashoffset = "";
      if (scan) scan.style.animationPlayState = "running";
    }
  }

  setFlatline(false);

  setInterval(() => {
    if (flatTicksLeft > 0){
      flatTicksLeft--;
      bpm = Math.max(0, bpm - 10);
      pill.textContent = `BPM: ${bpm}`;
      if (flatTicksLeft === 0){
        setFlatline(false);
        bpm = 66 + Math.floor(Math.random() * 10);
        pill.textContent = `BPM: ${bpm}`;
        beatsUntilFlatline = 8 + Math.floor(Math.random() * 10);
      }
      return;
    }

    const spike = Math.random() < 0.10 ? (6 + Math.floor(Math.random() * 10)) : 0;
    const drift = (Math.random() * 4 - 2);
    bpm = Math.max(54, Math.min(140, Math.round(bpm + drift + spike)));
    pill.textContent = `BPM: ${bpm}`;

    beatsUntilFlatline--;
    if (beatsUntilFlatline <= 0){
      setFlatline(true);
      bpm = 24;
      pill.textContent = `BPM: ${bpm}`;
      flatTicksLeft = 5 + Math.floor(Math.random() * 5);
    }
  }, 650);
}

/* Love Wave */
function initLoveWave(){
  const wrap = $("#loveBars");
  if (!wrap) return;
  const bars = Array.from(wrap.querySelectorAll(".loveBar"));
  if (!bars.length) return;

  function tick(){
    bars.forEach((b, idx) => {
      const wobble = Math.sin((Date.now()/420) + idx) * 10;
      const h = 18 + Math.floor(Math.random() * 72) + wobble;
      b.style.height = Math.max(10, Math.min(96, h)) + "%";
    });
  }
  tick();
  setInterval(tick, 650);
}

document.addEventListener("DOMContentLoaded", () => {
  animateTitle();
  $("#backBtn")?.addEventListener("click", prevQuestion);
  initBpmAndEkg();
  initLoveWave();
  renderQuestion();
});