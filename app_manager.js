import { PainterBach } from './painter_bach.js';
import { PainterPerformance } from './painter_performance.js';
import { TYPES, 
        COLORS, 
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

    this.painter = null;

    // Store some elements we need to update often.
    this.heads = document.getElementById('heads');
    this.layers = document.getElementById('layers');
    this.stepText = document.getElementById('stepText');
    this.headColors = document.getElementById('headColors');
    
    // UI listeners
    document.body.addEventListener('keydown', (event) => this.onKeyDown(event));
    document.getElementById('music').addEventListener('click', 
        (event) => this.svgClicked(event));
  }

  init(data, kind) {
    this.data = data;
    this.hasTwoAttentions = kind === TYPES.DOUBLE;
    if (kind === TYPES.BACH || kind === TYPES.DOUBLE) {
      this.painter = new PainterBach(
          document.getElementById('music'), 
          data.minPitch, data.maxPitch, data.steps);
    } else if (kind === TYPES.PERFORMANCE) {
      this.painter = new PainterPerformance(
          document.getElementById('music'),
          data.minPitch, data.maxPitch, data.steps);
    } 
    
    this.initLayers(data.numLayers);
    this.initHeads(data.numHeads);
    this.initUIListeners(kind);
    this.numSteps = data.sequenceLength;

    this.reset();
  }

  update() {
    this.updateState();
    this.painter.paintMusic(this.data.music);

    // If there's no attention to paint, bail.
    if (this.step === -1) {
      return;
    }

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
        this.painter.paintAllTheAttention(globalHeadsData, checkedStatuses, this.step, GLOBAL_COLORS_ALL);
        
        // Change these rects to be a different "active" colour.
        const rects = document.getElementById('music').querySelectorAll('rect.attention-all');
        for (let i = 0; i < rects.length; i++) {
          rects[i].classList.add('second');
        }
        
        const localHeadsData = this.data.local.layers[this.layer].heads;
        return this.painter.paintAllTheAttention(localHeadsData, checkedStatuses, this.step, LOCAL_COLORS_ALL);
      } else {
        const headsData = this.data.layers[this.layer].heads;
        return this.painter.paintAllTheAttention(headsData, checkedStatuses, this.step, COLORS);
      }
      
    } else {
      // Individual heads mode.
      if (this.hasTwoAttentions) {
        const globalStepData = this.data.global.layers[this.layer].heads[this.head][this.step];
        this.painter.paintAttention(globalStepData, this.step, GLOBAL_COLORS_SINGLE[this.head]); 
        
        const localStepData = this.data.local.layers[this.layer].heads[this.head][this.step];
        return this.painter.paintAttention(localStepData, this.step, LOCAL_COLORS_SINGLE[this.head]);      
      } else {
        const currentStepData = this.data.layers[this.layer].heads[this.head][this.step];
        return this.painter.paintAttention(currentStepData, this.step, COLORS[this.head]);
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

    this.painter.paintMusic(this.data.music);
    this.maybeUpdateAllHeadsSelector(this.head);

    if (keepStep) {
      this.update();
    } else {
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

  svgClicked(event) {
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
    // With the performance format, we also have non-note events which
    // we want to skip.
    let paintingOk = false;
    while (!paintingOk) {
      this.step = Math.min(this.numSteps - 1, this.step + 1);
      paintingOk = this.update();
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
      this.painter.config.noteHeight = parseInt(event.target.value);
      this.painter.updateWidth();
      this.reset(true);
    });
    circleInput.addEventListener('change', (event) => {
      this.painter.config.isCircles = event.target.checked;
      this.reset(true);
    });

    if (kind === TYPES.BACH || kind === TYPES.DOUBLE) {
      noteWidthInput.addEventListener('change', (event) => {
        this.painter.config.noteWidth = parseInt(event.target.value);
        this.painter.updateWidth();
        this.reset(true);
      });
    } else if (kind === TYPES.PERFORMANCE) {
      timeScaleInput.addEventListener('change', (event) => {
        this.painter.config.timeScale = parseInt(event.target.value);
        this.painter.updateWidth();
        this.reset(true);
      });
      greyLinesInput.addEventListener('change', (event) => {
        this.painter.config.hideGreyLines = event.target.checked;
        this.reset(true);
      });

    }
  }
}