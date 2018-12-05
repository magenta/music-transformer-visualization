import { PainterBach } from './painter_bach.js';
import { PainterPerformance } from './painter_performance.js';
import { TYPES, getLocationHash,
        COLORS, SINGLE_COLORS_BLUE,
        LOCAL_COLORS_ALL, GLOBAL_COLORS_ALL,
        LOCAL_COLORS_SINGLE, GLOBAL_COLORS_SINGLE,
        makeOption, makeHeadSelector } from './utils.js';

export { AppManager };

class AppManager {
  constructor() {
    this.layer = 3;
    this.head = -1;
    this.step = -1;
    this.numSteps = 0;
    this.numHeads = 0;
    this.numLayers = 0;
    this.tempo = 120;

    this.painter = null;

    // Store some elements we need to update often.
    this.heads = document.getElementById('heads');
    this.layers = document.getElementById('layers');
    this.stepText = document.getElementById('stepText');
    this.headColors = document.getElementById('headColors');

    // UI listeners
    document.body.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.getElementById('music').addEventListener('click',
        (event) => this.musicClicked(event));
    document.getElementById('heatmap').addEventListener('click',
        (event) => this.heatmapClicked(event));
  }

  clear() {
    this.painter.clear();
  }

  init(data, type, initialConfig) {
    this.data = data;
    this.type = type;
    this.hasTwoAttentions = type === TYPES.DOUBLE;
    if (type === TYPES.BACH || type === TYPES.DOUBLE) {
      this.painter = new PainterBach(
          document.getElementById('music'),
          document.getElementById('heatmap'),
          data.minPitch, data.maxPitch, data.steps, true);
      if (type === TYPES.DOUBLE) {
        music.setAttribute('double', true);
        this.painter.config.isDouble = true;
      }
    } else if (type === TYPES.PERFORMANCE) {
      this.painter = new PainterPerformance(
          document.getElementById('music'),
          document.getElementById('heatmap'),
          data.minPitch, data.maxPitch, data.steps);
    }

    this.initLayers(data.numLayers);
    this.initHeads(data.numHeads);
    this.initUIListeners(type);
    this.numSteps = data.sequenceLength;

    // If the step updates, then reflect that.
    window.addEventListener('hashchange', () => this.hashChanged());
    this.hashChanged();

    if (initialConfig.step !== undefined) {
      this.step = initialConfig.step;
    }
    if (initialConfig.layer !== undefined) {
      this.layer = initialConfig.layer;
    }
    if (initialConfig.noteWidth !== undefined) {
      noteWidthInput.value = initialConfig.noteWidth;
      this.painter.config.noteWidth = initialConfig.noteWidth;
    }
    if (initialConfig.top !== undefined) {
      this.painter.config.isTop = true;
      this.painter.config.topNumber = initialConfig.top;
      topOnlyInput.checked = true;
      topAmountInput.value = initialConfig.top;
    }
    document.getElementById('loading').hidden = true;
    document.getElementById('output').hidden = false;
    this.reset(true);
  }

  update() {
    this.updateState();
    this.painter.paintMusic(this.data.music);

    // If there's no attention to paint, bail.
    if (this.step === -1) {
      return;
    }
    const ret = this._updateForStep(this.step);
    this.maybeUpdateOtherVoicesForStep(this.step);
    return ret;
  }

  paintAttentionForRects(rects) {
    this.painter.paintMusic(this.data.music);
    if (rects) {
      for (let i = 0; i < rects.length; i++) {
        this._updateForStep(parseInt(rects[i].dataset.index));
      }
    }
  }

