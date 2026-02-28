const QUESTIONS = [
  {
    q: "Question 1",
    choices: [
      { label: "Answer 1", img: "img/img1.jpg" },
      { label: "Answer 2", img: "img/img2.jpg" },
      { label: "Answer 3", img: "img/img3.jpg" },
      { label: "Answer 4", img: "img/img4.jpg" },
    ],
  },
  {
    q: "Question 2",
    choices: [
      { label: "Answer 2.1", img: "img/img1.jpg" },
      { label: "Answer 2.2", img: "img/img2.jpg" },
      { label: "Answer 2.3", img: "img/img3.jpg" },
      { label: "Answer 2.4", img: "img/img4.jpg" },
    ],
  },
  {
    q: "Question 3",
    choices: [
      { label: "Answer 3.1", img: "img/img1.jpg" },
      { label: "Answer 3.2", img: "img/img2.jpg" },
      { label: "Answer 3.3", img: "img/img3.jpg" },
      { label: "Answer 3.4", img: "img/img4.jpg" },
    ],
  },
];

const RESULT_COUNT = 5;

let idx = 0;
const answersPicked = [];

const $ = (sel) => document.querySelector(sel);
const titleEl = $("#title");
const questionText = $("#questionText");
const answersEl = $("#answers");
const backBtn = $("#backBtn");
const progressText = $("#progressText");
const meterFill = $("#meterFill");

function animateTitle(){
  // Entrance pop
  gsap.fromTo(
    titleEl,
    { y: -12, opacity: 0, rotate: -1.0, filter: "blur(6px)" },
    { y: 0, opacity: 1, rotate: 0, filter: "blur(0px)", duration: 0.65, ease: "power3.out" }
  );

  // Gentle float
  anime({
    targets: titleEl,
    translateY: [0, -1, 0],
    duration: 1200,
    easing: "easeInOutSine",
    loop: true
  });
}

function render(){
  const total = QUESTIONS.length;

  backBtn.style.visibility = idx === 0 ? "hidden" : "visible";
  progressText.textContent = `Question ${idx + 1} of ${total}`;

  // meter (snaps nicely)
  meterFill.style.width = `${Math.round(((idx + 1) / total) * 100)}%`;

  questionText.textContent = QUESTIONS[idx].q;

  answersEl.innerHTML = "";
  QUESTIONS[idx].choices.forEach((ch, cIndex) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answerBtn";
    btn.setAttribute("role", "listitem");

    // TEXT ONLY (no separate title/meta)
    btn.innerHTML = `<div class="ansText">${escapeHtml(ch.label)}</div>`;

    btn.addEventListener("click", (ev) => handlePick(ev, btn, cIndex));
    answersEl.appendChild(btn);
  });
}

let locked = false;

function handlePick(ev, btn, cIndex){
  if (locked) return;
  locked = true;

  answersPicked[idx] = cIndex;

  const rect = btn.getBoundingClientRect();
  const rx = ((ev.clientX - rect.left) / rect.width) * 100;
  const ry = ((ev.clientY - rect.top) / rect.height) * 100;
  btn.style.setProperty("--rx", `${rx}%`);
  btn.style.setProperty("--ry", `${ry}%`);

  document.querySelectorAll(".answerBtn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");

  btn.classList.remove("radar");
  void btn.offsetWidth;
  btn.classList.add("radar");

  anime({
    targets: btn,
    scale: [1, 1.02, 1],
    duration: 320,
    easing: "easeOutQuad",
  });

  setTimeout(() => {
    next();
    locked = false;
  }, 420);
}

function next(){
  if (idx < QUESTIONS.length - 1){
    idx++;
    render();
    return;
  }
  finish();
}

function back(){
  if (idx === 0) return;
  idx--;
  render();
}

function finish(){
  const chosen = randInt(1, RESULT_COUNT);

  const percents = [];
  for (let i = 1; i <= RESULT_COUNT; i++){
    const p = randInt(3, 167) + (Math.random() < 0.25 ? randInt(40, 120) : 0);
    percents.push(p);
  }

  const payload = {
    chosen,
    percents,
    ts: Date.now(),
    answersPicked,
  };

  sessionStorage.setItem("LLQ_RESULTS", JSON.stringify(payload));
  window.location.href = `results/result${chosen}.html`;
}

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

backBtn.addEventListener("click", back);
animateTitle();
render();
