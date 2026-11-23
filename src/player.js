const TRACKS = [
  { title: 'Study Music', artist: 'Luceris', file: 'luceris-study-music-602504.mp3' },
  { title: 'Lofi Focus', artist: 'ZephiraMusic', file: 'zephiramusic-lofi-focus-606303.mp3' },
  { title: 'Tokyo Lofi', artist: 'ZephiraMusic', file: 'zephiramusic-tokyo-lofi-604786.mp3' },
  { title: 'Lofi House', artist: 'ZephiraMusic', file: 'zephiramusic-lofi-house-611107.mp3' },
];

const trackUrl = (track) => `${import.meta.env.BASE_URL}music/${encodeURIComponent(track.file)}`;

const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progress = document.getElementById('progress');
const trackName = document.getElementById('track-name');
const trackArtist = document.getElementById('track-artist');
const disk = document.getElementById('disk');

// built in broswer
const audio = new Audio();
audio.preload = 'metadata';

let trackIndex = 0;
let isSeeking = false; // true while the progress bar is being dragged

// loading tack
function loadTrack(index, { autoplay = false } = {}) {
  trackIndex = (index + TRACKS.length) % TRACKS.length;
  const track = TRACKS[trackIndex];

  audio.src = trackUrl(track);
  trackName.textContent = track.title;
  trackArtist.textContent = track.artist;
  progress.value = 0;
  progress.max = 1;
  showProgress();

  // mobile support in bg
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist });
  }

  if (autoplay) play();
}

// crtl
function play() {
  audio.play().catch(() => {
  });
}

function togglePlay() {
  if (audio.paused) play();
  else audio.pause();
}

function next() {
  loadTrack(trackIndex + 1, { autoplay: !audio.paused || audio.ended });
}

function previous() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
  } else {
    loadTrack(trackIndex - 1, { autoplay: !audio.paused });
  }
}

// bar
const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function showProgress() {
  const duration = Number(progress.max) || 1;
  const value = Number(progress.value);
  progress.style.setProperty('--progress', `${(value / duration) * 100}%`);
  progress.setAttribute(
    'aria-valuetext',
    `${formatTime(value)} of ${formatTime(isFinite(audio.duration) ? audio.duration : 0)}`
  );
}

audio.addEventListener('loadedmetadata', () => {
  progress.max = audio.duration;
  showProgress();
});

audio.addEventListener('timeupdate', () => {
  if (isSeeking) return;
  progress.value = audio.currentTime;
  showProgress();
});

progress.addEventListener('input', () => {
  isSeeking = true;
  showProgress();
});
progress.addEventListener('change', () => {
  isSeeking = false;
  audio.currentTime = Number(progress.value);
});

function updateUI() {
  const playing = !audio.paused;
  playBtn.classList.toggle('is-playing', playing);
  playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  disk.classList.toggle('is-spinning', playing);
}

audio.addEventListener('play', updateUI);
audio.addEventListener('pause', updateUI);
audio.addEventListener('ended', next);

// skip if error
audio.addEventListener('error', () => {
  trackArtist.textContent = `Couldn't load ${TRACKS[trackIndex].file}`;
  updateUI();
});

playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', previous);
nextBtn.addEventListener('click', next);

if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', play);
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('previoustrack', previous);
  navigator.mediaSession.setActionHandler('nexttrack', next);
}

// volume-
const volumeInput = document.getElementById('volume');
const muteBtn = document.getElementById('mute-btn');

// iPhones doesnt let you change vol
// mute
const canSetVolume = (() => {
  const test = new Audio();
  test.volume = 0.5;
  return test.volume === 0.5;
})();
volumeInput.hidden = !canSetVolume;

// remember volume
try {
  const saved = localStorage.getItem('volume');
  if (saved !== null && canSetVolume) audio.volume = Number(saved);
} catch (err) {
  //default
}
if (canSetVolume && audio.volume === 1) audio.volume = 0.7; // default 0.7

function updateVolumeUI() {
  const muted = audio.muted || audio.volume === 0;
  const shown = audio.muted ? 0 : audio.volume;
  volumeInput.value = shown;
  volumeInput.style.setProperty('--progress', `${shown * 100}%`);
  volumeInput.setAttribute('aria-valuetext', `${Math.round(shown * 100)}%`);
  muteBtn.classList.toggle('is-muted', muted);
  muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
}

volumeInput.addEventListener('input', () => {
  const v = Number(volumeInput.value);
  audio.volume = v;
  audio.muted = v === 0;
  try {
    localStorage.setItem('volume', String(v));
  } catch (err) {
    // empty
  }
});

muteBtn.addEventListener('click', () => {
  if (audio.muted || audio.volume === 0) {
    audio.muted = false;
    if (audio.volume === 0) audio.volume = 0.25; // unmitting to zero sets to 0.25
  } else {
    audio.muted = true;
  }
});

audio.addEventListener('volumechange', updateVolumeUI);

loadTrack(0);
updateUI();
updateVolumeUI();