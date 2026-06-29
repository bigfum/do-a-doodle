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
}

function makeKnob(el, onChange) {
    let startY, startVal, value = 0.5;

    el.addEventListener('mousedown', e => {
        startY = e.clientY;
        startVal = value;
        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', () => window.removeEventListener('mousemove', onDrag));
    });

    function onDrag(e) {
        const delta = (startY - e.clientY) / 150;
        value = Math.max(0, Math.min(1, startVal + delta));
        el.style.transform = `rotate(${value * 270 - 135}deg)`;
        onChange(value);
    }
}

const knobXEl = document.getElementById('knob-x');
const knobYEl = document.getElementById('knob-y');

makeKnob(knobXEl, v => {
    const newX = v * canvas.width;
    drawTo(newX, cursorY);
});

makeKnob(knobYEl, v => {
    const newY = v * canvas.height;
    drawTo(cursorX, newY);
});

clearButton.addEventListener('click', clearCanvas);