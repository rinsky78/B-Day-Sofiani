// Game state & global control variables
let currentScreen = 'loading';
let tetrisGame = null;
let gameScore = 0;
let gameLevel = 1;
let gameLines = 0;
let typewriterInterval = null;
let isTyping = false;
let currentPhotoIndex = 0;
let captureIntervalId = null;
let loadingIntervalId = null;
let rafId = null;
let resizeTimeout = null;

// Named handlers references (so we can remove listeners reliably)
function handleMenuBtnClick(e) {
    const page = this.getAttribute('data-page');
    if (page) showScreen(page);
}
function handleBackBtnClick(e) {
    const page = this.getAttribute('data-page');
    if (page) showScreen(page);
}
function handleContinueNavigation() {
    switch(currentScreen) {
        case 'message': showScreen('gallery'); break;
        case 'gallery': showScreen('music'); break;
        case 'music': showScreen('tetris'); break;
        default: showScreen('main');
    }
}
function handlePhotoBtnClick() { startPhotoShow(); }

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    showScreen('loading');
    simulateLoading();
    addEventListeners();
    initializeTetris(); // prepare canvas if present
}

/* ---------- Screen management & cleanup ---------- */
function showScreen(screenName) {
    // cleanup from previous screen
    cleanupForScreenChange(currentScreen);

    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));

    // Show target screen
    const target = document.getElementById(screenName + '-screen');
    if (target) {
        target.classList.add('active');
        currentScreen = screenName;

        // Initialize per-screen content
        switch(screenName) {
            case 'message':
                setTimeout(initializeMessage, 100);
                break;
            case 'gallery':
                setTimeout(initializeGallery, 100);
                break;
            case 'music':
                setTimeout(initializeMusicPlayer, 100);
                break;
            case 'tetris':
                setTimeout(() => {
                    if (tetrisGame && !tetrisGame.gameRunning) {
                        startTetrisGame();
                    }
                }, 100);
                break;
            case 'main':
                setTimeout(initializeMainScreen, 100);
                break;
        }
    }
}

function cleanupForScreenChange(oldScreen) {
    // Always clear loading interval if present
    if (loadingIntervalId) {
        clearInterval(loadingIntervalId);
        loadingIntervalId = null;
    }

    // Clear typewriter
    if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
        isTyping = false;
    }

    // Clear photo capture interval
    if (captureIntervalId) {
        clearInterval(captureIntervalId);
        captureIntervalId = null;
    }

    // Stop tetris animation and mark not running
    if (oldScreen === 'tetris' && tetrisGame) {
        if (tetrisGame.gameRunning) tetrisGame.gameRunning = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }
}

/* ---------- Loading ---------- */
function simulateLoading() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.querySelector('.progress-text');
    const loadingText = document.querySelector('.loading-text');
    const loadingScreen = document.getElementById('loading-screen');
    if (!progressFill || !progressText || !loadingText || !loadingScreen) return;

    let progress = 0;
    const loadingMessages = [
        '&gt; INITIALIZING..._',
        '&gt; LOADING MEMORIES..._',
        '&gt; PREPARING SURPRISE..._',
        '&gt; ALMOST READY..._',
        '&gt; LOADING COMPLETE!_'
    ];
    let messageIndex = 0;

    if (loadingIntervalId) clearInterval(loadingIntervalId);
    loadingIntervalId = setInterval(() => {
        progress += Math.random() * 15 + 5;
        if (progress > 100) progress = 100;

        progressFill.style.width = progress + '%';
        progressText.textContent = Math.floor(progress) + '%';

        const newMessageIndex = Math.floor((progress / 100) * (loadingMessages.length - 1));
        if (newMessageIndex !== messageIndex && newMessageIndex < loadingMessages.length) {
            messageIndex = newMessageIndex;
            loadingText.style.opacity = '0';
            setTimeout(() => {
                loadingText.innerHTML = loadingMessages[messageIndex];
                loadingText.style.opacity = '1';
            }, 200);
        }

        if (progress >= 100) {
            clearInterval(loadingIntervalId);
            loadingIntervalId = null;
            loadingScreen.classList.add('loading-complete');
            setTimeout(transitionToMainScreen, 1000);
        }
    }, 200);
}

function transitionToMainScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainScreen = document.getElementById('main-screen');
    if (!loadingScreen || !mainScreen) return;

    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.classList.remove('active', 'fade-out', 'loading-complete');
        mainScreen.classList.add('active', 'screen-entering');
        currentScreen = 'main';
        setTimeout(initializeMainScreen, 100);
        setTimeout(() => mainScreen.classList.remove('screen-entering'), 1200);
    }, 600);
}

/* ---------- Main Screen ---------- */
function initializeMainScreen() {
    const menuButtons = document.querySelectorAll('.menu-btn');
    const startBtn = document.querySelector('.start-btn');

    menuButtons.forEach(btn => {
        // Remove potential previous references and attach named handler
        btn.removeEventListener('click', handleMenuBtnClick);
        btn.addEventListener('click', handleMenuBtnClick);

        // button animations
        btn.addEventListener('mouseenter', () => btn.style.transform = 'translateY(-2px)');
        btn.addEventListener('mouseleave', () => btn.style.transform = '');
    });

    if (startBtn) {
        startBtn.removeEventListener('click', startMainStartClicked);
        startBtn.addEventListener('click', startMainStartClicked);
    }
}
function startMainStartClicked() {
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
        startBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            startBtn.style.transform = '';
            if (currentScreen === 'main') showScreen('message');
        }, 150);
    }
}

/* ---------- Message Page (Typewriter) ---------- */
function initializeMessage() {
    // ensure skip btn is hooked to named handler
    const messageScreen = document.getElementById('message-screen');
    if (!messageScreen) return;

    const pageScreen = messageScreen.querySelector('.page-screen');
    if (pageScreen) {
        pageScreen.innerHTML = `
            <div class="page-header">Message</div>
            <div class="message-content" style="max-height:400px; overflow:auto;"></div>
            <button class="skip-btn">SKIP</button>
        `;
        const skipBtn = pageScreen.querySelector('.skip-btn');
        if (skipBtn) {
            skipBtn.removeEventListener('click', skipTypewriter);
            skipBtn.addEventListener('click', skipTypewriter);
        }
    }
    setTimeout(startTypewriter, 300);
}

function startTypewriter() {
    const messageContent = document.querySelector('.message-content');
    if (!messageContent) return;
    const fullMessage = `Hi Sofi,

Happy Birthday!

Hari ini aku pengen kamu ngerasain semua hal positif dan keajaiban yang cuma bisa didapetin kalo kamu ada di dunia ini. Semoga segala keinginanmu tercapai, apalagi yang kocak-kocak dan gak biasa, karena kamu tuh unik banget! Aku selalu percaya kalau kamu bisa melewati semua tantangan dengan kekuatan dan semangat yang luar biasa.

Semoga di umur yang baru ini kamu makin bahagia, makin sehat, dan makin kuat ngejalanin semuanya. Kamu bener-bener bikin hari-hari aku jadi lebih berarti dan penuh warna. dan juga Semoga di tahun yang baru ini, kamu makin bahagia, makin sukses, dan tentunya makin cantik (walaupun udah cantik banget sih!).

Sekali lagi, Happy Birthday, Sofi! 🎉🎂

Enjoy this little surprise~`;

    // cleanup old interval if exists
    if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
    }
    messageContent.innerHTML = '';
    let charIndex = 0;
    isTyping = true;

    typewriterInterval = setInterval(() => {
        if (charIndex < fullMessage.length) {
            const ch = fullMessage[charIndex];
            messageContent.innerHTML += (ch === '\n') ? '<br>' : ch;
            charIndex++;
            messageContent.scrollTop = messageContent.scrollHeight;
        } else {
            clearInterval(typewriterInterval);
            typewriterInterval = null;
            isTyping = false;
        }
    }, 50);
}

function skipTypewriter() {
    if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
    }
    isTyping = false;
    const messageContent = document.querySelector('.message-content');
    if (messageContent) {
        messageContent.innerHTML = `Hi Sofi,<br><br>Happy Birthday!<br><br>Hari ini aku pengen kamu ngerasain semua hal positif dan keajaiban yang cuma bisa didapetin kalo kamu ada di dunia ini. Semoga segala keinginanmu tercapai, apalagi yang kocak-kocak dan gak biasa, karena kamu tuh unik banget! Aku selalu percaya kalau kamu bisa melewati semua tantangan dengan kekuatan dan semangat yang luar biasa.<br><br>Semoga di umur yang baru ini kamu makin bahagia, makin sehat, dan makin kuat ngejalanin semuanya. Kamu bener-bener bikin hari-hari aku jadi lebih berarti dan penuh warna. dan juga Semoga di tahun yang baru ini, kamu makin bahagia, makin sukses, dan tentunya makin cantik (walaupun udah cantik banget sih!).<br><br>Sekali lagi, Happy Birthday, Sofi! 🎉🎂<br><br>Enjoy this little surprise~`;
        messageContent.scrollTop = messageContent.scrollHeight;
    }
}

