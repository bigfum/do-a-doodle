import * as THREE from 'three/webgpu';

const canvas = document.createElement('canvas');
canvas.width = 600;
canvas.height = 400;

const knobX = document.getElementById('knob-x');
const knobY = document.getElementById('knob-y');
const clearButton = document.getElementById('clear-button');

const ctx = canvas.getContext('2d');

let cursorX = canvas.width / 2;
let cursorY = canvas.height / 2;

ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.strokeStyle = '#000';
ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

const video = document.getElementById('webcam');
const landmarkCanvas = document.getElementById('landmark-canvas');
const lctx = landmarkCanvas.getContext('2d');

const PINCH_THRESHOLD = 0.055;

function drawTo(newX, newY) {
    ctx.beginPath();
    ctx.moveTo(cursorX, cursorY);
    ctx.lineTo(newX, newY);
    ctx.stroke();

    cursorX = newX;
    cursorY = newY;
}

function clearCanvas() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

// hand stuff

let handLandmarker;
let lastVideoTime = -1;

async function initMediaPipe() {
    const { HandLandmarker, FilesetResolver } = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision'
    );

    const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
        },
        runningMode: 'VIDEO',
        numHands: 2
    });

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.addEventListener('loadeddata', loop);
}

function loop() {
    landmarkCanvas.width = video.videoWidth;
    landmarkCanvas.height = video.videoHeight;

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const results = handLandmarker.detectForVideo(video, performance.now());
        drawLandmarks(results);
        drawDebug(results);
        processHands(results);
    }

    requestAnimationFrame(loop);
}

function drawLandmarks(results) {
    lctx.clearRect(0, 0, landmarkCanvas.width, landmarkCanvas.height);

    if (!results.landmarks) return;

    for (const hand of results.landmarks) {
        for (const point of hand) {
            lctx.beginPath();
            lctx.arc(
                point.x * landmarkCanvas.width,
                point.y * landmarkCanvas.height,
                5, 0, Math.PI * 2
            );
            lctx.fillStyle = 'lime';
            lctx.fill();
        }

        for (const i of [4, 8]) {
            const p = hand[i];
            lctx.beginPath();
            lctx.arc(
                p.x * landmarkCanvas.width,
                p.y * landmarkCanvas.height,
                8, 0, Math.PI * 2
            );
            lctx.fillStyle = 'red';
            lctx.fill();
        }
    }
}

const handState = {
    Left: { engaged: false, anchorX: 0, anchorVal: 0, value: 0.5 },
    Right: { engaged: false, anchorX: 0, anchorVal: 0, value: 0.5 }
};

function processHands(results) {
    if (!results.landmarks || !results.handedness) return;

    for (let i = 0; i < results.landmarks.length; i++) {
        const hand = results.landmarks[i];
        const label = results.handedness[i][0].categoryName;
        const state = handState[label];
        const thumbTip = hand[4];
        const indexTip = hand[8];

        const dist = Math.hypot(
            thumbTip.x - indexTip.x,
            thumbTip.y - indexTip.y
        );

        const touching = dist < PINCH_THRESHOLD;

        if (touching && !state.engaged) {
            state.engaged = true;
            state.anchorX = indexTip.x;
            state.anchorVal = state.value;
        } else if (!touching && state.engaged) {
            state.engaged = false;
        }

        if (state.engaged) {
            const delta = (state.anchorX - indexTip.x) / 0.3;
            state.value = Math.max(0, Math.min(1, state.anchorVal + delta));

            if (label === 'Left') {
                drawTo(state.value * canvas.width, cursorY);
                knobXEl.style.transform = `rotate(${state.value * 270 - 135}deg)`;
            } else {
                drawTo(cursorX, state.value * canvas.height);
                knobYEl.style.transform = `rotate(${state.value * 270 - 135}deg)`;
            }
        }
    }
}

function drawDebug(results) {

    lctx.save();
    lctx.scale(-1, 1);
    lctx.translate(-landmarkCanvas.width, 0);

    const padding = 10;
    const lineHeight = 18;
    lctx.font = '12px monospace';
    lctx.textBaseline = 'top';

    let line = 0;

    if (!results.landmarks || !results.handedness) {
        lctx.fillStyle = 'rgba(0,0,0,0.5)';
        lctx.fillRect(padding, padding, 160, 28);
        lctx.fillStyle = 'lime';
        lctx.fillText('no hands detected', padding + 6, padding + 6);
        return;
    }

    for (let i = 0; i < results.landmarks.length; i++) {
        const hand = results.landmarks[i];
        const label = results.handedness[i][0].categoryName;
        const state = handState[label];
        const thumbTip = hand[4];
        const indexTip = hand[8];

        const dist = Math.hypot(
            thumbTip.x - indexTip.x,
            thumbTip.y - indexTip.y
        );

        const lines = [
            `${label}`,
            `dist:  ${dist.toFixed(3)}`,
            `touch: ${dist < PINCH_THRESHOLD ? 'YES' : 'no'}`,
            `val:   ${state.value.toFixed(2)}`,
            `eng:   ${state.engaged ? 'YES' : 'no'}`,
        ];

        const boxW = 130;
        const boxH = lines.length * lineHeight + 10;
        const x = padding;
        const y = padding + line * (boxH + 8);

        lctx.fillStyle = 'rgba(0,0,0,0.5)';
        lctx.fillRect(x, y, boxW, boxH);

        lines.forEach((text, j) => {
            lctx.fillStyle = j === 0 ? 'yellow' : 'lime';
            lctx.fillText(text, x + 6, y + 6 + j * lineHeight);
        });

        line++;
    }

    lctx.restore();
}

initMediaPipe();

// three.js WebGPU scene

(async () => {
    const container = document.getElementById('renderer-container');

    const W = canvas.width;
    const H = canvas.height;

    const renderer = new THREE.WebGPURenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth || W, container.clientHeight || H);
    renderer.setClearColor(0x3c3c3c);
    container.appendChild(renderer.domElement);

    await renderer.init();

    const fov = 50;
    const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 2000);
    camera.position.z = (H / 2) / Math.tan((fov / 2) * Math.PI / 180) + 25;

    const scene = new THREE.Scene();

    const resizeObserver = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    // lighting

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 10);
    scene.add(dirLight);

    // nine-slice frame

    const FRAME = 20;
    const innerW = W - 2 * FRAME;
    const innerH = H - 2 * FRAME;
    const cx = W / 2 - FRAME / 2;
    const cy = H / 2 - FRAME / 2;

    const cornerMat = new THREE.MeshStandardMaterial({ color: 0x2255ff });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xff3322 });

    function addBox(w, h, mat, x, y, z = 0) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, FRAME), mat);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        return mesh;
    }

    addBox(FRAME, FRAME, cornerMat, -cx, cy);
    addBox(FRAME, FRAME, cornerMat, cx, cy);
    addBox(FRAME, FRAME, cornerMat, -cx, -cy);
    addBox(FRAME, FRAME, cornerMat, cx, -cy);

    addBox(innerW, FRAME, edgeMat, 0, cy);
    addBox(innerW, FRAME, edgeMat, 0, -cy);
    addBox(FRAME, innerH, edgeMat, -cx, 0);
    addBox(FRAME, innerH, edgeMat, cx, 0);

    // plane with live canvas texture

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    const planeMat = new THREE.MeshStandardMaterial({ map: canvasTexture });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(innerW, innerH), planeMat);
    plane.position.z = -1;
    scene.add(plane);

    // render loop

    renderer.setAnimationLoop(() => {
        canvasTexture.needsUpdate = true;
        renderer.render(scene, camera);
    });
})();