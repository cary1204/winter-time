import * as Astronomy from 'astronomy-engine';

const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
const info = document.getElementById('sky-info');
const tooltip = document.getElementById('sky-tooltip');

const HORIZON = 0.82; // horizon line, as a fraction of screen height (behind the mountains)
const TOP = 0.06; // straight overhead, as a fraction of screen height
const EDGE = 30; // keep objects this many pixels away from the screen edges

const PLANETS = [
  { body: Astronomy.Body.Mercury, name: 'Mercury', color: '#e6e2da', size: 2.6 },
  { body: Astronomy.Body.Venus, name: 'Venus', color: '#fff6dc', size: 4 },
  { body: Astronomy.Body.Mars, name: 'Mars', color: '#ffb08a', size: 3.2 },
  { body: Astronomy.Body.Jupiter, name: 'Jupiter', color: '#ffeccc', size: 3.8 },
  { body: Astronomy.Body.Saturn, name: 'Saturn', color: '#f2dfa6', size: 3.2 },
];

let width = 0;
let height = 0;
let location = guessLocationFromTimezone();
let sky = { planets: [], moon: null, sunAlt: -90 };
let windows = { planets: {}, moon: null };
let windowsKey = '';
let screen = { planets: [], moon: null };

//get loction
function guessLocationFromTimezone() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const southern = /^(Australia|Antarctica)\/|Auckland|Sao_Paulo|Argentina|Santiago|Johannesburg|Lima|Montevideo/.test(zone);
  return {
    lat: southern ? -33 : 40,
    lon: -new Date().getTimezoneOffset() / 4,
    approximate: true,
  };
}

function requestLocation() {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      location = { lat: pos.coords.latitude, lon: pos.coords.longitude, approximate: false };
      updateSky();
    },
    () => {
      //defualt
    },
    { timeout: 10000, maximumAge: 60 * 60 * 1000 }
  );
}

function bodyPosition(body, time, observer) {
  const eq = Astronomy.Equator(body, time, observer, true, true);
  const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
  return { alt: hor.altitude, az: hor.azimuth };
}

//10min intvl
const STEP_MIN = 10;
const STEPS = (24 * 60) / STEP_MIN;

function findWindow(samples, isVisible) {
  let start = 0;
  while (start < samples.length && !isVisible(start)) start++;
  if (start === samples.length) return null;
  let end = start;
  while (end + 1 < samples.length && isVisible(end + 1)) end++;
  return { start, end, now: start === 0 };
}

function updateWindows() {
  const observer = new Astronomy.Observer(location.lat, location.lon, 0);
  const startMs = Date.now();

  const samples = [];
  for (let i = 0; i <= STEPS; i++) {
    const date = new Date(startMs + i * STEP_MIN * 60 * 1000);
    const time = Astronomy.MakeTime(date);
    samples.push({ date, time, dark: bodyPosition(Astronomy.Body.Sun, time, observer).alt < -6 });
  }

  windows.planets = {};
  for (const p of PLANETS) {
    const positions = samples.map((s) => bodyPosition(p.body, s.time, observer));
    const w = findWindow(samples, (i) => samples[i].dark && positions[i].alt > 8);

    if (!w || w.end - w.start < 3) continue;

    let peak = w.start;
    for (let i = w.start; i <= w.end; i++) if (positions[i].alt > positions[peak].alt) peak = i;

    windows.planets[p.name] = {
      start: samples[w.start].date,
      end: samples[w.end].date,
      now: w.now,
      peakDate: samples[peak].date,
      peak: positions[peak],
    };
  }

  const moonAlts = samples.map((s) => bodyPosition(Astronomy.Body.Moon, s.time, observer).alt);
  const mw = findWindow(samples, (i) => moonAlts[i] > 3);
  windows.moon = mw && { start: samples[mw.start].date, end: samples[mw.end].date, now: mw.now };
}

const formatTime = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function describeWindow(w) {
  if (!w) return 'Not visible in the next 24 hours';
  if (w.now) return `Visible now until ${formatTime(w.end)}`;
  return `Visible ${formatTime(w.start)} – ${formatTime(w.end)}`;
}

function updateSky() {
  const key = `${location.lat.toFixed(2)},${location.lon.toFixed(2)},${Math.floor(Date.now() / 600000)}`;
  if (key !== windowsKey) {
    windowsKey = key;
    updateWindows();
  }

  const time = Astronomy.MakeTime(new Date());
  const observer = new Astronomy.Observer(location.lat, location.lon, 0);

  sky.planets = PLANETS.filter((p) => windows.planets[p.name]).map((p) => {
    const w = windows.planets[p.name];
    return { ...p, window: w, shown: w.now ? bodyPosition(p.body, time, observer) : w.peak };
  });

  sky.moon = {
    ...bodyPosition(Astronomy.Body.Moon, time, observer),
    lit: Astronomy.Illumination(Astronomy.Body.Moon, time).phase_fraction, // 0 = new, 1 = full
    waxing: Astronomy.MoonPhase(time) < 180,
  };

  sky.sunAlt = bodyPosition(Astronomy.Body.Sun, time, observer).alt;

  project();
  updateInfo();
}

function toScreen({ alt, az }) {
  const centerAz = location.lat >= 0 ? 180 : 0;
  const turn = (((az - centerAz + 180) % 360) + 360) % 360; // 0..360, center at 180
  const x = EDGE + (turn / 360) * (width - EDGE * 2);
  const top = height * TOP;
  const horizon = height * HORIZON;
  const y = horizon - (Math.max(0, alt) / 90) * (horizon - top);
  return { x, y };
}