/* ---------- Gallery / Photobox ---------- */
function initializeGallery() {
    const galleryContent = document.querySelector('.gallery-content');
    if (!galleryContent) return;

    galleryContent.innerHTML = `
        <div class="photobox-header">
            <div class="photobox-dot red"></div>
            <span class="photobox-title">PHOTOBOX</span>
            <div class="photobox-dot green"></div>
        </div>
        <div class="photobox-progress">READY TO PRINT</div>
        <div class="photo-display">
            <div class="photo-placeholder">Press MULAI CETAK to start photo session</div>
        </div>
        <div class="photobox-controls">
            <button class="photo-btn">MULAI CETAK</button>
        </div>
    `;

    // Add listener to photo button (named so we can remove later)
    setTimeout(() => {
        const photoBtn = document.querySelector('.photo-btn');
        if (photoBtn) {
            photoBtn.removeEventListener('click', handlePhotoBtnClick);
            photoBtn.addEventListener('click', handlePhotoBtnClick);
        }
    }, 50);
}

function startPhotoShow() {
    const photoBtn = document.querySelector('.photo-btn');
    const photoDisplay = document.querySelector('.photo-display');
    const progressDiv = document.querySelector('.photobox-progress');
    if (!photoBtn || !photoDisplay || !progressDiv) return;

    // Example local photos (ensure these paths exist)
    const photos = [
        { text: 'Beautiful 🥰', image: 'Beautiful and cute mode.jpg' },
        { text: 'Graduation 🥇', image: 'G2.jpg' },
        { text: 'Paskib 😎', image: 'Paskib mode.jpg' },
        { text: 'School 👩‍🎓', image: 'School mode.jpg' },
        { text: 'Gamer Mode 🤩', image: 'Gamer mode.jpg' },
        { text: 'Cool 😏', image: 'cool2.jpg' },
        { text: 'Child/Baby 👶', image: 'child.jpg' },
        { text: 'Pengen ke isekai 🥹', image: 'isekai2.jpg' }
    ];

    photoBtn.textContent = 'MENCETAK...';
    photoBtn.disabled = true;
    progressDiv.textContent = 'INITIALIZING CAMERA...';

    // Build frames and strip
    let framesHTML = '';
    for (let i = 0; i < photos.length; i++) {
        framesHTML += `
            <div class="photo-frame" id="frame-${i + 1}">
                <div class="photo-content">READY</div>
            </div>
        `;
    }
    const photoStripHTML = `
        <div class="photo-strip">
            <div class="photo-strip-header">PHOTOSTRIP SESSION</div>
            <div class="photo-frames-container">
                ${framesHTML}
            </div>
            <div class="photo-strip-footer">💕 BIRTHDAY MEMORIES 💕</div>
        </div>
        <div class="scroll-indicator">⬇ Scroll Down ⬇</div>
    `;
    photoDisplay.innerHTML = photoStripHTML;
    currentPhotoIndex = 0;

    // Countdown then start capture
    let countdown = 3;
    progressDiv.textContent = `GET READY... ${countdown}`;
    const countdownId = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            progressDiv.textContent = `GET READY... ${countdown}`;
        } else {
            clearInterval(countdownId);
            progressDiv.textContent = 'SMILE! 📸';
            startPhotoCapture(photos);
        }
    }, 1000);
}

