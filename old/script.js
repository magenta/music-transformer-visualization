// This is basically 0
let EPSILON = 0.00001;
let HIDE_GREY = false;

// Attention visualization config.
let NOTE_HEIGHT = 8;
let NOTE_WIDTH = 50;
let WEIGHT_CUTOFF = 0.5;
let SELF_ATTN_ONLY = false;

// Audio Pianoroll config.
let STEPS_PER_QUARTER = 80;
let PIXELS_PER_STEP = 1;

// Bach-only
const NUM_VOICES = 4;

// Attention only 
let IS_TOP = false;
let TOP_NUMBER = 10;

// Time-shift section
const TIME_HEIGHT = 20;
const TIME_WIDTH = 4;
const TIME_Y = 0;        // where to draw a time-shift.
const TIME_OFFSET = 40;  // how tall the time-shift box is.
let TIME_SCALE = 1;   // Similar to note-width, kind of

// Velocities section
const VEL_WIDTH = 20;
const VEL_HEIGHT = 16;
const VEL_Y = 10;       // where to draw a velocity.
const VEL_OFFSET = 40;  // how tall the velocities box is.


const svgNS = `http://www.w3.org/2000/svg`;

// Globals for everybody, don't judge.
const data = {};
let painter;
let player;
let visualizer;

const colors = [
  {min: rgb('ffd6d6'), max: rgb('e6194B')}, // red
  {min: rgb('ffdac3'), max: rgb('f58231')}, // orange
  {min: rgb('efe2bc'), max: rgb('ffe119')},// yellow
  {min: rgb('cdeaca'), max: rgb('3cb44b')}, // green
  {min: rgb('b0edef'), max: rgb('6bb9bc')}, // cyan
  {min: rgb('d9e1ff'), max: rgb('448aff')}, // blue
  {min: rgb('f0dbfe'), max: rgb('68529A')}, // purple
  {min: rgb('dbe0ff'), max: rgb('546e7a')} // navy
];

const STATE = {
  layer: 3,
  head: -1,
  step: -1,
}

setup();

function setup() {
  //fetch('https://cdn.glitch.com/a1117798-99f0-492a-98a5-96ce992df48d%2F128steps_att_plus_music.json?1537377236923')
  //fetch('https://cdn.glitch.com/a1117798-99f0-492a-98a5-96ce992df48d%2F16steps_att_plus_music.json?1537377235941')
  fetch('https://cdn.glitch.com/a1117798-99f0-492a-98a5-96ce992df48d%2Fperformance_64steps_att_plus_music.json?1537482160879')
  .then((response) => response.json())
  .then((json) => {
    initUI(json);
  });

  music.addEventListener('click', (event) => {
    if (event.target.localName === 'rect') {
      const index = event.target.dataset.index;
      STATE.step = parseInt(index);
      update();
    }
  });

  document.body.addEventListener('keydown', onKeyDown);
  layers.addEventListener('change', function() {
    STATE.layer = layers.value;
    reset(true);
  });
  heads.addEventListener('change', function() {
    STATE.head = heads.value === 'all' ? -1 : heads.value;
    reset(true);
  });

  player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
  player.callbackObject = {
    run: (note) => {
      const currentNotePosition = visualizer.redraw(note);

      // See if we need to scroll the container.
      const containerWidth = container.getBoundingClientRect().width;
      if (currentNotePosition > (container.scrollLeft + containerWidth)) {
        container.scrollLeft = currentNotePosition - 20;
      }
    },
    stop: () => {}
  }
}

function reset(keepStep) {
  printState();
  painter.paintMusic(data.music);
  printHeadColors(STATE.head);
  if (keepStep) {
    update();
  } else {
    STATE.step = -1;
  }
}

function next() {
  STATE.step = Math.min(data.sequenceLength - 1, STATE.step + 1);
  update();
}

function previous() {
  STATE.step = Math.max(0, STATE.step - 1);
  update();
}

function nextHead() {
  STATE.head = Math.min(data.layers[0].heads.length - 1, STATE.head + 1);
  update();
}

function previousHead() {
  STATE.head = Math.max(0, STATE.head - 1);
  update();
}

function update() {
  printState();
  painter.paintMusic(data.music);
  if (STATE.step === -1) {
    return;
  }

  if (STATE.head === -1) {
    const checkedStatuses = [];
    const checkboxes = [...document.querySelectorAll('#gradient input[type="checkbox"]')];
    checkboxes.map(x => checkedStatuses.push(x.checked));
    painter.paintAllTheAttention(data.layers[STATE.layer].heads, checkedStatuses, STATE.step, colors);
  } else {
    painter.paintAttention(
      data.layers[STATE.layer].heads[STATE.head][STATE.step],
      STATE.step,
      colors[STATE.head]);
  }
}