// avoid
function textBox() {
  const els = [...document.querySelectorAll('.content > *')];
  if (!els.length) return null;
  return els.reduce(
    (box, el) => {
      const r = el.getBoundingClientRect();
      return {
        left: Math.min(box.left, r.left),
        right: Math.max(box.right, r.right),
        top: Math.min(box.top, r.top),
        bottom: Math.max(box.bottom, r.bottom),
      };
    },
    { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  );
}

function project() {
  const box = textBox();
  const labelBoxes = [];

  screen.planets = sky.planets.map((p) => {
    const pos = toScreen(p.shown);

    // adjust no blocking
    if (box && pos.x > box.left - 20 && pos.x < box.right + 20 &&
        pos.y > box.top - 30 && pos.y < box.bottom + 16) {
      const above = box.top - 30;
      const below = box.bottom + 24;
      pos.y = pos.y - above < below - pos.y && above > height * TOP ? above : below;
    }

    // labeling
    ctx.font = '12px Georgia, serif';
    const w = ctx.measureText(p.name).width;
    const labelAt = (y) => ({ left: pos.x - w / 2 - 4, right: pos.x + w / 2 + 4, top: y - 12, bottom: y + 3 });
    const overlaps = (a) => labelBoxes.some((b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    let labelY = pos.y - p.size - 8;
    if (overlaps(labelAt(labelY))) labelY = pos.y + p.size + 16;
    labelBoxes.push(labelAt(labelY));

    return { ...p, pos, labelY };
  });

  // moon
  const R = moonRadius();
  const small = width <= 640;
  screen.moon = sky.moon && {
    ...sky.moon,
    x: width * (1 - (small ? 0.1 : 0.14)) - R,
    y: height * (small ? 0.08 : 0.12) + R,
  };
}

function updateInfo() {
  const tonight = sky.planets.map((p) => p.name);
  const parts = [tonight.length ? `Planets tonight: ${tonight.join(', ')}` : 'No planets tonight'];
  if (location.approximate) parts.push('approx. location');
  info.textContent = parts.join(' · ');
}

// draw
function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (sky.moon) project();
}

const moonRadius = () => Math.min(60, Math.max(35, width * 0.045));

function drawMoon(m) {
  const R = moonRadius();

  // glow
  const glow = ctx.createRadialGradient(m.x, m.y, R * 0.8, m.x, m.y, R * 3.5);
  glow.addColorStop(0, `rgba(246, 239, 217, ${0.08 + m.lit * 0.25})`);
  glow.addColorStop(1, 'rgba(246, 239, 217, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(m.x, m.y, R * 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(m.x, m.y);

  // Dark
  ctx.fillStyle = 'rgba(40, 48, 85, 0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();

  //bright
  const litOnRight = m.waxing === location.lat >= 0;
  if (!litOnRight) ctx.scale(-1, 1);

  const terminator = R * (1 - 2 * m.lit); // where light meets shadow
  ctx.fillStyle = '#f6efd9';
  ctx.beginPath();
  ctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2); // lit half
  if (terminator < 0) {
    ctx.ellipse(0, 0, -terminator, R, 0, Math.PI / 2, (3 * Math.PI) / 2); // gibbous
  } else {
    ctx.ellipse(0, 0, terminator, R, 0, Math.PI / 2, -Math.PI / 2, true); // crescent
  }
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  if (screen.moon) drawMoon(screen.moon);

  //planets
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'center';
  for (const p of screen.planets) {
    ctx.globalAlpha = p.window.now ? 1 : 0.6;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 230, 200, 0.8)';
    ctx.fillText(p.name, p.pos.x, p.labelY);
  }
  ctx.globalAlpha = 1;

  requestAnimationFrame(draw);
}

//tooltip sec.
function findObjectAt(x, y) {
  const near = (p, r) => p && Math.hypot(p.x - x, p.y - y) <= r;

  for (const p of screen.planets) {
    if (near(p.pos, 16)) {
      return {
        title: p.name,
        detail: p.window.now
          ? 'Planet, in the sky now'
          : `Planet, highest around ${formatTime(p.window.peakDate)}`,
        when: describeWindow(p.window),
      };
    }
  }

  const m = screen.moon;
  if (m && near(m, moonRadius() + 6)) {
    return {
      title: 'Moon',
      detail: `${Math.round(m.lit * 100)}% lit, ${m.waxing ? 'waxing' : 'waning'}`,
      when: describeWindow(windows.moon),
    };
  }
  return null;
}

function showTooltip(x, y) {
  const obj = findObjectAt(x, y);
  if (!obj) {
    hideTooltip();
    return;
  }
  tooltip.innerHTML = '';
  const title = document.createElement('strong');
  title.textContent = obj.title;
  const detail = document.createElement('span');
  detail.textContent = obj.detail;
  const when = document.createElement('span');
  when.textContent = obj.when;
  tooltip.append(title, detail, when);
  tooltip.hidden = false;

  // Keep the tooltip on screen
  const box = tooltip.getBoundingClientRect();
  const left = Math.min(x + 14, width - box.width - 8);
  const top = y - box.height - 14 < 8 ? y + 18 : y - box.height - 14;
  tooltip.style.left = `${Math.max(8, left)}px`;
  tooltip.style.top = `${top}px`;
  document.body.style.cursor = 'pointer';
}

function hideTooltip() {
  tooltip.hidden = true;
  document.body.style.cursor = '';
}

// taps/hovers
window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  if (e.target.closest('.player')) hideTooltip();
  else showTooltip(e.clientX, e.clientY);
});

window.addEventListener('click', (e) => {
  if (e.target.closest('.player, button, input, a')) return;
  showTooltip(e.clientX, e.clientY);
});

document.addEventListener('mouseleave', hideTooltip);

// start
resize();
window.addEventListener('resize', resize);
updateSky();
setInterval(updateSky, 60 * 1000);
requestLocation();
requestAnimationFrame(draw);