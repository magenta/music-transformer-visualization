import {TYPES, scaleArray} from './utils.js';
export {Parser};

const NUM_VOICES = 4;

class Parser {
  constructor(type) {
    this.type = type;
    this.data = {};

    if (type === TYPES.DOUBLE) {
      this.data.local = {};
      this.data.global = {};
    }
  }

  async loadURL(url) {
    let start = new Date();
    await fetch(url)
    .then((response) => response.json())
    .then((json) => {
      console.log(`Downloading the file: ${new Date() - start} ms.`);
      this.parse(json);
    });
  }

  parse(json) {
    // The weights have some extra info that's a bit different per file type.
    if (this.type === TYPES.PERFORMANCE) {
      this.parseSingleAttentionWeights(json);
      this.parsePerformanceWeights(json);
    } else if (this.type === TYPES.BACH){
      this.parseSingleAttentionWeights(json);
      this.parseBachWeights(json);
    } else if (this.type === TYPES.DOUBLE) {
      this.parseDoubleAttentionWeights(json);
      this.parseBachWeights(json);
    }
  }

  parseSingleAttentionWeights(json) {
    debugger
    let start = new Date();
    const numSteps = json.music_text.length;
    let headWeights;

    this.data.layers = [];
    for (let layer = 0; layer < json.attention_weights.length; layer++) {
      // If the data is sparse, you need to unsparsefy and repopulate
      // these arrays correctly.
      if (json.sparse) {
        for (let head = 0; head < json.attention_weights[layer][0].length; head++) {
          headWeights = json.attention_weights[layer][0][head];

          for (let step = 0; step < numSteps; step++) {
            const weights = new Float32Array(numSteps);
            // const sparseWeights = headWeights[step];
            Object.keys(headWeights[step]).forEach(function(key) {
              weights[key] = headWeights[step][key];
            });
            // Scale these weights now, not later because we don't have
            // enough memory to keep both.
            headWeights[step] = scaleArray(weights);
          }
        }
      }
      this.data.layers.push({scaledHeads:json.attention_weights[layer][0]});
    }

    console.log(`Parsing weights: ${new Date() - start} ms.`);
    start = new Date();

    //this.data.layers[this.layer].heads[this.head][step];
    this.data.sequenceLength = this.data.layers[0].scaledHeads[0].length;
    this.data.numHeads = this.data.layers[0].scaledHeads.length;
    this.data.numLayers = this.data.layers.length;

    // Preemptively scale all the data.
    // for (let l = 0; l < this.data.layers.length; l++) {
    //   this.data.layers[l].scaledHeads = [];
    //   for (let h = 0; h < this.data.layers[l].heads.length; h++) {
    //     this.data.layers[l].scaledHeads[h] = new Array(this.data.layers[l].heads[h].length);
    //     for (let s = 0; s < this.data.layers[l].heads[h].length; s++) {
    //       this.data.layers[l].scaledHeads[h][s] = scaleArray(this.data.layers[l].heads[h][s]);
    //     }
    //   }
    // }
    // console.log(`Scaling weights: ${new Date() - start} ms.`);
  }

