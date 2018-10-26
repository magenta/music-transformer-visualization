import { Parser } from './parser.js';
import { AppManager } from './app_manager.js';
import { TYPES, svgNS } from './utils.js';

// Globals, globals for everyone.
const KIND = window.location.pathname.substr(1).replace('.html','');

let initialUrl = KIND ===  TYPES.BACH ? 
    'https://cdn.glitch.com/a1117798-99f0-492a-98a5-96ce992df48d%2F128steps_att_plus_music.json?1537482140778' :
    KIND === TYPES.DOUBLE ? 
    'https://cdn.glitch.com/a1117798-99f0-492a-98a5-96ce992df48d%2Fdouble_attn.json?1540584504543' :
    'https://cdn.glitch.com/a1117798-99f0-492a-98a5-96ce992df48d%2Fperformance_64steps_att_plus_music.json?1537482160879';

const parser = new Parser(KIND);
const app = new AppManager();
let noteSequence;

// Initialize the player.
const player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
player.callbackObject = {
  run: (note) => {
    let musicLine = music.querySelector('#musicLine');
    let x,w;
    if (KIND === TYPES.BACH || KIND === TYPES.DOUBLE) {
      x = note.quantizedStartStep * app.painter.config.noteWidth;
      w = app.painter.config.noteWidth;
    } else {
      x = note.quantizedEndStep * app.painter.config.timeScale;
      w = app.painter.config.timeScale;
    }
    musicLine.setAttribute('x', x);
    musicLine.setAttribute('width', w);
  },
  stop: () => {}
}


parser.loadURL(initialUrl).then(updateEverything);


loadBtn.addEventListener('change', loadFile);
resetBtn.addEventListener('click', () => app.reset());
animateBtn.addEventListener('click', animate);
playBtn.addEventListener('click', playOrPause);
drawerBtn.addEventListener('click', showHideDrawer);
downloadBtn.addEventListener('click', download);

function updateEverything() {
  noteSequence = parser.getNoteSequence();

  // UI Manager.
  app.init(parser.data, KIND);
}

function loadFile(e, callback) {
  var fileReader = new FileReader();
  fileReader.onload = function(e) {
    parser.parse(JSON.parse(e.target.result));
    updateEverything();
  }
  fileReader.readAsText(e.target.files[0]);
  filenameSpan.textContent = 'File loaded: ' + e.target.files[0].name;
  return false;
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
  let musicLine = music.querySelector('#musicLine');
  if (!musicLine) {
    musicLine = document.createElementNS(svgNS, 'rect');
    musicLine.setAttribute('id', 'musicLine');
    musicLine.setAttribute('x', -100);
    musicLine.setAttribute('y', 0);
    musicLine.setAttribute('width', 0);
    musicLine.setAttribute('height', music.getAttribute('height'));
    musicLine.setAttribute('fill', 'rgba(255, 105, 180, 0.5)');
    music.appendChild(musicLine);
  }
  
  if (player.isPlaying()) {
    player.stop();
    event.target.textContent = 'Play Audio';
    musicLine.setAttribute('x', -100);
  } else {
    player.start(noteSequence)
    .then(() => {
      event.target.textContent = 'Play Audio';
      musicLine.setAttribute('x', -100);
    });
    event.target.textContent = 'Stop';
  }
}

function download(event) {
  event.stopImmediatePropagation();
  saveAs(new File([mm.sequenceProtoToMidi(noteSequence)], 'transcription.mid'));
}