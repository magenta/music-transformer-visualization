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
import {makeLine, makeRect} from './utils.js';

export {PainterPerformance};

const NUM_VELOCITY_BINS = 32;
const VELOCITY_SVG_HEIGHT = 60;

class PainterPerformance extends PainterBase {
  constructor(svgEl, mapEl, minPitch, maxPitch, steps) {
    super(svgEl, mapEl, minPitch, maxPitch, steps);
    this.velocitySVG = document.getElementById('velocities');

    this.config.noteHeight = 8;
    this.config.hideGreyLines = true;
    this.config.selfAttnOnly = true;
    this.config.timeScale = 1;
    this.config.noteWidth = 20;

    this.updateWidth();
  }

  updateWidth() {
    this.width = this.steps * this.config.timeScale + 50;
    // Add some padding at the top.
    this.height = (this.maxPitch - this.minPitch) * this.config.noteHeight +
        this.config.svgPadding;

    this.svg.setAttribute('width', this.width);

    // Add some padding at the bottom (but dont include it in math calculations)
    this.svg.setAttribute('height', this.height + this.config.svgPadding);
    this.velocitySVG.setAttribute('height', VELOCITY_SVG_HEIGHT);
    this.velocitySVG.setAttribute('width', this.width);

    this.config.heatmapSquare = this.width / this.steps;
    this.heatmap.setAttribute('width', this.width);
    this.heatmap.setAttribute('height', this.config.heatmapSquare * this.steps);
  }

  paintMusic(events, fast) {
    if (!fast) {
      this._resetPaintMusic(events);
    } else {
      for (let key in this.stepToRectMap) {
        const rect = this.stepToRectMap[key];
        rect.setAttribute('class', 'hover note');
        rect.setAttribute('fill', 'rgb(0, 0, 0)');
        rect.removeAttribute('transform');
      }
      const paths = this.svg.getElementsByClassName('path');
      while(paths[0]) {
        paths[0].parentNode.removeChild(paths[0]);
      }
    }
  }

  _resetPaintMusic(events) {
    this.clear();
    this.stepToRectMap = {};

    this.velocitySVG.innerHTML = '';
    const downNotes = {};
    let currentTime = 0;
    let previousVelocity = {x: 0, y: VELOCITY_SVG_HEIGHT};
    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      if (event.type === 'time-shift') {
        // Advance the time clock.
        currentTime += event.steps * this.config.timeScale;

        // Continue this line on the whole music too.
        if (!this.config.hideGreyLines) {
          this.svg.appendChild(makeRect(
              null, currentTime, 0, 2, this.height, 'rgba(0, 0, 0, 0.03)', i));
        }
      } else if (event.type === 'note-on') {
        downNotes[event.pitch] = {time: currentTime, i: i};

        // Make a small fake note so that we can point to the note-on.
        // This will get extended to a correct width when we hit the note-off
        const rect = this.drawNoteBox(event.pitch, currentTime, 10, i);
        this.stepToRectMap[i] = rect;
        rect.setAttribute('stepStart', currentTime);
      } else if (event.type === 'note-off') {
        this.finishDownNote(downNotes, event.pitch, currentTime, i);
        downNotes[event.pitch] = null;
      } else if (event.type === 'velocity-change') {
        const value = event.velocityBin;
        const y = VELOCITY_SVG_HEIGHT - 2 * value;
        const line = makeLine(
            previousVelocity.x, previousVelocity.y, currentTime, y, value);
        this.velocitySVG.appendChild(line);
        previousVelocity.x = currentTime;
        previousVelocity.y = y;
      }
    }

    // Finish the velocity graph.
    const line = makeLine(
        previousVelocity.x, previousVelocity.y, currentTime,
        VELOCITY_SVG_HEIGHT, 0);
    this.velocitySVG.appendChild(line);
    // We might have some down notes that didn't get upped, so do that now.
    for (let pitch in downNotes) {
      if (downNotes[pitch]) {
        this.finishDownNote(downNotes, pitch, currentTime);
      }
    }
    this.placeholder = music.firstElementChild.nextElementSibling;
  }

  finishDownNote(notes, pitch, currentTime, index) {
    const note = notes[pitch];
    if (note === null) {
      //console.log(`Found a note-off without a matching note-on at step ${
      //    index} for pitch ${pitch}. Skipping!`);
      return;
    }
    let halfway = (currentTime - note.time) / 2;

    if (halfway === 0) {
      halfway = 20;
    }
    // The note-off starts from the middle of the whole note span.
    const rect = this.drawNoteBox(
        pitch, note.time + halfway, halfway - this.config.noteMargin, index);
    this.stepToRectMap[index] = rect;
    rect.setAttribute('stepEnd', currentTime);

    // Update the corresponding note-on to end at the halfway point.
    // const noteOn = document.querySelector(`rect[data-index="${note.i}"]`);
    const noteOn = this.stepToRectMap[note.i];
    noteOn.setAttribute('width', halfway);
  }
}
