import Snowflakes from 'magic-snowflakes';

const clock = document.getElementById('clock');

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  clock.dateTime = now.toISOString();
}

updateClock();
setInterval(updateClock, 1000);

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// stars
const STAR_COUNT = 90;
const starsContainer = document.getElementById('stars');
const rand = (min, max) => Math.random() * (max - min) + min;
for (let i = 0; i < STAR_COUNT; i++) {
  const star = document.createElement('span');
  star.className = 'star';
  star.style.left = `${rand(0, 100)}%`;
  star.style.top = `${rand(0, 65)}%`;
  const size = rand(1, 3);
  star.style.width = `${size}px`;
  star.style.height = `${size}px`;
  star.style.setProperty('--max-opacity', rand(0.4, 1).toFixed(2));
  star.style.animationDuration = `${rand(2, 6)}s`;
  star.style.animationDelay = `${rand(0, 6)}s`;
  starsContainer.appendChild(star);
}

const snowLayer = document.getElementById('snow-layer');

if (!prefersReducedMotion) {
  new Snowflakes({
    container: snowLayer,
    color: '#ffffff',
    count: 175,
    minOpacity: 0.3,
    maxOpacity: 0.9,
    minSize: 8,
    maxSize: 22,
    speed: 0.8,
    wind: true,
    rotation: true,
  });
}

const MAX_TILT = 30;
let targetAngle = 0;
let currentAngle = 0;
let tiltRunning = false;

function tiltLoop() {
  currentAngle += (targetAngle - currentAngle) * 0.08;
  snowLayer.style.transform = `rotate(${-currentAngle}deg)`;
  requestAnimationFrame(tiltLoop);
}

function handleTilt(e) {
  if (e.gamma == null) return;
  const isPortrait = !screen.orientation || screen.orientation.angle % 180 === 0;
  const gamma = isPortrait ? e.gamma : 0;
  targetAngle = Math.max(-MAX_TILT, Math.min(MAX_TILT, gamma));
  if (!tiltRunning) {
    tiltRunning = true;
    requestAnimationFrame(tiltLoop);
  }
}

if (!prefersReducedMotion && 'DeviceOrientationEvent' in window) {
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