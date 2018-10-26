let templ = document.createElement('template');
templ.innerHTML = `
<button id="btnPlay">Play</button>
<button id="btnDownload">Download MIDI</button>
<br>
<div class="visualizer-container" id="container">
  <canvas id="canvas"></canvas>
</div>
`

// Use it in updateEverything like so:
// const visualizer = document.getElementById('visualizer');
// visualizer.stepsPerQuarter = KIND === TYPES.PERFORMANCE ? 80 : 4;
// visualizer.pixelsPerTimeStep =  KIND === TYPES.PERFORMANCE ? 1 : 10;
// visualizer.displaySequence(parser.getNoteSequence());

class NoteVisualizer extends HTMLElement {
  constructor() {
    super();
    this.appendChild(document.importNode(templ.content, true));

    this.stepsPerQuarter = 80;
    this.pixelsPerTimeStep = 1;
    this.container = this.querySelector('#container')

    // Some event listeners.
    this.querySelector('#btnPlay').addEventListener('click', (e) => this.playOrPause(e));
    this.querySelector('#btnDownload').addEventListener('click', (e) => this.download(e));
    document.getElementById('stepsInput').addEventListener('change', (e) => this.changeStepsPerQuarter(e));
    document.getElementById('pixelsInput').addEventListener('change', (e) => this.changePixelsPerTimeStep(e));

    // Visualizer will be set up when the music is loaded.
    this.visualizer = null;

    // Initialize the player.
    this.player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
    this.player.callbackObject = {
      run: (note) => {
        const currentNotePosition = this.visualizer.redraw(note);

        // See if we need to scroll the container.
        const containerWidth = this.container.getBoundingClientRect().width;
        if (currentNotePosition > (container.scrollLeft + containerWidth)) {
          container.scrollLeft = currentNotePosition - 20;
        }
      },
      stop: () => {}
    }
  }
  // TODO: need getter/setter for stepsPerQuarter and pixelsPerTimeStep
  displaySequence(sequence) {
    this.visualizer = new mm.Visualizer(
      sequence, this.querySelector('#canvas'), 
      {pixelsPerTimeStep: this.pixelsPerTimeStep, noteSpacing:0.1});
  }

  changeStepsPerQuarter(event) {
    this.visualizer.noteSequence.quantizationInfo.stepsPerQuarter = parseInt(event.target.value);
  }

  changePixelsPerTimeStep(event) {
    const seq = this.visualizer.noteSequence;
    this.visualizer = new mm.Visualizer(
      seq, this.querySelector('#canvas'),
      {pixelsPerTimeStep: parseInt(event.target.value), noteSpacing:0.1});
  }

  playOrPause(event) {
    if (this.player.isPlaying()) {
      this.player.stop();
      event.target.textContent = 'Play';
    } else {
      this.player.start(this.visualizer.noteSequence)
          .then(() => (event.target.textContent = 'Play'));
      event.target.textContent = 'Stop';
    }
  }

  download(event) {
    event.stopImmediatePropagation();
    saveAs(new File([mm.sequenceProtoToMidi(this.visualizer.noteSequence)], 'transcription.mid'));
  }
}

window.customElements.define('note-visualizer', NoteVisualizer);