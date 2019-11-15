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
export { TYPES, svgNS,
    COLORS, SINGLE_COLORS_BLUE,
    LOCAL_COLORS_ALL, GLOBAL_COLORS_ALL,
    LOCAL_COLORS_SINGLE, GLOBAL_COLORS_SINGLE,
    getLocationHash,
    rgb,
    getColorForWeight, getColorForUnscaledWeight, scaleArray,
    drawMusicLine, makeOption, makeHeadSelector, scaleNote,
    makeRect, makePath, makeLine, getConnectorLocation};

const TYPES = {BACH: 'bach', PERFORMANCE: 'performance', DOUBLE: 'bach_duo'};

function scaleArray(arr) {
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const range = max - min;
  const scaled = [];
  for (let i = 0; i < arr.length; i++) {
    scaled.push((arr[i] - min) / range);
  }
  return scaled;
}

/**************
 * Colour Helpers
 **************/
const COLORS = [
  {min: rgb('ffd6d6'), max: rgb('e6194B')}, // red
  {min: rgb('ffdac3'), max: rgb('f58231')}, // orange
  {min: rgb('efe2bc'), max: rgb('ffe119')},// yellow
  {min: rgb('cdeaca'), max: rgb('3cb44b')}, // green
  {min: rgb('b0edef'), max: rgb('6bb9bc')}, // cyan
  {min: rgb('d9e1ff'), max: rgb('448aff')}, // blue
  {min: rgb('f0dbfe'), max: rgb('68529A')}, // purple
  {min: rgb('dbe0ff'), max: rgb('546e7a')} // navy
];

// In two-attention mode, when painting the same head the colours need to be different
const LOCAL_COLORS_SINGLE = COLORS;
const GLOBAL_COLORS_SINGLE = [
  {min: rgb('dbe0ff'), max: rgb('546e7a')}, // navy
  {min: rgb('f0dbfe'), max: rgb('68529A')}, // purple
  {min: rgb('d9e1ff'), max: rgb('448aff')},// blue
  {min: rgb('b0edef'), max: rgb('6bb9bc')}, // cyan
  {min: rgb('cdeaca'), max: rgb('3cb44b')}, // green
  {min: rgb('efe2bc'), max: rgb('ffe119')}, // yellow
  {min: rgb('ffdac3'), max: rgb('f58231')}, // orange
  {min: rgb('ffd6d6'), max: rgb('e6194B')} // red
];

// In two-attention mode, when painting all heads, just use two different colours.
const LOCAL_COLORS_ALL = [ // red
  {min: rgb('ffd6d6'), max: rgb('e6194B')},
  {min: rgb('ffd6d6'), max: rgb('e6194B')},
  {min: rgb('ffd6d6'), max: rgb('e6194B')},
  {min: rgb('ffd6d6'), max: rgb('e6194B')},
  {min: rgb('ffd6d6'), max: rgb('e6194B')},
  {min: rgb('ffd6d6'), max: rgb('e6194B')},
  {min: rgb('ffd6d6'), max: rgb('e6194B')},
  {min: rgb('ffd6d6'), max: rgb('e6194B')}
];
const GLOBAL_COLORS_ALL = [ // green
  {min: rgb('cdeaca'), max: rgb('3cb44b')},
  {min: rgb('cdeaca'), max: rgb('3cb44b')},
  {min: rgb('cdeaca'), max: rgb('3cb44b')},
  {min: rgb('cdeaca'), max: rgb('3cb44b')},
  {min: rgb('cdeaca'), max: rgb('3cb44b')},
  {min: rgb('cdeaca'), max: rgb('3cb44b')},
  {min: rgb('cdeaca'), max: rgb('3cb44b')},
  {min: rgb('cdeaca'), max: rgb('3cb44b')}
];
const SINGLE_COLORS_BLUE = [
  {min: rgb('546e7a'), max: rgb('546e7a')}, // red
  {min: rgb('546e7a'), max: rgb('546e7a')}, // orange
  {min: rgb('546e7a'), max: rgb('546e7a')},// yellow
  {min: rgb('546e7a'), max: rgb('546e7a')}, // green
  {min: rgb('546e7a'), max: rgb('546e7a')}, // cyan
  {min: rgb('546e7a'), max: rgb('546e7a')}, // blue
  {min: rgb('546e7a'), max: rgb('546e7a')}, // purple
  {min: rgb('546e7a'), max: rgb('546e7a')} // navy
];

