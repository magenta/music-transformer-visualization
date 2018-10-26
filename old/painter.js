class BasicPainter {
  constructor(svgEl, minPitch, maxPitch, steps) {
    this.svg = svgEl;
    this.steps = steps;
    this.musicColor = 'rgb(0, 0, 0)'; //'rgb(245, 0, 87)';

    // Add some padding.
    this.minPitch = minPitch - 2;
    this.maxPitch = maxPitch + 2;

    this.updateWidth();
    // it's first 128 note ons, then 128 note offs, then 100 timeshifts then 32 velocity bins
  }

  updateWidth() {
    this.WIDTH = this.steps * NOTE_WIDTH;
    this.HEIGHT = (this.maxPitch - this.minPitch) * NOTE_HEIGHT;
    this.svg.setAttribute('width', this.WIDTH);
    this.svg.setAttribute('height', this.HEIGHT);
  }

  clear() {
    this.svg.innerHTML = '';
  }

  paintMusic(pitches) {
    this.clear();
    //this.paintPianoLines();

    let step = 0;
    let voice = 0;
    for (let i = 0; i < pitches.length; i++) {
      const x = step * NOTE_WIDTH;
      const y = this.getPositionForPitch(pitches[i]);
      this.svg.appendChild(this.makeRect(i, x, y, NOTE_WIDTH, NOTE_HEIGHT, this.musicColor, pitches[i]));

      voice++;
      // Did we finish a step?
      if (voice === 4) {
        voice = 0;
        step++;
      }
    }
  }

  paintPianoLines() {
    const thickLines = [23,28];
    const whiteNotes = [21,/*23,*/24,26,/*28,*/29,31];

    for (let i = this.minPitch; i < this.maxPitch; i ++) {

      const y = this.getPositionForPitch(i);
      // There's definitely a better way to do this and i don't care
      if (((i - thickLines[0]) % 12 === 0) || ((i - thickLines[1]) % 12 === 0)) {

        this.svg.appendChild(this.makeLine(0, y, this.WIDTH, 3, '#CED7F4', i));
      } else if (
        ((i - whiteNotes[0]) % 12 === 0) ||
        ((i - whiteNotes[1]) % 12 === 0) ||
        ((i - whiteNotes[2]) % 12 === 0) ||
        ((i - whiteNotes[3]) % 12 === 0) ||
        ((i - whiteNotes[4]) % 12 === 0)) {
        this.svg.appendChild(this.makeLine(0, y, this.WIDTH, 1, '#CED7F4', i));
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
      return this.HEIGHT - offset * NOTE_HEIGHT;
    } else {
      return this.HEIGHT - offset * NOTE_HEIGHT - NOTE_HEIGHT/2 ;
    }
  }

  paintAttention(sequence, step, colors) {
    // First scale the values so the colours are better
    const scaledSequence = this.scaleArray(sequence);

    // Paint the step we're looking at.
    const currentEl = this.svg.querySelector(`rect[data-index="${step}"]`);
    currentEl.setAttribute('class', 'current');
    const current = this.getConnectorLocation(currentEl);

    for (let i = 0; i <= step; i++) {
      const el = this.svg.querySelector(`rect[data-index="${i}"]`);
      el.innerHTML = '';
      const title = document.createElementNS(svgNS, 'title');
      title.textContent = `${sequence[i]}`;
      el.appendChild(title);
      if (sequence[i] >= EPSILON) {
        const newFill = this.getColor(colors, scaledSequence[i]);
        el.setAttribute('fill', newFill);
        //el.setAttribute('stroke', newFill);

        if (scaledSequence[i] > WEIGHT_CUTOFF) {
          const thisOne = this.getConnectorLocation(el);
          this.svg.appendChild(this.makePath(current, thisOne, 0, scaledSequence[i], colors.max));
        }
      } else {
        el.setAttribute('fill', 'rgb(238, 238, 238)');
        //el.setAttribute('stroke', 'rgb(238, 238, 238)');
      }
    }
  }

  paintAllTheAttention(sequences, checkedStatues, step, colors) {
    // Paint the step we're looking at.
    const el = this.svg.querySelector(`rect[data-index="${step}"]`);
    el.setAttribute('class', 'current-all');
    const current = this.getConnectorLocation(el);

    for (let head = 0; head < sequences.length; head++) {
      const scaledSequence = this.scaleArray(sequences[head][step]);

      // Only paint the biggest weights for this head, and only if it's on.
      if (!checkedStatues[head]) {
        continue;
      }
      for (let i = 0; i < step; i++) {
        const el = this.svg.querySelector(`rect[data-index="${i}"]`);
        if (scaledSequence[i] > WEIGHT_CUTOFF) {
          el.setAttribute('class', 'attention-all');
          const thisOne = this.getConnectorLocation(el);
          this.svg.appendChild(this.makePath(current, thisOne, head, scaledSequence[i], colors[head].max));
        } else if (!el.hasAttribute('class')) {
          el.setAttribute('class', 'no-attention-all');
        }
      }
    }
  }

  makeRect(which, x, y, w, h, fill="red", pitch) {
    const rect = document.createElementNS(svgNS, 'rect');
    if (which !== null && which !== undefined) {
      rect.dataset.index = which;
      rect.setAttribute('class', 'hover');
    }
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', fill);

    const title = document.createElementNS(svgNS, 'title');
    title.textContent = pitch;
    rect.appendChild(title);
    return rect;
  }

  makeLine(x, y, w, h, color, pitch) {
    const line = document.createElementNS(svgNS, 'line');
    line.dataset.index = pitch;
    line.setAttribute('x1', x);
    line.setAttribute('y1', y);
    line.setAttribute('x2', x + w);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', h);
    const title = document.createElementNS(svgNS, 'title');
    title.textContent = pitch;
    line.appendChild(title);
    return line;
  }

  makePath(from, to, head, value, color) {
    const distX = Math.abs(to.x - from.x);
    const distY = Math.abs(to.x - from.x);
    const dirX = from.x < to.x ? 1 : -1;
    const dirY = from.y < to.y ? 1 : -1;

    const percentX = 0.5;
    const percentY = 0.25;
  
    // Bezier control for from point.    
    const x1 = from.x + dirX * (percentX * distX);
    const y1 = from.y; // from.y + dirY * (percentY * distY);

    // Bezier control for the second point.
    const x2 = to.x - dirX * ((1-percentX) * distX);
    const y2 = to.y; //to.y - dirY * ((1-percentY) * distY);

    const path = document.createElementNS(svgNS,'path');
    
    // Add an offset to the control points so that not all notes overlap.
    const  offset = (head + 1) * (NOTE_WIDTH) / 16;
    //offset = head % 2 ? -offset : +offset;
    const offsetX = dirX * offset;
    const offsetY = dirY * offset;
    
    
    path.setAttribute('d',
        `M ${from.x} ${from.y} C ${x1+offsetX} ${y1}, ${x2-offsetX} ${y2}, ${to.x} ${to.y}`);

    path.setAttribute('stroke', color);
    path.setAttribute('fill', 'none');
    //path.setAttribute('stroke-opacity', value);

    // This is a made up number.
    const strokeWidth = Math.floor(value * 10) - 6.5;
    path.setAttribute('stroke-width', Math.max(1, strokeWidth));
    
       
    const title = document.createElementNS(svgNS, 'title');
    title.textContent = value;
    path.appendChild(title);
    return path;
  }

  getColor(colors, weight) {
    // Make big weights darker.
    if (weight > 0.5) {
      return this.shadeRGBColor(colors.max, 1-weight);
    } else if (weight < 0.1) {
      const one = this.blendRGBColors(colors.min, colors.max, weight);
      return this.shadeRGBColor(one, 0.2);
    } else {
      return this.blendRGBColors(colors.min, colors.max, weight);
      //return blendRGBColors(one, this.musicColor, 0.1);
    }
  }

  scaleArray(arr) {
    const max = Math.max(...arr);
    const min = Math.min(...arr);
    const range = max - min;
    const scaled = [];
    for (let i = 0; i < arr.length; i++) {
      scaled.push((arr[i] - min) / range);
    }
    return scaled;
  }

  getConnectorLocation(el, where='middle') {
    const x = parseInt(el.getAttribute('x'));
    const y = parseInt(el.getAttribute('y'));
    const w = parseInt(el.getAttribute('width'));
    const h = parseInt(el.getAttribute('height'));
    const middleX = x + w/2;
    const middleY = y + h/2;
    switch (where) {
      case 'middle':
        return {x : middleX, y: middleY};
      case 'top':
        return {x : middleX, y: y};
      case 'bottom':
        return {x : middleX, y: y+h};
      case 'left':
        return {x : x, y: middleY};
      case 'right':
        return {x : x+w, y: middleY};
    }
  }

  shadeRGBColor(color, percent) {
    const f=color.split( ', '),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
    return  'rgb('+(Math.round((t-R)*p)+R)+ ', '+(Math.round((t-G)*p)+G)+ ', '+(Math.round((t-B)*p)+B)+ ') ';
  }

  blendRGBColors(c0, c1, p) {
    const f=c0.split( ', '),t=c1.split( ', '),R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
    return  'rgb('+(Math.round((parseInt(t[0].slice(4))-R)*p)+R)+ ', '+(Math.round((parseInt(t[1])-G)*p)+G)+ ', '+(Math.round((parseInt(t[2])-B)*p)+B)+ ') ';
  }
}
