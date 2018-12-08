import { Parser } from './parser.js';
import { AppManager } from './app_manager.js';
import { TYPES, svgNS, getLocationHash, drawMusicLine } from './utils.js';

// Globals, globals for everyone.
// TODO: fix this parsing
const KIND = window.location.pathname.substr(1).replace('.html','')
    .replace('nips-workshop-visualization/','')
    .replace('transformer-visualization/', '');

let initialConfig = {};
initialConfig.url = KIND ===  TYPES.BACH ?
    `./files/bach.json` :
    KIND === TYPES.DOUBLE ?
    `./files/duo_small.json` :
    `./files/performance_small.json`;

hashChanged();

const parser = new Parser(KIND);
const app = new AppManager();
let noteSequence;
let player = initPlayer();

parser.loadURL(initialConfig.url).then(updateEverything);

loadBtn.addEventListener('change', loadFile);
resetBtn.addEventListener('click', () => app.reset());
animateBtn.addEventListener('click', animate);
playBtn.addEventListener('click', playOrPause);
drawerBtn.addEventListener('click', showHideDrawer);
downloadBtn.addEventListener('click', download);

if (window.loadOtherPerf) {
  loadOtherPerf.addEventListener('click', loadOtherPerfFile);
}
if (window.loadOtherDuo) {
  loadOtherDuo.addEventListener('click', loadOtherDuoFile);
}
function updateEverything() {
  noteSequence = parser.getNoteSequence();
  playBtn.disabled = true;
  player.loadSamples(noteSequence).then(() => {
    playBtn.disabled = false;
  });
  app.init(parser.data, KIND, initialConfig);
}

function loadOtherPerfFile() {
  document.getElementById('loading').hidden = false;
  document.getElementById('output').hidden = true;
  parser.loadURL('https://storage.googleapis.com/nips-workshop-visualization/files/performance_big.json').then(updateEverything);
}
function loadOtherDuoFile() {
  document.getElementById('loading').hidden = false;
  document.getElementById('output').hidden = true;
  parser.loadURL('https://storage.googleapis.com/nips-workshop-visualization/files/bach_duo.json').then(updateEverything);
}
function loadFile(e, callback) {
  document.getElementById('loading').hidden = false;
  document.getElementById('output').hidden = true;
  var fileReader = new FileReader();
  fileReader.onload = function(e) {
    parser.parse(JSON.parse(e.target.result));
    updateEverything();
  }
  fileReader.readAsText(e.target.files[0]);
  filenameSpan.textContent = 'File loaded: ' + e.target.files[0].name;
  return false;
}

function initPlayer() {
  const player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
  player.callbackObject = {
    run: (note) => {
      const first = performance.now();

      // Paint the attention for all the active rectangles.
      app.paintAttentionForRects(window.allRects[window.currentStep]);

      drawMusicLine(window.linePosition[window.currentStep].x, window.linePosition[window.currentStep].w);
      console.log(performance.now() - first);
      window.currentStep++;
    },
    stop: () => {}
  }
  return player;
}

function animate(event) {
  if (app.isPlaying) {
    app.isPlaying = false;
    event.target.textContent = 'animate';
  } else {
    event.target.textContent = 'stop'
    app.step = -1;
    app.isPlaying = true;
    app.play();
  }
}

function showHideDrawer(event) {
  const el = document.querySelector('.settings');
  if (el.classList.contains('hide')) {
    el.classList.remove('hide');
    event.target.textContent = '<';
  } else {
    el.classList.add('hide');
    event.target.textContent = '>';
  }
}

function playOrPause(event) {
  if (player.isPlaying()) {
    player.stop();
    window.precomputedSortedAttentions = null;
    window.allRects = null;
    event.target.textContent = 'Play Audio';
  } else {
    // Set the right tempo.
    if (noteSequence.tempos) {
      noteSequence.tempos[0].qpm = app.tempo;
    }
    precomputeEverything();
    player.start(noteSequence)
    .then(() => {
      window.precomputedSortedAttentions = null;
      event.target.textContent = 'Play Audio';
    });
    event.target.textContent = 'Stop';
  }
}

function precomputeEverything() {
  // All heads mode.
  const checkedStatuses = [];
  const checkboxes = [...document.querySelectorAll('#headColors input[type="checkbox"]')];
  checkboxes.map(x => checkedStatuses.push(x.checked));

  const scaledHeadsData = app.data.layers[app.layer].scaledHeads;

  window.precomputedSortedAttentions = [];
  for (let i = 0; i < app.numSteps; i++) {
    window.precomputedSortedAttentions.push(app.painter.getSortedAttentionsIfNeeded(
      i, scaledHeadsData, checkedStatuses));
  }

  // Precompute the rectangles.
  window.currentStep = 0;
  window.allRects = [];
  window.linePosition = [];
  for (let i = 0; i < noteSequence.notes.length; i++) {
    const note = noteSequence.notes[i];
    let x,w;
    let currentRects;
    if (KIND !== TYPES.PERFORMANCE) {
      x = note.quantizedStartStep * (app.painter.config.noteWidth + app.config.noteMargin);
      w = (note.quantizedEndStep - note.quantizedStartStep) * (app.painter.config.noteWidth + app.config.noteMargin);
      currentRects = music.querySelectorAll(`rect[stepEnd="${note.quantizedEndStep}"]`);
    } else {
      x = (parser.sequenceTimeOffset + note.quantizedStartStep) * app.painter.config.timeScale;
      w = (note.quantizedEndStep - note.quantizedStartStep) * app.painter.config.timeScale;
      const startNotes = `rect[stepStart="${(parser.sequenceTimeOffset + note.quantizedStartStep) * app.painter.config.timeScale}"]`;
      const endNotes = `rect[stepStart="${(parser.sequenceTimeOffset + note.quantizedEndStep) * app.painter.config.timeScale}"]`;
      currentRects = music.querySelectorAll(startNotes, endNotes);
    }
    window.linePosition.push({x:x, w:w});
    window.allRects.push(currentRects);
  }


}

function download(event) {
  event.stopImmediatePropagation();
  saveAs(new File([mm.sequenceProtoToMidi(noteSequence)], 'transcription.mid'));
}

function hashChanged() {
  const hashParams = getLocationHash();
  if (hashParams.figure) {
    switch (hashParams.figure) {
      case '1a': // bach
        initialConfig.step = 89;
        break;
      case '1b': // bach
        initialConfig.step = 76;
        initialConfig.layer = 0;
        break;
      case '1c': // bach
        initialConfig.step = 76;
        initialConfig.layer = 3;
        break;
      case '1d': // duo
        initialConfig.url = 'https://storage.googleapis.com/nips-workshop-visualization/files/bach_duo.json';
        initialConfig.step = 403;
        initialConfig.top = 80;
        initialConfig.noteWidth = 5;
        break;
      case '3a': // performance
        initialConfig.url = 'https://storage.googleapis.com/nips-workshop-visualization/files/performance_big.json';
        initialConfig.step = 895;
        initialConfig.top = 80;
        break;
      case '3b': // performance
        initialConfig.url = 'https://storage.googleapis.com/nips-workshop-visualization/files/performance_big.json';
        initialConfig.step = 948;
        initialConfig.top = 80;
        break;
      default:
        break;
    }
  }
}