function rgb(hex) {
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

function getColorForWeight(weight, colors) {
  // Make big weights darker.
  if (weight > 0.5) {
    return shadeRGBColor(colors.max, 1 - weight);
  } else if (weight < 0.1) {
    const one = blendRGBColors(colors.min, colors.max, weight);
    return shadeRGBColor(one, 0.2);
  } else {
    return blendRGBColors(colors.min, colors.max, weight);
    //return blendRGBColors(one, this.musicColor, 0.1);
  }
}

function getColorForUnscaledWeight(weight, colors) {
  // Make big weights darker.
  if (weight === 0) {
    return 'white';
  } else if (weight > 0.5) {
    return shadeRGBColor(colors.max, 1 - weight);
  } else if (weight < 0.1) {
    const one = blendRGBColors(colors.min, colors.max, weight);
    return shadeRGBColor(one, 0.2);
  } else {
    return blendRGBColors(colors.min, colors.max, weight);
  }
}

function shadeRGBColor(color, percent) {
  const f=color.split( ', '),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
  return  'rgb('+(Math.round((t-R)*p)+R)+ ', '+(Math.round((t-G)*p)+G)+ ', '+(Math.round((t-B)*p)+B)+ ') ';
}

function blendRGBColors(c0, c1, p) {
  const f=c0.split( ', '),t=c1.split( ', '),R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
  return  'rgb('+(Math.round((parseInt(t[0].slice(4))-R)*p)+R)+ ', '+(Math.round((parseInt(t[1])-G)*p)+G)+ ', '+(Math.round((parseInt(t[2])-B)*p)+B)+ ') ';
}

/**************
 * DOM Helpers
 **************/
function makeOption(i) {
  const option = document.createElement('option');
  option.textContent = i;
  return option;
}

function makeHeadSelector(i, updateFn) {
  const div = document.createElement('div');
  div.style.display = 'inline-block';
  const input = document.createElement('input');
  input.checked = true;
  input.type = 'checkbox';
  input.id = 'head' + i;
  input.onchange = updateFn;
  const label = document.createElement('label');
  label.setAttribute('for', input.id);
  label.style.backgroundColor = COLORS[i].max;
  div.appendChild(input);
  div.appendChild(label);
  return div;
}

/**************
 * SVG Helpers
 **************/
const svgNS = 'http://www.w3.org/2000/svg';

function drawMusicLine(x,w) {
  // Giant hack so that we don't query selector all the time.
  if (!window.musicLine) {
    window.musicLine = document.createElementNS(svgNS, 'rect');
    window.musicLine.setAttribute('id', 'musicLine');
    window.musicLine.setAttribute('height', music.getAttribute('height'));
    window.musicLine.setAttribute('fill', 'rgba(255, 105, 180, 0.5)');
    music.appendChild(window.musicLine);
    window.musicLine.setAttribute('y', 0);
  }
  window.musicLine.setAttribute('x', x);
  window.musicLine.setAttribute('width', w);
}

function makeRect(which, x, y, w, h, fill="red", pitch) {
  const rect = document.createElementNS(svgNS, 'rect');
  if (which !== null && which !== undefined) {
    rect.dataset.index = which;
    rect.setAttribute('class', 'hover');
  }
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  if (parseFloat(w) < 0) {
    debugger
  }
  rect.setAttribute('width', w);
  rect.setAttribute('height', h);
  rect.setAttribute('fill', fill);

  const title = document.createElementNS(svgNS, 'title');
  title.textContent = pitch;
  rect.appendChild(title);
  return rect;
}

function makeShadow(x, y, w, h) {
  const shadow = document.createElementNS(svgNS, 'rect');
  shadow.setAttribute('class', 'shadow');
  shadow.setAttribute('x', x + 1);
  shadow.setAttribute('y', y + 3);
  shadow.setAttribute('rx', 4);
  shadow.setAttribute('ry', 4);
  shadow.setAttribute('width', w);
  shadow.setAttribute('height', h);
  return shadow;
}


function makeLine(x, y, x2, y2, pitch) {
  const line = document.createElementNS(svgNS, 'line');
  line.dataset.index = pitch;
  line.setAttribute('x1', x);
  line.setAttribute('y1', y);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.setAttribute('stroke', 'black');
  line.setAttribute('stroke-width', 2);
  const title = document.createElementNS(svgNS, 'title');
  title.textContent = pitch;
  line.appendChild(title);
  return line;
}

function makePath(from, to, head, value, color, noteWidth, isCircle, weirdMode, series) {
  const path = document.createElementNS(svgNS,'path');
  path.setAttribute('class', 'path')

  let opacity;
  if (value > 0.7) {
    opacity = value;
  } else if (value > 0.5) {
    opacity = value - 0.05;
  } else {
    opacity = value - 0.05;
  }
  const strokeWidth = value * Math.max(4, noteWidth / 4);

  if (isCircle) {
    /* omfg svgs.
    Mx,y -- move to x,y
    arx,ry -- radius of the arc. 1,1 is a circle, 2,1 is a squishier ellipse
    0 -- axis rotation
    0 -- large-arc-flag, whether it's the small or big circle
    0 -- sweep-flag, 1 is mirrored
    100,0 - length of arc
    -->
     */
    let sweep;
    let arc = '1,1';

    if (series === 1) {
      // Shift the note a bit so they don't overlap.
      to.x -= noteWidth/3;
    }

    const middleOfDrawing = music.getAttribute('height') / 2;
    sweep = middleOfDrawing < to.y ? 1 : 0;

    // If it's too close, don't go in the future
    if (from.x - to.x < 6 * noteWidth) {
      arc = '0,0';
    }

    path.setAttribute('d',
    `M ${from.x} ${from.y}
     a${arc}
     0,
     0, ${sweep},
     ${to.x - from.x} ${to.y-from.y}`);
  } else {
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

    // Add an offset to the control points so that not all notes overlap.
    const  offset = (head + 1) * noteWidth / 16;
    //offset = head % 2 ? -offset : +offset;
    const offsetX = dirX * offset;
    const offsetY = dirY * offset;

    path.setAttribute('d',
        `M ${from.x} ${from.y} C ${x1+offsetX} ${y1}, ${x2-offsetX} ${y2}, ${to.x} ${to.y}`);
  }

  path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', Math.max(1, strokeWidth));
  path.setAttribute('stroke-opacity', opacity);

  if (weirdMode) {
    path.setAttribute('fill', color);
    path.setAttribute('fill-opacity', 0.05);
  } else {
    path.setAttribute('fill', 'none');
  }

  const title = document.createElementNS(svgNS, 'title');
  title.textContent = value;
  path.appendChild(title);
  return path;
}

function getConnectorLocation(el, where='middle') {
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

function scaleNote(el) {
  // Scale it a bit unless it's a time because that looks weird
  const x_ = parseInt(el.getAttribute('x'));
  const y_ = parseInt(el.getAttribute('y'));
  const scale = 1.75; // 2.5
  el.setAttribute('transform', `translate(${x_} ${y_}) scale(1 ${scale}) translate(-${x_} -${y_+2})`);
}


/**************
 * Unused but saving for later
 **************/
function randomizeWeights(url) {
  fetch(url)
  .then((response) => response.json())
  .then((json) => {
    // Rename attention_weights to global_attention
    json["global_weights"] = json["attention_weights"];
    delete json["attention_weights"];

    // Copy the global weights over.
    json["local_weights"] = JSON.parse(JSON.stringify(json["global_weights"]));

    // Randomize them.
    for (let layer = 0; layer < json["local_weights"].length; layer++) {
      const heads = json["local_weight_"][layer][0];
      for (let head = 0; head < heads.length; head++) {
        const weights = heads[head];
        for (let step = 0; step < weights.length; step++) {
          const values = weights[step];
          for (let i = 0; i < values.length; i++) {
            // Change this value slightly.
            values[i] += mm.tf.randomNormal([1], 0, 0.2).get(0);
          }
        }

      }
    }
    console.log(JSON.stringify(json));
  });
}

function getLocationHash() {
  const hash = window.location.hash.substring(1);
  const params = {};
  hash.split('&').map(hk => {
    let temp = hk.split('=');
      params[temp[0]] = temp[1]
  });
  return params;
}