function startPhotoCapture(photos) {
    const progressDiv = document.querySelector('.photobox-progress');
    const photoBtn = document.querySelector('.photo-btn');
    const framesContainer = document.querySelector('.photo-frames-container');
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (!progressDiv || !photoBtn || !framesContainer) return;

    // ensure no existing capture interval
    if (captureIntervalId) {
        clearInterval(captureIntervalId);
        captureIntervalId = null;
    }

    captureIntervalId = setInterval(() => {
        if (currentPhotoIndex < photos.length) {
            const frameId = `frame-${currentPhotoIndex + 1}`;
            const frame = document.getElementById(frameId);

            if (frame) {
                // flash & scroll to center the frame
                progressDiv.textContent = '✨ FLASH! ✨';
                setTimeout(() => {
                    try {
                        const frameTop = frame.offsetTop - framesContainer.offsetTop;
                        const containerHeight = framesContainer.clientHeight;
                        const frameHeight = frame.clientHeight;
                        const scrollPosition = frameTop - (containerHeight / 2) + (frameHeight / 2);
                        framesContainer.scrollTo({ top: scrollPosition, behavior: 'smooth' });
                    } catch (err) {
                        // fallback
                        framesContainer.scrollTop = Math.max(0, frame.offsetTop - framesContainer.offsetTop);
                    }
                }, 200);

                // Fill frame with image + overlay (safe onerror handling)
                setTimeout(() => {
                    frame.classList.add('filled');

                    const photo = photos[currentPhotoIndex];
                    frame.innerHTML = `
                        <div class="photo-wrapper">
                            <img src="${photo.image}" alt="${photo.text}" class="photo-image" />
                            <div class="photo-overlay">
                                <div class="photo-content">${photo.text}</div>
                            </div>
                        </div>
                    `;

                    // If image fails to load, hide img and style overlay (safer to attach onerror after DOM insert)
                    const imgEl = frame.querySelector('img.photo-image');
                    const overlayEl = frame.querySelector('.photo-overlay');
                    if (imgEl) {
                        imgEl.onerror = function() {
                            this.style.display = 'none';
                            if (overlayEl) overlayEl.style.background = 'linear-gradient(45deg, #ff6b9d, #c44569)';
                        };
                    }

                    const displayCount = currentPhotoIndex + 1;
                    progressDiv.textContent = `CAPTURED ${displayCount}/${photos.length}`;
                    if (currentPhotoIndex < photos.length - 1 && scrollIndicator) {
                        scrollIndicator.style.display = 'block';
                    }

                    currentPhotoIndex++;
                }, 500);
            } else {
                // frame not found, skip to next
                currentPhotoIndex++;
            }
        } else {
            // completed
            clearInterval(captureIntervalId);
            captureIntervalId = null;
            if (scrollIndicator) scrollIndicator.style.display = 'none';

            setTimeout(() => {
                try { framesContainer.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { framesContainer.scrollTop = 0; }
            }, 1000);

            setTimeout(() => {
                progressDiv.textContent = '🎉 PHOTO STRIP COMPLETE! 🎉';
                photoBtn.textContent = 'CETAK LAGI';
                photoBtn.disabled = false;

                // swap listener to startNewSession (named)
                photoBtn.removeEventListener('click', handlePhotoBtnClick);
                photoBtn.removeEventListener('click', startNewSession);
                photoBtn.addEventListener('click', startNewSession);
            }, 2000);
        }
    }, 2500);
}

function startNewSession() {
    const photoBtn = document.querySelector('.photo-btn');
    const progressDiv = document.querySelector('.photobox-progress');
    const photoDisplay = document.querySelector('.photo-display');
    if (!photoBtn || !progressDiv || !photoDisplay) return;

    // reset visuals
    progressDiv.textContent = 'READY TO PRINT';
    photoBtn.textContent = 'MULAI CETAK';
    photoBtn.disabled = false;

    // remove old listener(s) and attach original
    photoBtn.removeEventListener('click', startNewSession);
    photoBtn.removeEventListener('click', handlePhotoBtnClick);
    photoBtn.addEventListener('click', handlePhotoBtnClick);

    // clear display
    photoDisplay.innerHTML = '<div class="photo-placeholder">Press MULAI CETAK to start photo session</div>';
    currentPhotoIndex = 0;

    if (captureIntervalId) {
        clearInterval(captureIntervalId);
        captureIntervalId = null;
    }
}

/* ---------- Music Player (Spotify embed) ---------- */
function initializeMusicPlayer() {
    const musicContent = document.querySelector('.music-content');
    if (!musicContent) return;

    musicContent.innerHTML = `
        <div class="spotify-container">
            <div class="spotify-header">
                <div class="spotify-logo">♪ Spotify Playlists</div>
            </div>
            <div class="spotify-embed-container">
                <iframe id="spotify-iframe" style="border-radius:12px" src="" width="100%" height="200" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
            </div>
            <div class="playlist-controls">
                <button class="playlist-btn active" data-playlist="1">Playlist 1</button>
                <button class="playlist-btn" data-playlist="2">Playlist 2</button>
                <button class="playlist-btn" data-playlist="3">Playlist 3</button>
            </div>
            <div class="music-info">
                <div class="current-playlist">Now Playing: Birthday Special Mix</div>
                <div class="playlist-description">Lagu-lagu spesial untuk hari istimewa kamu ✨</div>
            </div>
        </div>
    `;

    addSpotifyPlayerListeners();
    loadSpotifyPlaylist(1);
}

function addSpotifyPlayerListeners() {
    const playlistBtns = document.querySelectorAll('.playlist-btn');
    playlistBtns.forEach(btn => {
        // named inline handler using closure is fine since btn is unique
        btn.removeEventListener('click', onPlaylistBtnClick);
        btn.addEventListener('click', onPlaylistBtnClick);
    });
}
function onPlaylistBtnClick() {
    const playlistBtns = document.querySelectorAll('.playlist-btn');
    playlistBtns.forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const playlistNum = parseInt(this.getAttribute('data-playlist'));
    loadSpotifyPlaylist(playlistNum);
}

function loadSpotifyPlaylist(playlistNumber) {
    const iframe = document.getElementById('spotify-iframe');
    const currentPlaylist = document.querySelector('.current-playlist');
    const playlistDescription = document.querySelector('.playlist-description');
    if (!iframe) return;

    const playlists = {
        1: { embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWYtQSOiZF6hj?si=0b945793c2934ba1', name: 'Birthday Special Mix', description: 'Lagu-lagu spesial untuk hari istimewa kamu ✨' },
        2: { embedUrl: 'https://open.spotify.com/embed/playlist/43LfkrmQDaMoVCv5RnXEMI?utm_source=generator', name: 'Metal Collection', description: 'Koleksi lagu metal yang bikin kamu semangat beraktivitas 🤘' },
        3: { embedUrl: 'https://open.spotify.com/embed/playlist/6Tg1k3072TTB5KnN7oZfV3?utm_source=generator', name: 'Happy Memories', description: 'Lagu-lagu yang mengingatkan kenangan indah 🌟' }
    };

    const selected = playlists[playlistNumber];
    if (selected) {
        iframe.src = selected.embedUrl;
        if (currentPlaylist) currentPlaylist.textContent = `Now Playing: ${selected.name}`;
        if (playlistDescription) playlistDescription.textContent = selected.description;
        iframe.style.opacity = '0.5';
        iframe.onload = function() { this.style.opacity = '1'; };
    }
}

/* ---------- TETRIS ---------- */
function initializeTetris() {
    const canvas = document.getElementById('tetris-canvas');
    const gameContainer = document.querySelector('.tetris-game');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // If a game was running, stop it before resizing/reinit
    if (tetrisGame && tetrisGame.gameRunning) {
        tetrisGame.gameRunning = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    // compute canvas size based on container
    if (gameContainer) {
        const containerRect = gameContainer.getBoundingClientRect();
        const maxWidth = Math.max(300, containerRect.width - 15);
        const maxHeight = Math.max(400, containerRect.height - 15);
        const aspectRatio = 1 / 2; // width:height ratio ~ 1:2
        let canvasWidth = Math.min(maxWidth, maxHeight * aspectRatio);
        let canvasHeight = canvasWidth / aspectRatio;
        if (canvasHeight > maxHeight) {
            canvasHeight = maxHeight;
            canvasWidth = canvasHeight * aspectRatio;
        }
        canvasWidth = Math.max(canvasWidth, 400);
        canvasHeight = Math.max(canvasHeight, 600);

        canvas.width = Math.floor(canvasWidth);
        canvas.height = Math.floor(canvasHeight);
    } else {
        canvas.width = 500;
        canvas.height = 600;
    }

    // block size and board
    const blockSize = Math.max(Math.floor(canvas.width / 10), 25);
    const boardWidth = 10;
    const boardHeight = Math.floor(canvas.height / blockSize);

    tetrisGame = {
        canvas, ctx,
        board: createEmptyBoard(boardWidth, boardHeight),
        currentPiece: null,
        gameRunning: false,
        dropTime: 0,
        lastTime: 0,
        dropInterval: 1000,
        blockSize,
        boardWidth,
        boardHeight
    };

    updateTetrisStats();
    drawTetrisBoard();
    addTetrisListeners();
}

function createEmptyBoard(width, height) {
    const board = [];
    for (let y = 0; y < height; y++) {
        board[y] = new Array(width).fill(0);
    }
    return board;
}

function drawTetrisBoard() {
    if (!tetrisGame) return;
    const { ctx, canvas, board, blockSize, boardWidth, boardHeight } = tetrisGame;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let x = 0; x <= boardWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * blockSize, 0);
        ctx.lineTo(x * blockSize, boardHeight * blockSize);
        ctx.stroke();
    }
    for (let y = 0; y <= boardHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * blockSize);
        ctx.lineTo(boardWidth * blockSize, y * blockSize);
        ctx.stroke();
    }

    // draw placed blocks
    for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] !== 0) drawBlock(x, y, getBlockColor(board[y][x]));
        }
    }

    // draw current piece
    if (tetrisGame.currentPiece) drawPiece(tetrisGame.currentPiece);

    // draw border
    ctx.strokeStyle = '#9bbc0f';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, boardWidth * blockSize - 4, boardHeight * blockSize - 4);
}

