// Timer State
let timeRemaining = 90;
let isRunning = false;
let timerInterval = null;
let recordedShots = [];

// Microphone State
let audioContext = null;
let analyser = null;
let dataArray = null;
let animationId = null;
let isMicEnabled = false;
let lastShotTime = 0;
const SHOT_COOLDOWN = 500; // Prevent duplicate detections (ms)

// DOM Elements
const timeDisplay = document.getElementById('timeDisplay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const micBtn = document.getElementById('micBtn');
const micStatus = document.getElementById('micStatus');
const sensitivitySlider = document.getElementById('sensitivitySlider');
const sensitivityValue = document.getElementById('sensitivityValue');
const manualShotBtn = document.getElementById('manualShotBtn');
const shotsList = document.getElementById('shotsList');
const clearBtn = document.getElementById('clearBtn');

// Event Listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
micBtn.addEventListener('click', toggleMicrophone);
sensitivitySlider.addEventListener('input', updateSensitivityDisplay);
manualShotBtn.addEventListener('click', recordShot);
clearBtn.addEventListener('click', clearAllShots);

/**
 * Start the countdown timer
 */
function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    manualShotBtn.disabled = false;
    micBtn.disabled = false;
    sensitivitySlider.disabled = false;
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            manualShotBtn.disabled = true;
            timeDisplay.classList.add('finished');
            stopMicrophone();
        }
    }, 1000);
}

/**
 * Pause the timer
 */
function pauseTimer() {
    if (!isRunning) return;
    
    isRunning = false;
    clearInterval(timerInterval);
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopMicrophone();
}

/**
 * Reset the timer to 90 seconds
 */
function resetTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    
    timeRemaining = 90;
    updateDisplay();
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    manualShotBtn.disabled = true;
    micBtn.disabled = true;
    sensitivitySlider.disabled = true;
    
    timeDisplay.classList.remove('finished');
    stopMicrophone();
}

/**
 * Toggle microphone on/off
 */
async function toggleMicrophone() {
    if (isMicEnabled) {
        stopMicrophone();
    } else {
        await startMicrophone();
    }
}

/**
 * Start microphone audio analysis
 */
async function startMicrophone() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        isMicEnabled = true;
        micBtn.classList.add('active');
        micBtn.textContent = 'Disable Mic Detection';
        micStatus.textContent = 'Listening for shots...';
        micStatus.classList.add('listening');
        
        // Start audio detection loop
        detectAudio();
    } catch (error) {
        console.error('Microphone access denied:', error);
        micStatus.textContent = 'Microphone access denied';
        micStatus.classList.add('error');
        setTimeout(() => {
            micStatus.textContent = '';
            micStatus.classList.remove('error');
        }, 3000);
    }
}

/**
 * Stop microphone audio analysis
 */
function stopMicrophone() {
    if (audioContext && audioContext.state === 'running') {
        audioContext.close();
        audioContext = null;
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    isMicEnabled = false;
    micBtn.classList.remove('active');
    micBtn.textContent = 'Enable Mic Detection';
    micStatus.textContent = '';
    micStatus.classList.remove('listening');
    analyser = null;
    dataArray = null;
}

/**
 * Detect loud sounds in audio stream
 */
function detectAudio() {
    if (!isMicEnabled || !analyser) return;
    
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average frequency magnitude
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // Get sensitivity threshold (0-100 converted to 30-200)
    const sensitivity = parseInt(sensitivitySlider.value);
    const threshold = 30 + (sensitivity / 100) * 170;
    
    // Check if sound level exceeds threshold
    if (average > threshold) {
        const now = Date.now();
        if (now - lastShotTime > SHOT_COOLDOWN) {
            recordShot(true); // true = auto-detected
            lastShotTime = now;
        }
    }
    
    animationId = requestAnimationFrame(detectAudio);
}

/**
 * Update sensitivity display value
 */
function updateSensitivityDisplay() {
    sensitivityValue.textContent = sensitivitySlider.value + '%';
}

/**
 * Record a shot with the current time remaining
 */
function recordShot(autoDetected = false) {
    if (!isRunning) return;
    
    const shotTime = timeRemaining;
    const shotNumber = recordedShots.length + 1;
    
    recordedShots.push({
        number: shotNumber,
        time: shotTime,
        autoDetected: autoDetected
    });
    
    addShotToDisplay(shotNumber, shotTime, autoDetected);
    
    // Show clear button
    clearBtn.style.display = 'inline-block';
    
    // Haptic feedback if available
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
}

/**
 * Add a shot to the display list
 */
function addShotToDisplay(number, time, autoDetected = false) {
    // Remove empty message if present
    const emptyMessage = shotsList.querySelector('.empty-message');
    if (emptyMessage) {
        emptyMessage.remove();
    }
    
    // Create shot item
    const shotItem = document.createElement('div');
    shotItem.className = 'shot-item';
    if (autoDetected) {
        shotItem.classList.add('auto-detected');
    }
    
    const sourceLabel = autoDetected ? '<span class="shot-source">(mic detected)</span>' : '<span class="shot-source">(manual)</span>';
    
    shotItem.innerHTML = `
        <span class="shot-number">Shot ${number}</span>
        <span class="shot-time">${time}s remaining${sourceLabel}</span>
    `;
    
    // Insert at the top
    shotsList.insertBefore(shotItem, shotsList.firstChild);
}

/**
 * Clear all recorded shots
 */
function clearAllShots() {
    recordedShots = [];
    shotsList.innerHTML = '<p class="empty-message">No shots recorded yet</p>';
    clearBtn.style.display = 'none';
}

/**
 * Update the time display
 */
function updateDisplay() {
    timeDisplay.textContent = timeRemaining;
}

// Initialize display
updateDisplay();
