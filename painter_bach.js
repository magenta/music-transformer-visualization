import {PainterBase} from './painter_base.js';
export {PainterBach};

const NUM_VOICES = 4;

class PainterBach extends PainterBase {
  constructor(svgEl, minPitch, maxPitch, steps) {
    super(svgEl, minPitch, maxPitch, steps);

    // Add some Bach-specific settings.
    this.config.noteHeight = 8;
    this.config.noteWidth = 20;

    this.updateWidth();
  }

  updateWidth() {
    this.width = this.steps * this.config.noteWidth;
    // Add some padding at the top.
    this.height = (this.maxPitch - this.minPitch) * this.config.noteHeight + this.config.svgPadding;
    this.svg.setAttribute('width', this.width);
    // Add some padding at the bottom (but dont include it in math calculations)
    this.svg.setAttribute('height', this.height + this.config.svgPadding);
  }

  paintMusic(pitches) {
    this.clear();
    
    // There are 4 voices, and their pitches come in sequence.
    let step = 0;
    let voice = 0;
    for (let i = 0; i < pitches.length; i++) {
      const x = step * this.config.noteWidth;
      const rect = this.drawNoteBox(pitches[i], x, this.config.noteWidth, i);
      rect.setAttribute('pitch', pitches[i]);
      rect.setAttribute('startStep', step);
      rect.setAttribute('endStep', step+1);
      
      voice++;
      // Did we finish a step?
      if (voice === NUM_VOICES) {
        voice = 0;
        step++;
      }
    }
  }
}
