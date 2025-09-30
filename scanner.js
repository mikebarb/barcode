// DOM elements
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const resultDisplay = document.getElementById('result');
const errorDisplay = document.getElementById('error-msg');

let isScanning = false;
let isPaused = false;
let scanningActive = false; // True when Quagga is actively processing

// Configuration for Quagga
const config = {
    inputStream: {
        name: "Live",
        type: "LiveStream",
        target: document.querySelector('#scanner-container'),
        constraints: {
            facingMode: "environment", // Force rear camera on iPhone
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
        }
    },
    decoder: {
        readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "upc_reader",
            "upc_e_reader"
        ]
    },
    locate: true,
    frequency: 10
};

// Function to handle a detected barcode
function onDetected(result) {
    if (isPaused) return; // Ignore detections when paused
    
    const code = result.codeResult.code;
    console.log("Barcode detected and confirmed: ", code);
    
    // Display the result
    resultDisplay.textContent = `Scanned: ${code}`;
    
    // Provide haptic feedback on supported devices (like iPhone)
    if (navigator.vibrate) {
        navigator.vibrate(100); // 100ms vibration
    }
    
    // Optional: Auto-pause after successful scan
    // pauseScanning();
}

// Update UI based on scanning state
function updateUI() {
    startButton.disabled = isScanning;
    pauseButton.disabled = !isScanning;
    stopButton.disabled = !isScanning;
    
    if (isPaused) {
        pauseButton.textContent = "Resume";
        resultDisplay.textContent = "Scanning paused. Press Resume to continue.";
    } else {
        pauseButton.textContent = "Pause";
        if (isScanning) {
            resultDisplay.textContent = "Scanning... Point camera at a barcode.";
        }
    }
}

// Function to start the scanner
function startScanning() {
    if (isScanning) return;
    
    resultDisplay.textContent = "Starting camera...";
    errorDisplay.style.display = 'none';
    
    Quagga.init(config, function (err) {
        if (err) {
            console.error("Quagga initialization failed: ", err);
            errorDisplay.textContent = `Error: ${err.message || 'Could not access camera.'}`;
            errorDisplay.style.display = 'block';
            resultDisplay.textContent = "Failed to start.";
            isScanning = false;
            updateUI();
            return;
        }
        
        console.log("Quagga initialized successfully.");
        Quagga.start();
        isScanning = true;
        isPaused = false;
        scanningActive = true;
        updateUI();
        
        // Set up the detection handler
        Quagga.onDetected(onDetected);
    });
}

// Function to pause scanning (keep camera on, stop processing)
function pauseScanning() {
    if (!isScanning || isPaused) return;
    
    Quagga.offDetected(onDetected); // Remove detection listener
    isPaused = true;
    scanningActive = false;
    console.log("Scanning paused.");
    updateUI();
}

// Function to resume scanning
function resumeScanning() {
    if (!isScanning || !isPaused) return;
    
    Quagga.onDetected(onDetected); // Re-add detection listener
    isPaused = false;
    scanningActive = true;
    console.log("Scanning resumed.");
    updateUI();
}

// Function to stop the scanner completely
function stopScanning() {
    if (!isScanning) return;
    
    Quagga.offDetected(onDetected);
    Quagga.stop();
    isScanning = false;
    isPaused = false;
    scanningActive = false;
    console.log("Scanning stopped.");
    updateUI();
    resultDisplay.textContent = "Scanner stopped. Press Start to scan again.";
}

// Toggle pause/resume
pauseButton.addEventListener('click', function() {
    if (isPaused) {
        resumeScanning();
    } else {
        pauseScanning();
    }
});

// Button event listeners
startButton.addEventListener('click', startScanning);
stopButton.addEventListener('click', stopScanning);

// Handle PWA lifecycle events
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isScanning && scanningActive) {
        pauseScanning(); // Pause when app is backgrounded
    }
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (isScanning) {
        stopScanning();
    }
});

// Initialize UI
updateUI();