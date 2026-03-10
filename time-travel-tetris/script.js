const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextContext = nextCanvas.getContext('2d');

context.scale(20, 20);
nextContext.scale(20, 20);

// Tetris pieces and their colors
const pieces = 'TJLOSZI';
const colors = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // Z
    '#3877FF'  // I
];

// Helper to create matrix
function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

// Helper to create pieces
function createPiece(type) {
    if (type === 'T') {
        return [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === 'L') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ];
    } else if (type === 'J') {
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ];
    } else if (type === 'I') {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'Z') {
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

function drawMatrix(matrix, offset, ctx = context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);

                // Add a border for better visibility depending on era
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 0.05;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

const arena = createMatrix(12, 20);

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    nextMatrix: null,
    score: 0,
    level: 1,
    lines: 0
};

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);
}

function drawNext() {
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    // Center the piece
    let offset = { x: 1, y: 1 };
    if (player.nextMatrix.length === 2) offset = { x: 1, y: 1 }; // O piece
    if (player.nextMatrix.length === 4) offset = { x: 0, y: 0 }; // I piece

    drawMatrix(player.nextMatrix, offset, nextContext);
}

let dropCounter = 0;
let dropInterval = 1000;

let lastTime = 0;
let isGameOver = false;

function update(time = 0) {
    if (isGameOver) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    if (player.nextMatrix === null) {
        player.nextMatrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    }
    player.matrix = player.nextMatrix;
    player.nextMatrix = createPiece(pieces[pieces.length * Math.random() | 0]);

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

    if (collide(arena, player)) {
        gameOver();
    }

    drawNext();
}

function gameOver() {
    isGameOver = true;
    checkHighScore();

    document.getElementById('final-score').innerText = player.score;
    document.getElementById('final-highscore').innerText = localStorage.getItem('tetris-highscore') || 0;
    document.getElementById('game-over-overlay').classList.remove('hidden');
}

function restartGame() {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.level = 1;
    player.lines = 0;
    isGameOver = false;
    lastTime = 0;

    document.getElementById('game-over-overlay').classList.add('hidden');

    updateScore();
    playerReset();
    update();
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        player.lines++;
        rowCount *= 2;
    }

    player.level = Math.floor(player.lines / 5) + 1;
    dropInterval = Math.max(100, 1000 - (player.level - 1) * 100);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
    document.getElementById('level').innerText = player.level;

    // Check if current score beat highscore to update visually
    const highscore = localStorage.getItem('tetris-highscore') || 0;
    if (player.score > highscore) {
        document.getElementById('highscore').innerText = player.score;
    }
}

function checkHighScore() {
    const highscore = localStorage.getItem('tetris-highscore') || 0;
    if (player.score > highscore) {
        localStorage.setItem('tetris-highscore', player.score);
    }
}

function initHighScore() {
    const highscore = localStorage.getItem('tetris-highscore') || 0;
    document.getElementById('highscore').innerText = highscore;
}

// Keyboard controls
document.addEventListener('keydown', event => {
    if (event.keyCode === 37) { // Left
        playerMove(-1);
    } else if (event.keyCode === 39) { // Right
        playerMove(1);
    } else if (event.keyCode === 40) { // Down
        playerDrop();
    } else if (event.keyCode === 38 || event.keyCode === 81) { // Up or Q
        playerRotate(-1);
    } else if (event.keyCode === 87) { // W
        playerRotate(1);
    }
});

// On-screen buttons
document.getElementById('btn-left').addEventListener('click', () => playerMove(-1));
document.getElementById('btn-right').addEventListener('click', () => playerMove(1));
document.getElementById('btn-down').addEventListener('click', () => playerDrop());
document.getElementById('btn-rotate').addEventListener('click', () => playerRotate(1));
document.getElementById('btn-restart').addEventListener('click', () => restartGame());

// === TIME TRAVEL ERAS LOGIC ===
const eras = [
    { title: "Pré-História", class: "era-1" },
    { title: "Idade Média", class: "era-2" },
    { title: "Rev. Industrial", class: "era-3" },
    { title: "Anos 80s", class: "era-4" },
    { title: "Cyber-Futuro", class: "era-5" }
];

let currentEra = 0;

function changeEra() {
    currentEra = (currentEra + 1) % eras.length;

    // Update body class
    document.body.className = eras[currentEra].class;

    // Update title
    document.getElementById('era-title').innerText = "Era: " + eras[currentEra].title;
}

// Change era every 10 seconds
setInterval(changeEra, 10000);

// === CLOCK LOGIC ===
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    document.getElementById('clock').innerText = `${hours}:${minutes}:${seconds}`;
}

setInterval(updateClock, 1000);
updateClock();

// Start Game
initHighScore();
playerReset();
updateScore();
update();
