function setup() {
  createCanvas(window.innerWidth, 800);
  noStroke();
  rectMode(CENTER);
}

let state = {};

document.addEventListener("DOMContentLoaded", () => {
  const sounds = document.getElementById("sounds");
  const start = document.createElement("button");
  start.innerHTML = "start";
  start.addEventListener("click", async () => {
    const audioCtx = new AudioContext();

    const audioData = await getBuffer(audioCtx, "bowls.mp3");
    state = {
      audioCtx,
      audioData,
      sources: createSources(audioCtx, audioData, 0),
      loaded: true,
      cells: 16,
      overlap: 30
    };
    start.style.display = "none";

    const list = document.createElement("ul");
    const triggers = [
      { letter: "f", path: "bowl2.wav" },
      { letter: "g", path: "bowls.mp3" },
      { letter: "j", path: "robin2.wav" },
      { letter: "k", path: "piano2.wav" },
    ];
    document.addEventListener("keydown", async (evt) => {
      const sound = triggers.find((s) => s.letter === evt.key);
      if (sound) {
        state.audioData = await getBuffer(state.audioCtx, sound.path);
      }
    });
    triggers.forEach((sound) => {
      const element = document.createElement("li");
      element.addEventListener("click", async () => {
        state.audioData = await getBuffer(state.audioCtx, sound.path);
      });
      element.innerHTML = `<button class="sound">${sound.letter}</button>`;
      list.append(element);
    });
    sounds.append(list);
    const overlap = document.createElement('input');
    overlap.setAttribute('type', 'range');
    overlap.setAttribute('id', 'overlap');
    overlap.addEventListener('change', evt => {
      state.overlap = Number(evt.target.value);
    });
    const overlapLabel = document.createElement('label');
    overlapLabel.setAttribute('for', 'overlap');
    overlapLabel.innerHTML = 'Overlap time'
    sounds.append(overlap);
    sounds.append(overlapLabel);
  });

  sounds.append(start);
});

async function getBuffer(ctx, path) {
  const buffer = await (await fetch(`/static/audio/${path}`)).arrayBuffer();
  return new Promise((resolve, reject) =>
    ctx.decodeAudioData(
      buffer,
      (audioData) => {
        resolve(audioData);
      },
      reject
    )
  );
}

let currentCell;

function draw() {
  if (!state.loaded) {
    return;
  }
  background(0);
  fill(237, 34, 93);
  rectMode(CORNER);
  const numberOfColumns = state.cells;
  const cellWidth = width / numberOfColumns;
  const cellHeight = height / numberOfColumns;
  range(numberOfColumns)
    .map((col, i) =>
      range(numberOfColumns).map((row, j) => ({
        x: col,
        y: row,
        pitch: (j - Math.floor(numberOfColumns / 2)) * 100,
        delay: i,
      }))
    )
    .flat()
    .map((cell) => ({
      label: `${cell.x}, ${cell.y}`,
      minX: cellWidth * (cell.x - 1),
      maxX: cellWidth * cell.x,
      minY: cellHeight * (cell.y - 1),
      maxY: cellHeight * cell.y,
      pitch: cell.pitch,
      delay: cell.delay,
    }))
    .forEach((cell, i) => {
      if (
        mouseX >= cell.minX &&
        mouseX < cell.maxX &&
        mouseY >= cell.minY &&
        mouseY < cell.maxY
      ) {
        rect(cell.minX, cell.minY, cellWidth, cellHeight);
        if (cell.label !== currentCell) {
          playSound(cell.label, cell.delay, cell.pitch);
        }
        currentCell = cell.label;
      }
    });
  stroke(0);
}

function playSound(label, offset, pitch) {
  state.sources.forEach((source) => {
    source.gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      state.audioCtx.currentTime + state.overlap
    );
  });
  state.sources = createSources(state.audioCtx, state.audioData, pitch);
  const delay = state.audioData.duration / state.cells;
  state.sources[0].source.start(0);
  state.sources[1].source.start(state.audioCtx.currentTime + delay * offset);
}

function createSources(ctx, buffer, pitch) {
  return [
    createSource(ctx, buffer, 0, -1),
    createSource(ctx, buffer, pitch, 1),
  ];
}

function createSource(ctx, buffer, pitch, pan) {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.5;
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.detune.value = pitch;
  source.connect(gainNode).connect(panner).connect(ctx.destination);
  return { source, gainNode };
}

function range(max) {
  return Array.from(new Array(max)).map((_, i) => i + 1);
}