  _updateForStep(step) {
    if (this.head === -1) {
      // All heads mode.
      const checkedStatuses = [];
      const checkboxes = [...document.querySelectorAll('#headColors input[type="checkbox"]')];
      checkboxes.map(x => checkedStatuses.push(x.checked));

      if (this.hasTwoAttentions) {
        // Paint each of the two attentions once.
        // Both weights paint the same step, so it's fine to
        // return the status of either.
        const globalHeadsData = this.data.global.layers[this.layer].heads;
        const scaledGlobalHeadsData = this.data.global.layers[this.layer].scaledHeads;
        this.painter.paintAllTheAttention(globalHeadsData, scaledGlobalHeadsData, checkedStatuses, step, GLOBAL_COLORS_ALL, 0);

        // Change these rects to be a different "active" colour.
        // const rects = document.getElementById('music').querySelectorAll('rect.attention-all');
        // for (let i = 0; i < rects.length; i++) {
        //   rects[i].classList.add('second');
        // }

        const localHeadsData = this.data.local.layers[this.layer].heads;
        const scaledLocalHeadsData = this.data.local.layers[this.layer].scaledHeads;
        return this.painter.paintAllTheAttention(localHeadsData, scaledLocalHeadsData, checkedStatuses, step, LOCAL_COLORS_ALL, 1);
      } else {
        //const headsData = this.data.layers[this.layer].heads;
        const scaledData = this.data.layers[this.layer].scaledHeads;
        return this.painter.paintAllTheAttention(null, scaledData, checkedStatuses, step, this.weirdMode? SINGLE_COLORS_BLUE : COLORS);
      }

    } else {
      // Individual heads mode.
      if (this.hasTwoAttentions) {
        const globalStepData = this.data.global.layers[this.layer].heads[this.head][step];
        this.painter.paintAttention(globalStepData, step, GLOBAL_COLORS_SINGLE[this.head], 0);

        const localStepData = this.data.local.layers[this.layer].heads[this.head][step];
        return this.painter.paintAttention(localStepData, step, LOCAL_COLORS_SINGLE[this.head], 1);
      } else {
        const stepData = this.data.layers[this.layer].scaledHeads[this.head][step];
        return this.painter.paintAttention(stepData, step, COLORS[this.head]);
      }
    }
  }

  updateState() {
    this.layers.value = this.layer;
    this.heads.value = this.head === -1 ? 'all' : this.head;
    this.stepText.textContent = this.step;
  }

  reset(keepStep) {
    this.updateState();
    this.maybeUpdateAllHeadsSelector(this.head);

    const checkedStatuses = [];
    const checkboxes = [...document.querySelectorAll('#headColors input[type="checkbox"]')];
    checkboxes.map(x => checkedStatuses.push(x.checked));
    //this.painter.paintHeatMap(this.data.layers[this.layer].heads, this.head, checkedStatuses, COLORS);

    if (keepStep) {
      this.update();
    } else {
      this.painter.paintMusic(this.data.music);
      this.step = -1;
    }
  }

  play() {
    if (this.isPlaying && this.step < this.numSteps - 1) {
      this.goRight();
      setTimeout(() => this.play(), parseInt(document.getElementById('playSpeedInput').value));
    } else {
      this.isPlaying = false;
    }
  }

  musicClicked(event) {
    if (event.target.localName === 'rect') {
      this.step = parseInt(event.target.dataset.index);
      window.location.hash = `step=${this.step}`;
      this.update();
    }
  }

  maybeUpdateOtherVoicesForStep(step) {
    if (this.painter.config.highlightWholeStep &&
        (this.type === TYPES.BACH || this.type === TYPES.DOUBLE)) {
      let prevStep = step - 1;
      let currentVoice = prevStep % 4;
      while (currentVoice >= 0) {
        this._updateForStep(prevStep);
        currentVoice--;
        prevStep--;
      }
      let nextStep = step + 1;
      currentVoice = nextStep % 4;
      while (currentVoice <= 3) {
        this._updateForStep(nextStep);
        currentVoice++;
        nextStep++;
      }
    }
  }

  heatmapClicked(event) {
    if (event.target.localName === 'rect') {
      this.step = parseInt(event.target.dataset.index);
      this.update();
    }
  }

  onKeyDown(event) {
    const allowed = [27,37,38,39,40];
    if (event.target.localName === 'input' || allowed.indexOf(event.keyCode) === -1) {
      return;
    }
    event.preventDefault();
    switch (event.keyCode) {
      case 27:  // esc
        reset();
        break;
      case 37:  // left arrow
        this.goLeft();
        break
      case 39:  // right arrow
        this.goRight();
        break;
      case 38:  // up arrow
        this.head = Math.max(0, this.head - 1);
        this.update();
        break;
      case 40:  // down arrow
        this.head = Math.min(this.numHeads - 1, this.head + 1);
        this.update();
        break;
    }
  }

  goLeft() {
    // With the performance format, we also have non-note events which
    // we want to skip.
    let paintingOk = false;
    while (!paintingOk) {
      this.step = Math.max(0, this.step - 1);
      paintingOk = this.update();
    }
  }

