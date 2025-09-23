class BarcodeReader {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.switchCameraBtn = document.getElementById('switchCamera');
        this.resultDiv = document.getElementById('result');
        this.scannerLine = document.getElementById('scannerLine');
        
        this.stream = null;
        this.codeReader = new ZXing.BrowserMultiFormatReader();
        this.cameras = [];
        this.currentCameraIndex = 0;
        this.isScanning = false;

        this.history = JSON.parse(localStorage.getItem('barcodeHistory') || '[]');
        
        this.init();
    }
    
    async init() {
        await this.getCameras();
        this.bindEvents();
        
        // Check if running as PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('Running as PWA');
        }
    }
    
    async getCameras() {
        try {
            // First request camera permission to get accurate device list
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately
            
            // Now enumerate devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.cameras = devices.filter(device => device.kind === 'videoinput');
            
            console.log('Available cameras:', this.cameras.length);
            console.log('Camera details:', this.cameras);
            
            // Show switch button if we detect multiple cameras OR on mobile devices
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (this.cameras.length > 1 || (isMobile && this.cameras.length >= 1)) {
                this.switchCameraBtn.style.display = 'inline-block';
                console.log('Switch camera button enabled');
            }
        } catch (error) {
            console.error('Error getting cameras:', error);
            
            // Fallback: Show switch button on mobile devices even if enumeration fails
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
                this.switchCameraBtn.style.display = 'inline-block';
                console.log('Switch camera button enabled (fallback for mobile)');
            }
        }
    }

    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startScanning());
        this.stopBtn.addEventListener('click', () => this.stopScanning());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isScanning) {
                this.stopScanning();
            }
        });
    }
    
    async startScanning() {
        try {
            this.showResult('Starting camera...', false);
            
            const constraints = {
                video: {
                    facingMode: this.cameras.length > 1 ? 'environment' : 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            // Use specific camera if available
            if (this.cameras.length > 0) {
                constraints.video.deviceId = this.cameras[this.currentCameraIndex].deviceId;
            }
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            await this.video.play();
            
            this.isScanning = true;
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.scannerLine.style.display = 'block';
            
            this.scanBarcode();
            this.showResult('Camera started. Point at a barcode to scan.', false);
            
        } catch (error) {
            console.error('Error starting camera:', error);
            this.showResult(`Camera error: ${error.message}`, true);
        }
    }
    
    stopScanning() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.isScanning = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.scannerLine.style.display = 'none';
        
        this.showResult('Camera stopped.', false);
    }
    
    async switchCamera() {
        if (this.cameras.length <= 1) return;
        
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameras.length;
        
        if (this.isScanning) {
            this.stopScanning();
            await new Promise(resolve => setTimeout(resolve, 500));
            this.startScanning();
        }
    }
    
    async scanBarcode() {
    if (!this.isScanning) return;
    
    try {
        // Wait for video to be ready
        if (this.video.readyState !== this.video.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(() => this.scanBarcode());
            return;
        }
        
        // Set canvas size to match video dimensions
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            requestAnimationFrame(() => this.scanBarcode());
            return;
        }
        
        // Draw current frame to canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        try {
            // Try to decode barcode using ZXing
            const result = this.codeReader.decodeFromImageData(imageData);
            
            if (result && result.text) {
                console.log('Barcode found:', result.text);
                this.onBarcodeDetected(result);
                // Optional: stop scanning after detection
                // this.stopScanning();
                return;
            }
        } catch (decodeError) {
            // No barcode found in this frame, continue scanning
        }
        
    } catch (error) {
        console.error('Scanning error:', error);
    }
    
    // Continue scanning at ~10 FPS for better performance
    if (this.isScanning) {
        setTimeout(() => {
            requestAnimationFrame(() => this.scanBarcode());
        }, 100);
    }
}

    
    onBarcodeDetected(result) {
        const barcodeData = result.text;
        const format = result.format;
        
        console.log('Barcode detected:', barcodeData);
        
        // Show result
        this.showResult(`
            <strong>Barcode Detected!</strong><br>
            Format: ${format}<br>
            Data: ${barcodeData}
        `, false);
        
        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        
        // Play sound if supported
        this.playBeep();
        
        // Optional: Stop scanning after detection
        // this.stopScanning();
        
        // Optional: Copy to clipboard
        this.copyToClipboard(barcodeData);
        
        // Add to history
        const historyItem = {
        data: result.text,
        format: result.format,
        timestamp: new Date().toISOString()
    };
    
    this.history.unshift(historyItem);
    this.history = this.history.slice(0, 50); // Keep last 50 scans
    localStorage.setItem('barcodeHistory', JSON.stringify(this.history));
    }
    
    showResult(message, isError = false) {
        this.resultDiv.innerHTML = message;
        this.resultDiv.className = `result ${isError ? 'error' : ''}`;
        this.resultDiv.style.display = 'block';
    }
    
    playBeep() {
        // Create audio context for beep sound
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioContextClass = AudioContext || webkitAudioContext;
            const audioContext = new AudioContextClass();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    }
    
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('Copied to clipboard:', text);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    }

    // Add to BarcodeReader class
    handleCameraError(error) {
        let message = 'Camera access failed: ';
        
        switch (error.name) {
            case 'NotAllowedError':
                message += 'Permission denied. Please allow camera access.';
                break;
            case 'NotFoundError':
                message += 'No camera found on this device.';
                break;
            case 'NotSupportedError':
                message += 'Camera not supported in this browser.';
                break;
            case 'NotReadableError':
                message += 'Camera is already in use by another application.';
                break;
            default:
                message += error.message;
        }
        
        this.showResult(message, true);
    }

}

// Initialize the barcode reader when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BarcodeReader();
});

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
