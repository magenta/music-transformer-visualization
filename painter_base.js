import {svgNS, scaleArray, makeRect, makePath, scaleNote, 
        getConnectorLocation, getColorForWeight} from './utils.js';
export {PainterBase}

class PainterBase {
  constructor(svgEl, minPitch, maxPitch, steps) {
    this.svg = svgEl;
    this.steps = steps;
    this.musicColor = 'rgb(0, 0, 0)'; //'rgb(245, 0, 87)';
    
    this.config = {
      epsilon: 0.00001,
      weightCutoff:  0.5,
      isTop: false,
      isCircles: true,
      topNumber: 10,
      svgPadding: 100
    };

    // Add some padding.
    this.minPitch = minPitch - 2;
    this.maxPitch = maxPitch + 2;
  }

  updateWidth() {
    throw new Error('updateWidth() not implemented', this);
  }

  clear() {
    this.svg.innerHTML = '';
  }

  paintMusic(pitches) {
    throw new Error('paintMusic() not implemented', this);
  }

  paintAttention(sequence, step, colors) {
    if (!sequence) {
      return;
    }

    // First scale the values so the colours are better.
    const scaledSequence = scaleArray(sequence);

    // Paint the step we're looking at.
    const [activeType, activeConnector] = this.activateNoteAtStep(step, 'current');
    if (!activeConnector)
      return false;

    for (let i = 0; i <= step; i++) {
      // Find the rect for this step.
      const el = this.findNoteAtStep(i, activeType);
      if (el === null) {
        continue;
      }
      this.setTitleForNote(el, sequence[i]);
     
      if (sequence[i] >= this.config.epsilon) {
        el.setAttribute('fill', getColorForWeight(scaledSequence[i], colors));
       
         // If it's big enough to get a tentacle, draw it.
        if (scaledSequence[i] > this.config.weightCutoff) {
          this.drawAttentionPath(getConnectorLocation(el), activeConnector, scaledSequence[i], colors.max );
        }
      } else if (el.getAttribute('fill').trim() == 'rgb(0, 0, 0)') {
        el.setAttribute('fill', 'rgb(238, 238, 238)');
      }
    }
    return true;
  }

  paintAllTheAttention(sequences, checkedStatuses, step, colors) {
    // This may be a made up note-off for the end of the performance
    // that doesn't have any data.
    if (!step) {
      return;
    }

    // Paint the step we're looking at.
    const [activeType, activeConnector] = this.activateNoteAtStep(step, 'current-all');
    if (!activeConnector)
      return false;

    if (this.config.isTop) {
      const sortedAttentions = this.getSortedAttentionsIfNeeded(step, sequences, checkedStatuses);
      this.paintTopAttention(sortedAttentions, activeType, activeConnector, colors);
    } else {
      for (let head = 0; head < sequences.length; head++) {
        const scaledSequence = scaleArray(sequences[head][step]);
        // Only paint the biggest weights for this head, and only if it's on.
        if (checkedStatuses[head]) {
          this.paintHeadAttention(scaledSequence, head, step, activeType, activeConnector, colors);
        }
      }
    }
    return true;
  }

  paintTopAttention(sortedAttentions, activeType, activeConnector, colors) {
    // Go through the top weights, only paint those.
    let count = 0;
    for (let i = 0; i < sortedAttentions.length; i++) {
      // If you've already painted enough attentions, stop.
      if (count === this.config.topNumber) {
        break;
      }
      const attn = sortedAttentions[i];

      // Find the rect for this step.
      const el = this.findNoteAtStep(attn.step, activeType);
      if (el === null) {
        continue;
      }
      el.setAttribute('class', 'attention-all');
      scaleNote(el);
      this.drawAttentionPath(getConnectorLocation(el), activeConnector, 
          attn.scaledValue + 0.6, colors[attn.head].max, attn.head);
      count++;
    }
  }