  goRight() {
    if (this.step === this.numSteps - 1 || isNaN(this.step)) {
      return;
    }

    if (this.type === TYPES.BACH) {
      this.step = Math.min(this.numSteps - 1, this.step + 1);
      this.update();
      return;
    }

    // With the performance format, we also have non-note events which
    // we want to skip.
    let paintingOk = false;
    while (!paintingOk) {
      this.step = Math.min(this.numSteps -1, this.step + 1);
      paintingOk = this.update();
      // Don't go in an infinite loop at the end.
      if (this.step === this.numSteps - 1) {
        paintingOk = true;
      }
    }
  }

  initHeads(num) {
    this.numHeads = num;
    this.heads.onchange = () => {
      this.head = this.heads.value === 'all' ? -1 : this.heads.value;
      this.reset(true);
    }
    this.heads.innerHTML = '';
    for (let i = 0; i < num; i++) {
      this.heads.appendChild(makeOption(i));
    }
    this.heads.appendChild(makeOption('all'));
  }

  initLayers(num) {
    this.numLayers = num;
    this.layers.onchange = () => {
      this.layer = this.layers.value;
      this.reset(true);
    }
    this.layers.innerHTML = '';
    for (let i = 0; i < num; i++) {
      this.layers.appendChild(makeOption(i));
    }
    this.layer = num - 1;
  }

  maybeUpdateAllHeadsSelector(head) {
    this.headColors.innerHTML = '';
    if (head === -1) {
      for (let i = 0; i < COLORS.length; i++) {
        this.headColors.appendChild(makeHeadSelector(i, () => this.update()));
      }
    }
  }

  /****************
   * UI Listeners.
   ****************/
  initUIListeners(kind) {
    // Generic.
    cutoffInput.addEventListener('change', (event) => {
      this.painter.config.weightCutoff = parseFloat(event.target.value);
      this.reset(true);
    });
    epsilonInput.addEventListener('change', (event) => {
      this.painter.config.epsilon = parseFloat(event.target.value);
      this.reset(true);
    });
    topOnlyInput.addEventListener('change', (event) => {
      this.painter.config.isTop = event.target.checked;
      this.reset(true);
    });
    topAmountInput.addEventListener('change', (event) => {
      this.painter.config.topNumber = parseInt(event.target.value);
      this.reset(true);
    });
    noteHeightInput.addEventListener('change', (event) => {
      this.painter.config.noteHeight = parseFloat(event.target.value);
      this.painter.updateWidth();
      this.reset(true);
    });
    circleInput.addEventListener('change', (event) => {
      this.painter.config.isCircles = event.target.checked;
      this.reset(true);
    });
    tempoInput.addEventListener('change', (event) => {
      this.tempo = parseInt(event.target.value);
    });
    noteMarginInput.addEventListener('change', (event) => {
      this.painter.config.noteMargin = parseFloat(event.target.value);
      this.painter.updateWidth();
      this.reset(true);
    });
    weirdModeInput.addEventListener('change', (event) => {
      this.weirdMode = this.painter.config.weirdMode = event.target.checked;
      if (this.painter.config.weirdMode) {
        music.setAttribute('weird-mode', true);
      } else {
        music.removeAttribute('weird-mode');
      }
      this.reset(true);
    });
    noPathsInput.addEventListener('change', (event) => {
      this.painter.config.noPaths = event.target.checked;
      if (this.painter.config.noPaths) {
        music.setAttribute('no-paths', true);
      } else {
        music.removeAttribute('no-paths');
      }
      this.reset(true);
    });
    if (kind === TYPES.BACH || kind === TYPES.DOUBLE) {
      noteWidthInput.addEventListener('change', (event) => {
        this.painter.config.noteWidth = parseFloat(event.target.value);
        this.painter.updateWidth();
        this.reset(true);
      });
      highlightStepInput.addEventListener('change', (event) => {
        this.painter.config.highlightWholeStep = event.target.checked;
        if (event.target.checked) {
          music.setAttribute('whole-step', true);
        } else {
          music.removeAttribute('whole-step');
        }
        this.reset(true);
      });
    } else if (kind === TYPES.PERFORMANCE) {
      timeScaleInput.addEventListener('change', (event) => {
        this.painter.config.timeScale = parseFloat(event.target.value);
        this.painter.updateWidth();
        this.reset(true);
      });
      greyLinesInput.addEventListener('change', (event) => {
        this.painter.config.hideGreyLines = event.target.checked;
        this.reset(true);
      });
    }
  }

  hashChanged() {
    const hashParams = getLocationHash();
    if (hashParams.step) {
      this.step = parseInt(hashParams.step);
      this.reset(true);
    }
  }
}
