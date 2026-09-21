const canvas = document.querySelector("#waveform");
const context = canvas.getContext("2d");
const navItems = [...document.querySelectorAll(".nav-item")];
const modulePanel = document.querySelector("#modulePanel");
const panelBackdrop = document.querySelector("#panelBackdrop");
const modalBackdrop = document.querySelector("#modalBackdrop");
const panelTabs = [...document.querySelectorAll(".panel-tab")];
const moduleNames = { despesas: "Financeiro", agenda: "Agenda", tarefas: "Tarefas", integracoes: "Integrações" };

let state = "listening";
let frame = 0;
let audioContext;
let analyser;
let audioData;
let microphoneStream;
let microphoneReady = false;
let microphoneRequest;

function updateClock() {
  document.querySelector("#clock").textContent = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function startMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) return;
  if (microphoneRequest) return microphoneRequest;

  microphoneRequest = (async () => {
    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = .72;
      audioData = new Uint8Array(analyser.frequencyBinCount);
      audioContext.createMediaStreamSource(microphoneStream).connect(analyser);
      await resumeAudioContext();
      microphoneReady = true;
    } catch {
      microphoneReady = false;
    } finally {
      microphoneRequest = null;
    }
  })();

  return microphoneRequest;
}

async function resumeAudioContext() {
  if (audioContext?.state === "suspended") await audioContext.resume();
}

function stopMicrophone() {
  microphoneStream?.getTracks().forEach((track) => track.stop());
  audioContext?.close();
  microphoneStream = null;
  analyser = null;
  audioData = null;
  microphoneReady = false;
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = bounds.width * ratio;
  canvas.height = bounds.height * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function microphoneLevel(index, count) {
  if (!microphoneReady || !audioData) return null;
  const mirroredPosition = Math.abs(index - count / 2) / (count / 2);
  const bin = Math.floor((1 - mirroredPosition) * audioData.length * .7);
  return Math.min(1, Math.max(0, (audioData[bin] - 8) / 125));
}

function syntheticLevel(index, count, time) {
  const center = Math.abs(index - (count - 1) / 2) / (count / 2);
  const envelope = Math.pow(1 - center, .75);
  const noise = (Math.sin(index * 1.91 + time * 2.1) + Math.sin(index * .53 - time * 3.4)) * .15;

  if (state === "listening") return (.12 + Math.abs(Math.sin(time * 2.2 + index * .43)) * .38 + noise) * envelope;
  if (state === "processing") return (.16 + Math.abs(Math.sin(time * 4.8 - index * .24)) * .48) * (.35 + envelope * .65);
  return (.18 + Math.abs(Math.sin(time * 5.3 + index * .62) * Math.cos(time * 1.4 + index * .12)) * .72) * envelope;
}

function draw() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const centerY = height / 2;
  const count = Math.max(48, Math.floor(width / 9));
  const gap = width / count;
  const time = frame / 60;
  context.clearRect(0, 0, width, height);
  if (microphoneReady && analyser) analyser.getByteFrequencyData(audioData);

  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "rgba(54, 129, 151, 0)");
  gradient.addColorStop(.18, "rgba(102, 224, 247, .6)");
  gradient.addColorStop(.5, state === "processing" ? "#f15ac4" : "#c7f8ff");
  gradient.addColorStop(.82, "rgba(102, 224, 247, .6)");
  gradient.addColorStop(1, "rgba(54, 129, 151, 0)");
  context.strokeStyle = gradient;
  context.lineWidth = 1.35;
  context.lineCap = "round";

  for (let index = 0; index < count; index += 1) {
    const liveLevel = state === "listening" ? microphoneLevel(index, count) : null;
    const level = liveLevel ?? syntheticLevel(index, count, time);
    const barHeight = Math.max(2, Math.min(height * .84, level * height));
    const x = gap * index + gap / 2;
    context.globalAlpha = .48 + level * .7;
    context.beginPath();
    context.moveTo(x, centerY - barHeight / 2);
    context.lineTo(x, centerY + barHeight / 2);
    context.stroke();
  }

  context.globalAlpha = 1;
  frame += 1;
  requestAnimationFrame(draw);
}

function openPanel(module) {
  if (module === "inicio") {
    closePanel();
    return;
  }
  document.querySelector("#moduleTitle").textContent = moduleNames[module];
  document.querySelector("#moduleCode").textContent = `MOD // 0${Object.keys(moduleNames).indexOf(module) + 2}`;
  document.querySelector("#modalTitle").textContent = `Incluir ${moduleNames[module].toLowerCase()}`;
  modulePanel.classList.add("is-open");
  panelBackdrop.classList.add("is-open");
  document.body.classList.add("panel-open");
  modulePanel.setAttribute("aria-hidden", "false");
}

function closePanel() {
  modulePanel.classList.remove("is-open");
  panelBackdrop.classList.remove("is-open");
  document.body.classList.remove("panel-open");
  modulePanel.setAttribute("aria-hidden", "true");
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.module === "inicio"));
}

function openModal() {
  modalBackdrop.classList.add("is-open");
  modalBackdrop.setAttribute("aria-hidden", "false");
  setTimeout(() => modalBackdrop.querySelector("input")?.focus(), 250);
}

function closeModal() {
  modalBackdrop.classList.remove("is-open");
  modalBackdrop.setAttribute("aria-hidden", "true");
}

navItems.forEach((item) => item.addEventListener("click", () => {
  navItems.forEach((navItem) => navItem.classList.remove("is-active"));
  item.classList.add("is-active");
  item.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  openPanel(item.dataset.module);
}));

panelTabs.forEach((tab) => tab.addEventListener("click", () => {
  panelTabs.forEach((item) => item.classList.remove("is-active"));
  tab.classList.add("is-active");
}));

document.querySelector("#closePanel").addEventListener("click", closePanel);
panelBackdrop.addEventListener("click", closePanel);
document.querySelector("#addButton").addEventListener("click", openModal);
document.querySelector("#closeModal").addEventListener("click", closeModal);
document.querySelector("#cancelModal").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});
document.querySelector("#entryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  closeModal();
  event.currentTarget.reset();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (modalBackdrop.classList.contains("is-open")) closeModal();
  else closePanel();
});

async function unlockMicrophone() {
  await resumeAudioContext();
  if (!microphoneReady && !microphoneRequest) await startMicrophone();
}

document.addEventListener("pointerdown", unlockMicrophone, { once: true });
document.addEventListener("keydown", unlockMicrophone, { once: true });

window.addEventListener("resize", resizeCanvas);
window.visualViewport?.addEventListener("resize", resizeCanvas);
setInterval(updateClock, 1000);
updateClock();
document.body.dataset.state = state;
resizeCanvas();
draw();
startMicrophone();
