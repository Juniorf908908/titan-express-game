// Tap Rush - Telegram Mini App Game
// Fully responsive canvas-based tapping game with particle effects, combo system, and Telegram integration

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to full container size
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Telegram WebApp SDK
const tg = window.Telegram?.WebApp;
tg?.ready();

tg?.onEvent('viewportChanged', resizeCanvas);

tg?.expand();

// Audio for taps (silence by default; haptics via Telegram)
let soundEnabled = false; // Can be toggled later

// Game State
let score = 0;
let combo = 1;
let highScore = parseInt(localStorage.getItem('tapRushHighScore') || '0', 10);
let gameActive = false;
let timeLeft = 30;

const targets = [];
const particles = [];

// Target configuration
const targetConfig = {
    size: 60,
    growthRate: 0.8,
    maxLife: 2000,
    spawnInterval: 800,
    minSpawnDelay: 400, // Gets faster as score increases
    colors: ['#FF5252', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3', '#673AB7']
};

// Particle configuration
const particleConfig = {
    count: 12,
    life: 600,
    decay: 0.95
};

// Timer for spawning new targets
let spawnTimer;

// Format time as 00
function formatTime(seconds) {
    return seconds.toString().padStart(2, '0');
}

// Update UI
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('combo').textContent = `x${combo}`;
    document.getElementById('time').textContent = formatTime(Math.ceil(timeLeft));
    document.getElementById('highScore').textContent = highScore;
    
    // Combo visibility
    document.getElementById('combo').style.opacity = combo > 1 ? '1' : '0';
}

// Create a new target at random position
function createTarget() {
    if (!gameActive) return;

    const radius = 10;
    const x = Math.random() * (canvas.width - 2 * radius) + radius;
    const y = Math.random() * (canvas.height - 2 * radius) + radius;
    
    const color = targetConfig.colors[Math.floor(Math.random() * targetConfig.colors.length)];
    
    const target = {
        x, y, radius, color,
        maxRadius: targetConfig.size,
        growing: true,
        created: Date.now()
    };
    
    targets.push(target);
    
    // Update spawn interval based on score (faster as score increases)
    const newInterval = Math.max(targetConfig.minSpawnDelay, targetConfig.spawnInterval - score * 2);
    clearInterval(spawnTimer);
    spawnTimer = setInterval(createTarget, newInterval);
}

// Create explosion particle effect
function createParticles(x, y, color) {
    for (let i = 0; i < particleConfig.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 3 + Math.random() * 2,
            color,
            life: particleConfig.life,
            decay: particleConfig.decay
        });
    }
}

// Tap handler
function handleTap(x, y) {
    if (!gameActive) {
        if (document.getElementById('startButton').contains(document.elementFromPoint(x, y))) {
            startGame();
        }
        return;
    }

    // Check hits
    let hit = false;
    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        const dx = x - t.x;
        const dy = y - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < t.radius) {
            // Register hit
            score += 10 * combo;
            combo++;
            
            // Telegram haptic feedback
            tg?.HapticFeedback?.impactOccurred('light');
            
            // Sound effect would go here
            
            // Create particles
            createParticles(t.x, t.y, t.color);
            
            // Remove target
            targets.splice(i, 1);
            hit = true;
            break;
        }
    }

    // Reset combo on miss
    if (!hit && targets.length > 0) {
        combo = 1;
    }
}

// Touch and mouse events
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleTap(x, y);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (let touch of e.touches) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        handleTap(x, y);
    }
});

// Start game
function startGame() {
    // Reset
    score = 0;
    combo = 1;
    timeLeft = 30;
    targets.length = 0;
    particles.length = 0;
    gameActive = true;
    
    // Hide start screen
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    // Start spawn loop
    clearInterval(spawnTimer);
    spawnTimer = setInterval(createTarget, targetConfig.spawnInterval);
    createTarget(); // First target immediately
    
    // Start timer
    const timer = setInterval(() => {
        timeLeft -= 0.05;
        if (timeLeft <= 0) {
            timeLeft = 0;
            endGame();
            clearInterval(timer);
        }
        updateUI();
    }, 50);
    
    updateUI();
}

// End game
function endGame() {
    gameActive = false;
    clearInterval(spawnTimer);
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tapRushHighScore', highScore);
    }
    
    // Show end screen
    document.getElementById('finalScore').textContent = score;
    document.getElementById('bestScore').textContent = highScore;
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('endScreen').style.display = 'block';
    
    // Telegram share button
    // In a real app, you'd use tg.showPopup or tg.openTelegramLink
    // For now, just update UI
    
    updateUI();
}

// Back to start
function goToStart() {
    document.getElementById('endScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
}

// Share score
function shareScore() {
    // Use Telegram share
    const url = `https://t.me/share/url?url=https://juniorf908908.github.io/titan-express-game/&text=I%20scored%20${score}%20in%20Tap%20Rush!%20Can%20you%20beat%20me%3F%20%F0%9F%8E%AE`;
    tg?.openTelegramLink(url);
}

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Animate and draw targets
    const now = Date.now();
    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        
        // Grow effect
        if (t.growing) {
            t.radius += targetConfig.growthRate;
            if (t.radius >= t.maxRadius) {
                t.growing = false;
            }
        }
        
        // Fade out near end of life
        const age = now - t.created;
        const opacity = age > t.maxLife * 0.6 ? 1 - (age - t.maxLife * 0.6) / (t.maxLife * 0.4) : 1;
        
        if (opacity <= 0) {
            targets.splice(i, 1);
            combo = 1; // Miss
            continue;
        }
        
        // Draw target
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = t.color;
        ctx.globalAlpha = opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Pulse glow effect
        const pulse = 1 + 0.1 * Math.sin(now / 200);
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = t.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 * opacity;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    // Animate and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Gravity
        p.life *= p.decay;
        p.radius *= 0.96;
        
        if (p.life <= 0 || p.radius < 0.5) {
            particles.splice(i, 1);
            continue;
        }
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / particleConfig.life;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();

// Initialize UI
updateUI();