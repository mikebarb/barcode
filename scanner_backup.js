// -------------------------------------------------
// File that handles barcode scanning using QuaggaJS
// -------------------------------------------------

// DOM elements
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const stopButton = document.getElementById('stopButton');
const resultDisplay = document.getElementById('result');
const codeDisplay = document.getElementById('code');
const formatDisplay = document.getElementById('format');
const errorDisplay = document.getElementById('error-msg');

let isScanning = false;
let isPaused = false;
let scanningActive = false; // True when Quagga is actively processing
let currentStream = null;   // We will store the stream here

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
    frequency: 10,
    debug: true,
    multiple: false
};

// Function to handle a detected barcode
function onDetected(result) {
    console.log("Detection event: ", result);
    if (isPaused) return; // Ignore detections when paused
    
    const code = result.codeResult.code;
    console.log("Barcode detected and confirmed: ", code);
    const codeFormat = result.codeResult.format;
    console.log("Barcode format: ", codeFormat);

    // Display the result
    //resultDisplay.textContent = `Scanned: ${code}`;
    resultDisplay.textContent = `Barcode Detected - Click 'Resume' to scan again.`;
    codeDisplay.textContent = `Scanned: ${code}`;
    formatDisplay.textContent = `Format: ${codeFormat}`;
    
    // Provide haptic feedback on supported devices (like iPhone)
    if (navigator.vibrate) {
        navigator.vibrate(100); // 100ms vibration
    }
    
    // Optional: Auto-pause after successful scan
    //alert("about to pause scanning");
    pauseScanning();

    // post processing - store details locally
    processScanResults(codeFormat, code);  
}

// Update UI based on scanning state
function updateUI() {
    startButton.disabled = isScanning;
    pauseButton.disabled = !isScanning;
    stopButton.disabled = !isScanning;
    
    if (isPaused) {
        pauseButton.textContent = "Resume";
        resultDisplay.textContent = "Scanning paused. Press Resume to continue.";
        //codeDisplay.textContent = "Code Area";
        // You can also hide the camera preview if you want
        //document.getElementById('scanner-preview').style.display = 'none';
    } else {
        pauseButton.textContent = "Pause";
        if (isScanning) {
            resultDisplay.textContent = "Scanning... Point camera at a barcode.";
            //codeDisplay.textContent = "Code Area";
        }
        // Show the preview again if you hid it
        //document.getElementById('scanner-preview').style.display = 'block';
    }
}

// find the camera to be used for barcode scanning
// returns cameraId - device id of found camera.
async function findCamera(){
    let cameraId;
    // First, check for camera permissions and get a list of devices
    await navigator.mediaDevices.getUserMedia({ video: true });
    // Get all available media devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    // Filter for video input devices (cameras)
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    console.log("Video devices found: ", videoDevices);

    if (videoDevices.length > 1) {
        // Prefer the USB webcam. Often the built-in cam is labeled "FaceTime" or "Integrated"
        // On the PC, the usb camer used is called 'OBS Virtual Camera'
        const obsCam = videoDevices.find(device =>
            device.label.toLowerCase().includes('obs')
        );
        console.log("obsCam search result: ", obsCam);
        //alert("usbCam: " + usbCam?.label);
        // Find the rear camera - iOS typically labels rear camera with "back" in label
        const rearCameraIphone = videoDevices.find(camera => 
            camera.label.toLowerCase().includes('back') ||
            camera.label.toLowerCase().includes('rear')
        );
        console.log("rearCameraIphone search result: ", rearCameraIphone);
        //alert("rearCameraIphone: " + rearCameraIphone?.label);
        cameraId = rearCameraIphone ? rearCameraIphone.deviceId : obsCam ? obsCam.deviceId : videoDevices[0].deviceId;
        console.log(`Using video camera: ${obsCam?.label || videoDevices[0].label}`);
    } else {
        cameraId = videoDevices[0]?.deviceId;
        console.log(`Using other camera: ${videoDevices[0]?.label || 'Default'}`);
    }
    return cameraId;
}

// Standard initialization function
async function initScanner() {
    const cameraId = await findCamera();
    console.log("Selected camera ID: ", cameraId);  
    // put this cameraId into the existing config
    config.inputStream.constraints.deviceId = cameraId;
    console.log("config_updated: ", config);

    Quagga.init(config, function(err) {
        if (err) { return console.error(err); }
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

// Function to start the scanner
function startScanning() {
    if (isScanning) return;
    
    initScanner();
    resultDisplay.textContent = "Starting camera...";
    errorDisplay.style.display = 'none';
    codeDisplay.textContent = "Code Area";
    formatDisplay.textContent = " ";
}

// Function to pause scanning (keep camera on, stop processing)
function pauseScanning() {
    if (!isScanning || isPaused) return;
    
    // 1. First, stop getting events
    Quagga.offDetected(onDetected);
    
    // 2. This is the key: Stop Quagga's processing and internal drawing
    //Quagga.stop();
    
    // 3. BUT, immediately capture the active media stream before it's lost!
    // Quagga can give us access to the stream it was using.
    //if (Quagga.CameraAccess && Quagga.CameraAccess.getActiveStream()) {
    //    currentStream = Quagga.CameraAccess.getActiveStream();
    //    console.log("Camera stream captured for later resumption.");
    //}

    // This stops the CPU-intensive analysis but keeps the camera stream alive!
    Quagga.pauseProcessing();
    // Also remove the detector to be safe
    //Quagga.offDetected(onDetected); // Remove detection listener
    
    isPaused = true;
    scanningActive = false;
    console.log("Scanning paused.");
    updateUI();
}

// Function to resume scanning
function resumeScanning() {
    if (!isScanning || !isPaused) return;

    codeDisplay.textContent = "Code Area";
    formatDisplay.textContent = " ";
    // Restart the processing on the existing, still-active camera stream
    //Quagga.resume();
    Quagga.resumeProcessing();

    // Re-attach the detector
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