function loadFile(e, callback) {
  var fileReader = new FileReader();
  fileReader.onload = function(e) {
    initUI(JSON.parse(e.target.result));
  }
  filenameSpan.textContent = e.target.files[0].name;
  fileReader.readAsText(e.target.files[0]);
  return false;
}

function initUI(json) {
  initWeights(json.attention_weights);

  if (json.music_text) {  // Performance.
    const parsed = parsePerformanceEvents(json.music_text);
    data.music = parsed.events;
    data.steps = parsed.totalSteps;
    const range =  getPerformancePitchRange();
    const minPitch = range.min;
    const maxPitch = range.max;
    painter = new PerformancePainter(
      document.getElementById('music'),
      minPitch, maxPitch, data.steps);

    noteWidth.hidden = true;
    timeScale.hidden = false;
    STEPS_PER_QUARTER = 80;
    stepsPerQuarter.querySelector('input').value = STEPS_PER_QUARTER;

    makePerformanceNoteSequence(data.music);
  } else {  // Bach
    data.music = json.music;

    const minPitch = Math.min(...data.music);
    const maxPitch = Math.max(...data.music);
    data.steps = data.layers[0].heads[0].length / NUM_VOICES;
    painter = new BasicPainter(document.getElementById('music'), minPitch, maxPitch, data.steps);

    noteWidth.hidden = false;
    timeScale.hidden = true;
    attnType.hidden = true;
    STEPS_PER_QUARTER = 4;
    stepsPerQuarter.querySelector('input').value = 4;

    makeNoteSequence(data.music);
  }

  reset();
}

function initWeights(json) {
  data.layers = [];
  for (let i = 0; i < json.length; i++) {
    data.layers.push({heads:json[i][0]});
  }
  data.sequenceLength = data.layers[0].heads[0].length;

  // Update the select boxes.
  layers.innerHTML = '';
  heads.innerHTML = '';
  for (let i = 0; i < data.layers.length; i++) {
    layers.appendChild(makeOption(i));
  }
  STATE.layer = data.layers.length - 1
  for (let i = 0; i < data.layers[0].heads.length; i++) {
    heads.appendChild(makeOption(i));
  }
  heads.appendChild(makeOption('all'));
}

function playOrPause(event) {
  if (player.isPlaying()) {
    player.stop();
    event.target.textContent = 'Play';
  } else {
    player.start(visualizer.noteSequence)
        .then(() => (event.target.textContent = 'Play'));
    event.target.textContent = 'Stop';
  }
}

function onKeyDown(event) {
  if (event.target.localName === 'input') {
    return;
  }
  switch (event.keyCode) {
    case 27:  // esc
      reset();
      event.preventDefault();
      break;
    case 37:  // left arrow
      previous();
      event.preventDefault();
      break
    case 38:  // up arrow
      previousHead();
      event.preventDefault();
      break;
    case 39:  // right arrow
      next();
      event.preventDefault();
      break;
    case 40:  // down arrow
      nextHead();
      event.preventDefault();
      break;
  }
}

function makeOption(i) {
  const option = document.createElement('option');
  option.textContent = i;
  return option;
}

function printHeadColors(head) {
  gradient.innerHTML = '';
  if (head === -1) {
    for (let i = 0; i < colors.length; i++) {
      const div = document.createElement('div');
      div.style.display = 'inline-block';
      const input = document.createElement('input');
      input.checked = true;
      input.type = 'checkbox';
      input.id = 'head' + i;
      input.onchange = update;
      const label = document.createElement('label');
      label.setAttribute('for', input.id);
      label.style.backgroundColor = colors[i].max;
      div.appendChild(input);
      div.appendChild(label);
      gradient.appendChild(div);
    }
  }
}

function printState() {
  layers.value = STATE.layer;
  heads.value = STATE.head === -1 ? 'all' : STATE.head;
  stepText.textContent = STATE.step;
}

function changeNoteWidth(event) {
  NOTE_WIDTH = parseInt(event.target.value);
  painter.updateWidth();
  reset(true);
}

function changeNoteHeight(event) {
  NOTE_HEIGHT = parseInt(event.target.value);
  painter.updateWidth();
  reset(true);
}

function changeAttentionKind(event) {
  SELF_ATTN_ONLY = event.target.checked;
  reset(true)
}

function changeTimeScale(event) {
  TIME_SCALE = parseInt(event.target.value);
  painter.updateWidth();
  reset(true);
}

