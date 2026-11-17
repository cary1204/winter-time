import './snow.js'
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