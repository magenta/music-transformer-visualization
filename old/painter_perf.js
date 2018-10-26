class PerformancePainter extends BasicPainter {
  constructor(musicEl, minPitch, maxPitch, steps) {
    super(musicEl, minPitch, maxPitch, steps);
    this.timeColor = 'rgb(0, 0, 0)';
  }

  updateWidth() {
    this.WIDTH = this.steps * TIME_SCALE + 50;;
    this.HEIGHT = (this.maxPitch - this.minPitch) * NOTE_HEIGHT
        + TIME_OFFSET + VEL_OFFSET;
    this.svg.setAttribute('width', this.WIDTH);
    this.svg.setAttribute('height', this.HEIGHT);
  }

  paintMusic(events) {
    this.clear();
    const downNotes = {};
    let currentTime = 0;

    // Draw a line to separate the velocities.
    this.svg.appendChild(this.makeLine(
      0, this.HEIGHT - VEL_OFFSET, this.WIDTH, 2, this.timeColor));

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.type === 'time-shift') {
        const value = event.steps * TIME_SCALE;
        // Draw a line forward to the new time shift.
        this.drawTimeShiftLine(currentTime, value);

        // Draw the current time.
        currentTime += value;
        this.drawTimeShiftBox(currentTime, event.steps, i);

        // Continue this line on the whole music too.
        if (!HIDE_GREY) {
          this.svg.appendChild(
            this.makeRect(null, currentTime, TIME_HEIGHT, 2, this.HEIGHT, 'rgba(0, 0, 0, 0.03)', i));
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
        this.drawVelocityBox(event.velocityBin, currentTime, i);
      }
    }

    // We might have some down notes that didn't get upped, so do that now.
    for (let pitch in downNotes) {
      if (downNotes[pitch]) {
        this.finishDownNote(downNotes, pitch, currentTime);
      }
    }
    
    this.placeholder = music.firstElementChild.nextElementSibling;
  }

  drawTimeShiftLine(time, value) {
    this.svg.appendChild(this.makeLine(
      time, TIME_Y + TIME_HEIGHT/2, value, 2, this.timeColor));
  }

  drawTimeShiftBox(time, value, index) {
    const rect = this.makeRect(index, time, TIME_Y, TIME_WIDTH, TIME_HEIGHT, this.timeColor, value);
    rect.setAttribute('class', rect.getAttribute('class') + ' time');
    this.svg.appendChild(rect);
  }

  drawNoteBox(pitch, x, w, index) {
    const y = this.getPositionForPitch(pitch);
    const rect = this.makeRect(index, x, y, w, NOTE_HEIGHT, this.musicColor, pitch);
    rect.setAttribute('class', rect.getAttribute('class') + ' note');
    this.svg.appendChild(rect);
  }

  drawVelocityBox(vel, x, index) {
    const opacityBaseline = 0.2;  // Shift all the opacities up a little.
    const opacity = vel / 100 + opacityBaseline;

    const rect = this.makeRect(index, x, this.HEIGHT - 2 * VEL_Y,
      VEL_WIDTH, VEL_HEIGHT, `rgba(0, 0, 0, ${opacity})`, vel);
    rect.setAttribute('class', rect.getAttribute('class') + ' vel');
    this.svg.appendChild(rect);
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

  getValueFromAction(action, name) {
    const re = new RegExp(`${name}(.*)`, 'g');
    const result = re.exec(action);
    return parseInt(result[1]);
  }

  paintAttention(sequence, step, colors) {
    if (!sequence)
      return;

    // First scale the values so the colours are better
    const scaledSequence = this.scaleArray(sequence);

    // Paint the step we're looking at.
    const currentEL = document.querySelector(`rect[data-index="${step}"]`);
    const currentType = currentEL.getAttribute('class').replace('hover ','');

    currentEL.setAttribute('class', 'current');
    const current = this.getConnectorLocation(currentEL);

    for (let i = 0; i <= step; i++) {
      const el = document.querySelector(`rect[data-index="${i}"]`);
      
      if (el === null) {
        console.log(`Could not find the rect for index ${i}`);
        continue;
      }
      
      const thisType = el.getAttribute('class').replace('hover ','');

      // Skip not-our-kind if needed.
      if (SELF_ATTN_ONLY && thisType !== currentType) {
        continue;
      }

      el.innerHTML = '';
      const title = document.createElementNS(svgNS, 'title');
      title.textContent = `${sequence[i]}`;
      el.appendChild(title);
      if (sequence[i] >= EPSILON) {
        const newFill = this.getColor(colors, scaledSequence[i]);
        el.setAttribute('fill', newFill);

        if (scaledSequence[i] > WEIGHT_CUTOFF) {
          const thisOne = this.getConnectorLocation(el);
          // Put the paths at the beginning, so that the rects can sit on top.
          const path = this.makePath(current, thisOne, 0, scaledSequence[i], colors.max);
          this.svg.insertBefore(path, this.placeholder);
        }
      } else {
        el.setAttribute('fill', 'rgb(238, 238, 238)');
      }
    }
  }

  paintAllTheAttention(sequences, checkedStatuses, step, colors) {
    // This may be a made up note-off for the end of the performance
    // that doesn't have any data.
    if (!step) {
      return;
    }
    
    // Paint the step we're looking at.
    const currentEl = document.querySelector(`rect[data-index="${step}"]`);
    const currentType = currentEl.getAttribute('class').replace('hover ','');
    currentEl.setAttribute('class', 'current-all');
    
    // Scale it a bit unless it's a time.
    if (currentType !== 'time') {
      const x = parseInt(currentEl.getAttribute('x'));
      const y = parseInt(currentEl.getAttribute('y'));
      currentEl.setAttribute('transform', `translate(${x} ${y}) scale(1 2.5) translate(-${x} -${y+2})`);
    }
    
    const current = this.getConnectorLocation(currentEl);
  
    let sortedAttentions = this.getSortedAttentionsIfNeeded(step, sequences, checkedStatuses);
    
    if (IS_TOP) {
      let count = 0;
      // Go through the top weights, only paint those.
      for (let i = 0; i < sortedAttentions.length; i++) {
        if (count === TOP_NUMBER) {
          break;
        }
        const attn = sortedAttentions[i];
        const el = document.querySelector(`rect[data-index="${attn.step}"]`);
        
        if (el === null) {
          console.log(`Could not find the rect for index ${attn.step}`);
          continue;
        }
        
        const thisType = el.getAttribute('class').replace('hover ','').trim();
        // Skip not-our-kind if needed.
        if (SELF_ATTN_ONLY && thisType !== currentType) {
          continue;
        }
        
        el.setAttribute('class', 'attention-all');
        
        // Scale it a bit unless it's a time because that looks weird
        if (thisType !== 'time' && thisType !== 'attention-all') {
          const x_ = parseInt(el.getAttribute('x'));
          const y_ = parseInt(el.getAttribute('y'));
          el.setAttribute('transform', `translate(${x_} ${y_}) scale(1 2.5) translate(-${x_} -${y_+2})`);
        }
        
        const thisOne = this.getConnectorLocation(el);
        
        // Put the paths at the beginning, so that the rects can sit on top.
        const path = this.makePath(current, thisOne, attn.head, attn.scaledValue + 0.6, colors[attn.head].max);
        this.svg.insertBefore(path, this.placeholder);
        count++;
      }
    } else {
      // Go through all heads, paint anythign that's above the threshold.
      for (let head = 0; head < sequences.length; head++) {
        const scaledSequence = this.scaleArray(sequences[head][step]);

        // Only paint the biggest weights for this head, and only if it's on.
        if (!checkedStatuses[head]) {
          continue;
        }

        for (let i = 0; i < step; i++) {
          const el = document.querySelector(`rect[data-index="${i}"]`);

          if (el === null) {
            console.log(`Could not find the rect for index ${i}`);
            continue;
          }

          const thisType = el.getAttribute('class').replace('hover ','').trim();

          // Skip not-our-kind if needed.
          if (SELF_ATTN_ONLY && thisType !== currentType) {
            continue;
          }

          if (scaledSequence[i] > WEIGHT_CUTOFF) {
            el.setAttribute('class', 'attention-all');
            
            // Scale it a bit unless it's a time because that looks weird
            if (thisType !== 'time' && thisType !== 'attention-all') {
              const x_ = parseInt(el.getAttribute('x'));
              const y_ = parseInt(el.getAttribute('y'));
              el.setAttribute('transform', `translate(${x_} ${y_}) scale(1 2.5) translate(-${x_} -${y_+2})`);
            }
            
            const thisOne = this.getConnectorLocation(el);
            //this.svg.appendChild(this.makePath(current, thisOne, head, scaledSequence[i], colors[head].max));
            // Put the paths at the beginning, so that the rects can sit on top.
            const path = this.makePath(current, thisOne, head, scaledSequence[i], colors[head].max);
            this.svg.insertBefore(path, this.placeholder);
          } else if (!el.hasAttribute('class')) {
            el.setAttribute('class', 'no-attention-all');
          }
        }
      }
    }
    
  }

  getPositionForPitch(pitch) {
    const y = super.getPositionForPitch(pitch);
    return y - VEL_OFFSET;
  }
  
  getSortedAttentionsIfNeeded(step, sequences, checkedStatuses) {
    let sortedAttentions = [];
    
    if (IS_TOP) {
      for (let head = 0; head < sequences.length; head++) {
        // Skip this head if it's unchecked.
        if (!checkedStatuses[head]) {
          continue;
        }
        const seq = sequences[head][step];
        
        for (let s = 0; s < seq.length; s++) {
          if (seq[s] > EPSILON) {
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
    // Be generous
    for (let i = 0; i < sortedAttentions.length; i++) {
      subset.push(sortedAttentions[i]);
      subsetValues.push(sortedAttentions[i].value);
    }
    
    // Scale them and add them back.
    subsetValues = this.scaleArray(subsetValues);
    for (let i = 0; i < sortedAttentions.length; i++) {
      subset[i].scaledValue = subsetValues[i];
    }
    return subset;
  }
}