function drawBlock(x, y, color) {
    if (!tetrisGame) return;
    const { ctx, blockSize } = tetrisGame;
    const padding = Math.max(2, Math.floor(blockSize * 0.08));

    ctx.fillStyle = color;
    ctx.fillRect(
        x * blockSize + padding,
        y * blockSize + padding,
        blockSize - padding * 2,
        blockSize - padding * 2
    );

    if (blockSize > 20) {
        const effectSize = Math.max(2, Math.floor(blockSize * 0.12));
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(x * blockSize + padding, y * blockSize + padding, blockSize - padding * 2, effectSize);
        ctx.fillRect(x * blockSize + padding, y * blockSize + padding, effectSize, blockSize - padding * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x * blockSize + padding, y * blockSize + blockSize - padding - effectSize, blockSize - padding * 2, effectSize);
        ctx.fillRect(x * blockSize + blockSize - padding - effectSize, y * blockSize + padding, effectSize, blockSize - padding * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * blockSize + padding, y * blockSize + padding, blockSize - padding * 2, blockSize - padding * 2);
    }
}

function drawPiece(piece) {
    piece.shape.forEach((row, dy) => {
        row.forEach((val, dx) => {
            if (val !== 0) drawBlock(piece.x + dx, piece.y + dy, getBlockColor(val));
        });
    });
}