  parseDoubleAttentionWeights(json) {
    this.data.local.layers = [];
    this.data.global.layers = [];
    for (let i = 0; i < json.attention_weights.length; i++) {
      this.data.local.layers.push({heads:json.attention_weights[i][0]});
    }
    for (let i = 0; i < json.attention_weights_regular.length; i++) {
      this.data.global.layers.push({heads:json.attention_weights_regular[i][0]});
    }

    // Okay. The two models may not have the same number of layers, so copy the
    // last layer over if it's missing. I'm also assuming rn they're off by 1.
    if (this.data.local.layers.length < this.data.global.layers.length) {
      this.data.local.layers.push(this.data.local.layers[this.data.local.layers.length -1]);
    } else if (this.data.global.layers.length < this.data.local.layers.length) {
      this.data.global.layers.push(this.data.global.layers[this.data.global.layers.length -1]);
    }

    // Preemptively scale all the data.
    for (let l = 0; l < this.data.local.layers.length; l++) {
      this.data.local.layers[l].scaledHeads = [];
      this.data.global.layers[l].scaledHeads = [];
      for (let h = 0; h < this.data.local.layers[l].heads.length; h++) {
        this.data.local.layers[l].scaledHeads[h] = new Array(this.data.local.layers[l].heads[h].length);
        this.data.global.layers[l].scaledHeads[h] = new Array(this.data.global.layers[l].heads[h].length);
        for (let s = 0; s < this.data.local.layers[l].heads[h].length; s++) {
          this.data.local.layers[l].scaledHeads[h][s] = scaleArray(this.data.local.layers[l].heads[h][s]);
          this.data.global.layers[l].scaledHeads[h][s] = scaleArray(this.data.global.layers[l].heads[h][s]);
        }

      }
    }

    // The two weights should be equal, so which we use doesn't matter.
    this.data.sequenceLength = this.data.global.layers[0].heads[0].length;
    this.data.numHeads = this.data.global.layers[0].heads.length;
    this.data.numLayers = this.data.global.layers.length;
  }

  getNoteSequence() {
    if (this.type === TYPES.PERFORMANCE) {
      return this.getPerformanceNoteSequence();
    } else if (this.type === TYPES.BACH || this.type === TYPES.DOUBLE){
      return this.getBachNoteSequence();
    }
  }

  parseBachWeights(json) {
    this.data.music = json.music;

    if (this.type === TYPES.DOUBLE) {
      this.data.music.pop();
    }
    // In duo mode, there's a weird last note at the end
    this.data.minPitch = Math.min(...json.music);
    this.data.maxPitch = Math.max(...json.music);
    this.data.steps = this.data.sequenceLength / NUM_VOICES;
  }

  parsePerformanceWeights(json) {
    const parsed = this.parsePerformanceEvents(json.music_text);
    this.data.music = parsed.events;

    const range =  this.getPerformancePitchRange(this.data);
    this.data.minPitch = range.min;
    this.data.maxPitch = range.max;
    this.data.steps = parsed.totalSteps;
  }

  getBachNoteSequence() {
    const seq = { notes: [] };

    let step = 0;
    let voice = 0;
    for (let i = 0; i < this.data.music.length; i++) {
      seq.notes.push({
        pitch: this.data.music[i],
        quantizedStartStep: step,
        quantizedEndStep: step + 1
      });
      voice++;

      // Did we finish a step?
      if (voice === NUM_VOICES) {
        voice = 0;
        step += 1;
      }
    }
    seq.totalQuantizedSteps = step;
    seq.quantizationInfo = {stepsPerQuarter: 2};
    seq.tempos = [{time:0, qpm:120}]
    return seq;
  }

  getPerformanceNoteSequence() {
    // Shift everything until the first note-on, just to make it sounds nice.
    const newEvents = JSON.parse(JSON.stringify(this.data.music));
    let totalOffset = 0;
    for (let i = 0; i < newEvents.length; i++) {
      if (newEvents[i].type !== 'time-shift') {
        break;
      }
      totalOffset += newEvents[i].steps;
      newEvents[i].steps = 0;
    }
    const performance = new mm.performance.Performance(newEvents, 100 /*max steps*/, 32 /*velocity bins*/);
    this.sequenceTimeOffset = totalOffset;
    const seq = performance.toNoteSequence();
    seq.quantizationInfo = {
      stepsPerQuarter: 50
    }
    seq.tempos = [{time:0, qpm:120}]
    return seq;
  }

  parsePerformanceEvents(input) {
    // It's first 128 note ons, then 128 note offs, then 100 timeshifts then 32 velocity bins
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
          velocityBin: value
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

  getPerformancePitchRange(data) {
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
}
