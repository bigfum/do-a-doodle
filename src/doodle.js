const canvas = document.getElementById('doodle-canvas');
const knobX = document.getElementById('knob-x');
const knobY = document.getElementById('knob-y');
const clearButton = document.getElementById('clear-button');

const ctx = canvas.getContext('2d');

let cursorX = canvas.width / 2;
let cursorY = canvas.height / 2;

ctx.strokeStyle = '#000';
ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

function drawTo(newX, newY) {
    ctx.beginPath();
    ctx.moveTo(cursorX, cursorY);
    ctx.lineTo(newX, newY);
    ctx.stroke();

    cursorX = newX;
    cursorY = newY;
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cursorX = canvas.width / 2;
    cursorY = canvas.height / 2;
    knobX.value = cursorX;
    knobY.value = cursorY;
}

knobX.addEventListener('input', () => {
    const newX = Number(knobX.value);
    drawTo(newX, cursorY);
});

knobY.addEventListener('input', () => {
    const newY = Number(knobY.value);
    drawTo(cursorX, newY);
});

clearButton.addEventListener('click', clearCanvas);