function getBlockColor(type) {
    const colors = {
        1: '#ff4757', 2: '#2ed573', 3: '#3742fa',
        4: '#ff6b35', 5: '#ffa502', 6: '#a55eea', 7: '#26d0ce'
    };
    return colors[type] || '#ffffff';
}

function createTetrisPiece() {
    const templates = [
        { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] }, // I
        { shape: [[2,2],[2,2]] }, // O
        { shape: [[0,3,0],[3,3,3],[0,0,0]] }, // T
        { shape: [[0,4,4],[4,4,0],[0,0,0]] }, // S
        { shape: [[5,5,0],[0,5,5],[0,0,0]] }, // Z
        { shape: [[6,0,0],[6,6,6],[0,0,0]] }, // J
        { shape: [[0,0,7],[7,7,7],[0,0,0]] }  // L
    ];
    const tpl = templates[Math.floor(Math.random() * templates.length)];
    const width = tpl.shape[0].length;
    const startX = Math.floor((tetrisGame.boardWidth - width) / 2);
    return { shape: tpl.shape.map(r => r.slice()), x: startX, y: -1 }; // y may start negative
}

function startTetrisGame() {
    if (!tetrisGame || tetrisGame.gameRunning) return;
    tetrisGame.gameRunning = true;
    tetrisGame.currentPiece = createTetrisPiece();
    gameScore = 0; gameLevel = 1; gameLines = 0;
    tetrisGame.dropTime = 0;
    tetrisGame.lastTime = performance.now();
    updateTetrisStats();
    rafId = requestAnimationFrame(tetrisGameLoop);
}