  paintHeadAttention(scaledSequence, head, step, activeType, activeConnector, colors) {
    for (let i = 0; i < step; i++) {
      // Find the rect for this step.
      const el = this.findNoteAtStep(i, activeType);
      if (el === null) {
        continue;
      }
      
      if (scaledSequence[i] > this.config.weightCutoff) {
        el.setAttribute('class', 'attention-all');
        scaleNote(el);
        this.drawAttentionPath(getConnectorLocation(el), activeConnector, scaledSequence[i], colors[head].max, head);
      } else if (!el.hasAttribute('class')) {
        el.setAttribute('class', 'no-attention-all');
      }
    }
  }

  getPositionForPitch(pitch) {
    const whiteNotes = [21,23,24,26,28,29,31];
    // Since we scaled the canvas to not include pitches we're
    // not painting, figure out where this actually goes.
    const offset =  pitch - this.minPitch;
    // If it's a white note, it's on the pitch, otherwise it's half of.
    if (
        ((pitch - whiteNotes[0]) % 12 === 0) ||
        ((pitch - whiteNotes[1]) % 12 === 0) ||
        ((pitch - whiteNotes[2]) % 12 === 0) ||
        ((pitch - whiteNotes[3]) % 12 === 0) ||
        ((pitch - whiteNotes[4]) % 12 === 0) ||
        ((pitch - whiteNotes[5]) % 12 === 0) ||
        ((pitch - whiteNotes[6]) % 12 === 0)) {
      return this.height - offset * this.config.noteHeight;
    } else {
      return this.height - offset * this.config.noteHeight - this.config.noteHeight/2 ;
    }
  }

  getSortedAttentionsIfNeeded(step, sequences, checkedStatuses) {
    let sortedAttentions = [];
    
    if (this.config.isTop) {
      for (let head = 0; head < sequences.length; head++) {
        // Skip this head if it's unchecked.
        if (!checkedStatuses[head]) {
          continue;
        }
        const seq = sequences[head][step];
        
        for (let s = 0; s < seq.length; s++) {
          if (seq[s] > this.config.epsilon) {
            sortedAttentions.push({head, value: seq[s], step: s});
          }
        } 
      }
    }
    // Sort this array.
    sortedAttentions.sort(function(a, b) {
      return b.value - a.value;
    });
    
    // Get only the top we care about;
    let subset = [];
    let subsetValues = [];
    // Be generous.
    for (let i = 0; i < sortedAttentions.length; i++) {
      subset.push(sortedAttentions[i]);
      subsetValues.push(sortedAttentions[i].value);
    }
    
    // Scale them and add them back.
    subsetValues = scaleArray(subsetValues);
    for (let i = 0; i < sortedAttentions.length; i++) {
      subset[i].scaledValue = subsetValues[i];
    }
    return subset;
  }

  activateNoteAtStep(step, className) {
    const el = this.svg.querySelector(`rect[data-index="${step}"]`);
    if (!el) {
      return [null, null];
    }
    const type = el.getAttribute('class').replace('hover ','');
    const connector = getConnectorLocation(el);
    el.setAttribute('class', className);
    scaleNote(el);
    return ['note', connector];
  }

  findNoteAtStep(step, activeType) {
    const el = this.svg.querySelector(`rect[data-index="${step}"]`);
    if (el === null) {
      //console.log(`Could not find the rect for index ${step}`);
      return el;
    }
    // For performance, we don't want to point to non-notes.
    const thisType = el.getAttribute('class').replace('hover ','');
    if (thisType !== activeType) {
      return null;
    }
    return el;
  }

  setTitleForNote(el, text) {
    el.innerHTML = '';
    const title = document.createElementNS(svgNS, 'title');
    title.textContent = text;
    el.appendChild(title);
  }

  drawAttentionPath(from, to, value, color, offset=0) {
    this.svg.appendChild(makePath(
      to, from, offset, value, color, this.config.noteWidth, this.config.isCircles));
  }

  drawNoteBox(pitch, x, w, index) {
    const y = this.getPositionForPitch(pitch);
    const rect = makeRect(index, x, y, w, this.config.noteHeight, this.musicColor, pitch);
    rect.setAttribute('class', rect.getAttribute('class') + ' note');
    this.svg.appendChild(rect);
    return rect;
  }
  
}