function changeWeightCutoff(event) {
  WEIGHT_CUTOFF = parseFloat(event.target.value);
  reset(true);
}

function changeEpsilon(event) {
  EPSILON = parseFloat(event.target.value);
  reset(true);
}

function changeStepsPerQuarter(event) {
  STEPS_PER_QUARTER = parseInt(event.target.value);
  visualizer.noteSequence.quantizationInfo.stepsPerQuarter = STEPS_PER_QUARTER;
}

function changePixelsPerTimeStep(event) {
  PIXELS_PER_STEP = parseInt(event.target.value);
  const seq = visualizer.noteSequence;
  visualizer = new mm.Visualizer(seq, canvas, {pixelsPerTimeStep: PIXELS_PER_STEP, noteSpacing:0.1});
}

function changeTopWeightsOnly(event) {
  IS_TOP = event.target.checked;
  reset(true);
}

function changeTopWeightsAmount(event) {
  TOP_NUMBER = parseInt(event.target.value);
  reset(true);
}

function changeHideGreyLines(event) {
  HIDE_GREY = event.target.checked;
  reset(true);
}

function download(event) {
  event.stopImmediatePropagation();
  saveAs(new File([mm.sequenceProtoToMidi(visualizer.noteSequence)], 'transcription.mid'));
}

function makeNoteSequence(notes) {
  const seq = {
    notes: [
      {pitch: 36, quantizedStartStep: 0}, {pitch: 42, quantizedStartStep: 2},
    ],
    quantizationInfo: {stepsPerQuarter: STEPS_PER_QUARTER},
    totalQuantizedSteps: 30,
  };

  let step = 0;
  let voice = 0;
  for (let i = 0; i < notes.length; i++) {
    seq.notes.push(
      {pitch: notes[i], quantizedStartStep: step, quantizedEndStep: step + 2}
    );
    voice++;

    // Did we finish a step?
    if (voice === 4) {
      voice = 0;
      step += 2;
    }
  }
  seq.totalQuantizedSteps = step;
  visualizer = new mm.Visualizer(seq, canvas, {pixelsPerTimeStep: PIXELS_PER_STEP, noteSpacing:0.1});
}

function makePerformanceNoteSequence(events) {
  // Shift everything until the first note-on, just to make it sounds nice.
  const newEvents = JSON.parse(JSON.stringify(events));
  for (let i = 0; i < newEvents.length; i++) {
    if (newEvents[i].type !== 'time-shift') {
      break;
    }
    newEvents[i].steps = 0;
  }
  const performance = new mm.performance.Performance(newEvents, 100, 32);

  const seq = performance.toNoteSequence();
  seq.quantizationInfo = {
    stepsPerQuarter: STEPS_PER_QUARTER
  }
  visualizer = new mm.Visualizer(seq, canvas, {pixelsPerTimeStep: PIXELS_PER_STEP, noteSpacing:0.1});
}

function parsePerformanceEvents(input) {
  function getValueFromAction(action, name) {
    const re = new RegExp(`${name}(.*)`, 'g');
    const result = re.exec(action);
    return parseInt(result[1]);
  }

  const events = [];
  let totalSteps = 0;
  for (let i = 0; i < input.length; i++) {
    const action = input[i];
    if (action.startsWith('TIME_SHIFT_')) {
      let value = getValueFromAction(action, 'TIME_SHIFT_');
      events.push({
        type: 'time-shift',
        steps: value
      });
      totalSteps += value;
    } else if (action.startsWith('NOTE_ON_')) {
      const pitch = getValueFromAction(action, 'NOTE_ON_');
      events.push({
        type: 'note-on',
        pitch
      });
    } else if (action.startsWith('NOTE_OFF_')) {
      const pitch = getValueFromAction(action, 'NOTE_OFF_');
      events.push({
        type: 'note-off',
        pitch
      });
    } else if (action.startsWith('VELOCITY_')) {
      const value = getValueFromAction(action, 'VELOCITY_');
      events.push({
        type: 'velocity-change',
      });
    }
  }

  // Trim the first couple steps until you get a note.
  for (let i = 0; i < events.length; i++) {
    if (events[i].type !== 'time-shift') {
      break;
    }
    events[i].steps = 10;
  }

  return {events, totalSteps};
}

function getPerformancePitchRange() {
  let min = 128;
  let max = 0;
  for (let event of data.music) {
    if (event.type == 'note-on') {
      min = Math.min(min, event.pitch);
      max = Math.max(max, event.pitch);
    }
  }
  return {min, max};
}

function rgb(hex) {
  var bigint = parseInt(hex, 16);
  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;
  return `rgb(${r}, ${g}, ${b})`;
}
