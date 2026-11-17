const canvas = document.getElementById('snow');
const ctx = canvas.getContext('2d');

const FLAKE_COUNT = 40;
const MAX_ANGLE = 45;
const MARGIN = 30;

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const rand = (min, max) => Math.random() * (max - min) + min;

let width = 0;
let height = 0;
let flakes = [];
let targetAngle = 0;
let currentAngle = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function makeFlake() {
  const depth = rand(0.3, 1);
  return {
    x: rand(-MARGIN, width + MARGIN),
    y: rand(-MARGIN, height + MARGIN),
    depth,
    size: 2 + depth * 9,
    speed: 13 + depth * 55,
    opacity: 0.25 + depth * 0.5,
    swayOffset: rand(0, Math.PI * 2),
    swaySpeed: rand(0.4, 1.2),
    spin: rand(-0.6, 0.6),
    rotation: rand(0, Math.PI * 2),
  };
}

function drawFlake(flake) {
  ctx.globalAlpha = flake.opacity;

  if (flake.size < 6) {
    ctx.beginPath();
    ctx.arc(flake.x, flake.y, flake.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const r = flake.size;
  ctx.save();
  ctx.translate(flake.x, flake.y);
  ctx.rotate(flake.rotation);
  ctx.lineWidth = Math.max(1, r / 7);
  ctx.beginPath();
  for (let arm = 0; arm < 6; arm++) {
    ctx.rotate(Math.PI / 3);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * 0.6);
    ctx.lineTo(-r * 0.25, -r * 0.85);
    ctx.moveTo(0, -r * 0.6);
    ctx.lineTo(r * 0.25, -r * 0.85);
  }
  ctx.stroke();
  ctx.restore();
}

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  currentAngle += (targetAngle - currentAngle) * Math.min(1, dt * 3);
  const slant = Math.tan((currentAngle * Math.PI) / 180);

  ctx.clearRect(0, 0, width, height);

  for (const flake of flakes) {
    const sway = Math.sin(now / 1000 * flake.swaySpeed + flake.swayOffset) * 12;

    flake.y += flake.speed * dt;
    flake.x += (flake.speed * slant + sway * flake.depth) * dt;
    flake.rotation += flake.spin * dt;
    if (flake.y > height + MARGIN) {
      flake.y = -MARGIN;
      flake.x = rand(-MARGIN, width + MARGIN);
    }
    if (flake.x > width + MARGIN) flake.x = -MARGIN;
    if (flake.x < -MARGIN) flake.x = width + MARGIN;

    drawFlake(flake);
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}

// tilt
function handleTilt(e) {
  if (e.gamma == null) return;
  const isPortrait = !screen.orientation || screen.orientation.angle % 180 === 0;
  const gamma = isPortrait ? e.gamma : 0;
  targetAngle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, gamma));
}

// start
if (!prefersReducedMotion) {
  resize();
  flakes = Array.from({ length: FLAKE_COUNT }, makeFlake);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';

  window.addEventListener('resize', () => {
    resize();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
  });

  requestAnimationFrame(frame);

  if ('DeviceOrientationEvent' in window) {
    window.addEventListener('deviceorientation', handleTilt);

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      document.addEventListener(
        'click',
        () => {
          DeviceOrientationEvent.requestPermission().catch(() => {
          });
        },
        { once: true }
      );
    }
  }
}