function tetrisGameLoop(time = 0) {
    if (!tetrisGame || !tetrisGame.gameRunning) return;
    const deltaTime = time - tetrisGame.lastTime;
    tetrisGame.lastTime = time;
    tetrisGame.dropTime += deltaTime;

    if (tetrisGame.dropTime > tetrisGame.dropInterval) {
        moveTetrisPiece('down');
        tetrisGame.dropTime = 0;
    }

    drawTetrisBoard();
    rafId = requestAnimationFrame(tetrisGameLoop);
}

function moveTetrisPiece(direction) {
    if (!tetrisGame || !tetrisGame.currentPiece) return;
    const piece = tetrisGame.currentPiece;
    let newX = piece.x, newY = piece.y;
    if (direction === 'left') newX = piece.x - 1;
    if (direction === 'right') newX = piece.x + 1;
    if (direction === 'down') newY = piece.y + 1;

    if (isValidMove(piece.shape, newX, newY)) {
        piece.x = newX; piece.y = newY;
    } else if (direction === 'down') {
        placePiece();
        clearLines();
        tetrisGame.currentPiece = createTetrisPiece();
        if (!isValidMove(tetrisGame.currentPiece.shape, tetrisGame.currentPiece.x, tetrisGame.currentPiece.y)) {
            gameOver();
        }
    }
}

function rotateTetrisPiece() {
    if (!tetrisGame || !tetrisGame.currentPiece) return;
    const piece = tetrisGame.currentPiece;
    const rotated = rotateMatrix(piece.shape);

    // Simple wall-kick: try offsets
    const offsets = [0, -1, 1, -2, 2];
    for (let i = 0; i < offsets.length; i++) {
        const offset = offsets[i];
        if (isValidMove(rotated, piece.x + offset, piece.y)) {
            piece.shape = rotated;
            piece.x += offset;
            return;
        }
    }
    // if none works - do nothing
}

function isValidMove(shape, x, y) {
    if (!tetrisGame) return false;
    for (let py = 0; py < shape.length; py++) {
        for (let px = 0; px < shape[py].length; px++) {
            if (shape[py][px] !== 0) {
                const newX = x + px;
                const newY = y + py;
                // Check horizontal bounds
                if (newX < 0 || newX >= tetrisGame.boardWidth) return false;
                // Check bottom
                if (newY >= tetrisGame.boardHeight) return false;
                // Check collision (only if within visible board)
                if (newY >= 0 && tetrisGame.board[newY] && tetrisGame.board[newY][newX] !== 0) return false;
            }
        }
    }
    return true;
}

function placePiece() {
    if (!tetrisGame || !tetrisGame.currentPiece) return;
    const piece = tetrisGame.currentPiece;
    piece.shape.forEach((row, py) => {
        row.forEach((val, px) => {
            if (val !== 0) {
                const bx = piece.x + px;
                const by = piece.y + py;
                if (by >= 0 && by < tetrisGame.board.length && bx >= 0 && bx < tetrisGame.boardWidth) {
                    tetrisGame.board[by][bx] = val;
                }
            }
        });
    });
}

function clearLines() {
    if (!tetrisGame) return;
    let linesCleared = 0;
    for (let y = tetrisGame.board.length - 1; y >= 0; y--) {
        if (tetrisGame.board[y].every(cell => cell !== 0)) {
            tetrisGame.board.splice(y, 1);
            tetrisGame.board.unshift(new Array(tetrisGame.boardWidth).fill(0));
            linesCleared++;
            y++; // recheck same index after splice
        }
    }
    if (linesCleared > 0) {
        gameLines += linesCleared;
        const lineScores = [0, 40, 100, 300, 1200];
        gameScore += (lineScores[linesCleared] || 0) * gameLevel;
        gameLevel = Math.floor(gameLines / 10) + 1;
        tetrisGame.dropInterval = Math.max(50, 1000 - (gameLevel - 1) * 50);
        updateTetrisStats();
    }
}

function rotateMatrix(matrix) {
    const rows = matrix.length, cols = matrix[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            rotated[c][rows - 1 - r] = matrix[r][c];
        }
    }
    return rotated;
}

function updateTetrisStats() {
    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const linesEl = document.getElementById('lines');
    if (scoreEl) scoreEl.textContent = gameScore;
    if (levelEl) levelEl.textContent = gameLevel;
    if (linesEl) linesEl.textContent = gameLines;
}

function gameOver() {
    if (tetrisGame) tetrisGame.gameRunning = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.classList.add('active');
}

