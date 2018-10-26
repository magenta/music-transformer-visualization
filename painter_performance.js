import {PainterBase} from './painter_base.js';
import {makeRect, makeLine} from './utils.js';
export {PainterPerformance};

const NUM_VELOCITY_BINS = 32;
const VELOCITY_SVG_HEIGHT = 80;

class PainterPerformance extends PainterBase {
  constructor(svgEl, minPitch, maxPitch, steps) {
    super(svgEl, minPitch, maxPitch, steps);
    this.velocitySVG = document.getElementById('velocities');

    this.config.noteHeight = 8;
    this.config.hideGreyLines = false;
    this.config.selfAttnOnly = true;
    this.config.timeScale = 1;

    this.updateWidth();
  }

  updateWidth() {
    this.width = this.steps * this.config.timeScale + 50;
    this.height = (this.maxPitch - this.minPitch) * this.config.noteHeight;
    this.svg.setAttribute('width', this.width);
    this.svg.setAttribute('height', this.height);
    this.velocitySVG.setAttribute('height', VELOCITY_SVG_HEIGHT);
    this.velocitySVG.setAttribute('width', this.width);
  }

  paintMusic(events) {
    this.clear();
    this.velocitySVG.innerHTML = '';
    const downNotes = {};
    let currentTime = 0;
    let previousVelocity = {x: 0, y: VELOCITY_SVG_HEIGHT};
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (event.type === 'time-shift') {
        // Advance the time clock.
        currentTime +=  event.steps * this.config.timeScale;
        
        // Continue this line on the whole music too.
        if (!this.config.hideGreyLines) {
          this.svg.appendChild(makeRect(null, currentTime, 0, 2, this.height, 'rgba(0, 0, 0, 0.03)', i));
        }
      } else if (event.type === 'note-on') {
        downNotes[event.pitch] = {time: currentTime, i:i};

        // Make a small fake note so that we can point to the note-on.
        // This will get extended to a correct width when we hit the note-off
        this.drawNoteBox(event.pitch, currentTime, 10, i);
      } else if (event.type === 'note-off') {
        this.finishDownNote(downNotes, event.pitch, currentTime, i);
        downNotes[event.pitch] = null;
      } else if (event.type === 'velocity-change') {
        const value = event.velocityBin;
        const y = VELOCITY_SVG_HEIGHT -  2 * value;
        const line = makeLine(previousVelocity.x, previousVelocity.y, currentTime, y, value);
        this.velocitySVG.appendChild(line);
        previousVelocity.x = currentTime;
        previousVelocity.y = y;
      }
    }

    // Finish the velocity graph.
    const line = makeLine(previousVelocity.x, previousVelocity.y, currentTime, VELOCITY_SVG_HEIGHT, 0);
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
      console.log(`Found a note-off without a matching note-on at step ${index} for pitch ${pitch}. Skipping!`);
      return;
    }
    let halfway =  (currentTime - note.time) / 2;

    if (halfway === 0) {
      halfway = 20;
    }
    // The note-off starts from the middle of the whole note span.
    this.drawNoteBox(pitch, note.time + halfway, halfway, index);

    // Update the corresponding note-on to end at the halfway point.
    const noteOn = document.querySelector(`rect[data-index="${note.i}"]`);
    noteOn.setAttribute('width', halfway);
  }
}
