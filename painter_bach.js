/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {PainterBase} from './painter_base.js';
export {PainterBach};

const NUM_VOICES = 4;

class PainterBach extends PainterBase {
  constructor(svgEl, mapEl, minPitch, maxPitch, steps, isDouble) {
    super(svgEl, mapEl, minPitch, maxPitch, steps);

    // Add some Bach-specific settings.
    this.config.noteHeight = 8;
    this.config.noteWidth = 20;

    if (isDouble) {
      this.config.svgPadding = 200;
    }

    this.updateWidth();
  }

  updateWidth() {
    this.width = this.steps * (this.config.noteWidth + this.config.noteMargin);

    // Add some padding at the top.
    this.height = (this.maxPitch - this.minPitch) * this.config.noteHeight + this.config.svgPadding;
    this.svg.setAttribute('width', this.width);

    // Add some padding at the bottom (but dont include it in math calculations)
    this.svg.setAttribute('height', this.height + this.config.svgPadding);

    this.config.heatmapSquare = this.width / this.steps;
    this.heatmap.setAttribute('width', this.width);
    this.heatmap.setAttribute('height', this.config.heatmapSquare * this.steps);
  }

  paintMusic(pitches) {
    this.stepToRectMap = {};
    this.clear();

    // There are 4 voices, and their pitches come in sequence.
    let step = 0;
    let voice = 0;
    for (let i = 0; i < pitches.length; i++) {
      const x = step * (this.config.noteWidth + this.config.noteMargin);
      const rect = this.drawNoteBox(pitches[i], x, this.config.noteWidth, i);
      this.stepToRectMap[i] = rect;
      rect.setAttribute('stepEnd', step+1);
      rect.setAttribute('stepStart', step);
      voice++;
      // Did we finish a step?
      if (voice === NUM_VOICES) {
        voice = 0;
        step++;
      }
    }
  }

}