function resetTetrisGame() {
    if (!tetrisGame) return;
    tetrisGame.board = createEmptyBoard(tetrisGame.boardWidth, tetrisGame.boardHeight);
    tetrisGame.currentPiece = null;
    tetrisGame.gameRunning = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    gameScore = 0; gameLevel = 1; gameLines = 0;
    updateTetrisStats();
    drawTetrisBoard();
}

/* ---------- Listeners ---------- */
function addEventListeners() {
    // Menu buttons
    const menuButtons = document.querySelectorAll('.menu-btn');
    menuButtons.forEach(btn => {
        btn.removeEventListener('click', handleMenuBtnClick);
        btn.addEventListener('click', handleMenuBtnClick);
    });

    // Back buttons
    const backButtons = document.querySelectorAll('.back-btn');
    backButtons.forEach(btn => {
        btn.removeEventListener('click', handleBackBtnClick);
        btn.addEventListener('click', handleBackBtnClick);
    });

    // Start button on main screen
    const startBtn = document.querySelector('.start-btn');
    if (startBtn) {
        startBtn.removeEventListener('click', startMainStartClicked);
        startBtn.addEventListener('click', startMainStartClicked);
    }

    // Continue buttons
    const continueButtons = document.querySelectorAll('.continue-btn');
    continueButtons.forEach(btn => {
        btn.removeEventListener('click', handleContinueNavigation);
        btn.addEventListener('click', handleContinueNavigation);
    });

    // Modal buttons
    const confirmBtn = document.getElementById('confirm-btn');
    const okBtn = document.getElementById('ok-btn');
    if (confirmBtn) {
        confirmBtn.removeEventListener('click', onConfirmClicked);
        confirmBtn.addEventListener('click', onConfirmClicked);
    }
    if (okBtn) {
        okBtn.removeEventListener('click', onOkClicked);
        okBtn.addEventListener('click', onOkClicked);
    }

    // Keyboard for Tetris
    document.removeEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('keydown', onDocumentKeyDown);

    // Window resize (debounced)
    window.removeEventListener('resize', onWindowResize);
    window.addEventListener('resize', onWindowResize);
}

function onConfirmClicked() {
    const gm = document.getElementById('game-over-modal');
    if (gm) gm.classList.remove('active');
    const fm = document.getElementById('final-message-modal');
    if (fm) fm.classList.add('active');
}

function onOkClicked() {
    const fm = document.getElementById('final-message-modal');
    if (fm) fm.classList.remove('active');
    showScreen('main');
    resetTetrisGame();
}

function onDocumentKeyDown(event) {
    if (currentScreen === 'tetris' && tetrisGame && tetrisGame.gameRunning) {
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault(); moveTetrisPiece('left'); break;
            case 'ArrowRight':
                event.preventDefault(); moveTetrisPiece('right'); break;
            case 'ArrowDown':
                event.preventDefault(); moveTetrisPiece('down'); break;
            case 'ArrowUp':
            case ' ':
                event.preventDefault(); rotateTetrisPiece(); break;
        }
    }
}

function addTetrisListeners() {
    // Attach named handlers for UI buttons if present
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const rotateBtn = document.getElementById('rotate-btn');

    if (leftBtn) {
        leftBtn.removeEventListener('click', leftBtnHandler);
        leftBtn.addEventListener('click', leftBtnHandler);
    }
    if (rightBtn) {
        rightBtn.removeEventListener('click', rightBtnHandler);
        rightBtn.addEventListener('click', rightBtnHandler);
    }
    if (rotateBtn) {
        rotateBtn.removeEventListener('click', rotateBtnHandler);
        rotateBtn.addEventListener('click', rotateBtnHandler);
    }
}

function leftBtnHandler() { moveTetrisPiece('left'); }
function rightBtnHandler() { moveTetrisPiece('right'); }
function rotateBtnHandler() { rotateTetrisPiece(); }

function onWindowResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentScreen === 'tetris' && tetrisGame) {
            // stop game cleanly and reinitialize canvas/game area
            if (tetrisGame.gameRunning) tetrisGame.gameRunning = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            initializeTetris();
        } else {
            // for other screens we might adjust layout if needed
        }
    }, 120);
}

/* ---------- Utility ---------- */
// named small helper to avoid duplicate listener attach issue in playlist
function onPlaylistBtnClickEvent(e) { onPlaylistBtnClick.call(this, e); }

// End of file
