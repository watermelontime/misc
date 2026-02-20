
// Status: experimental

// Description
// QR-Code Scanner with ZXing.js

// QR Code Scanner with ZXing.js
var video = null;
var codeReader = null;
var isScannerActive = false;
var scanningInterval = null;

function toggleScanner() {
    if (!isScannerActive) {
        startScanner();
    } else {
        stopScanner();
    }
}

function startScanner() {
    var scannerContainer = document.getElementById('scanner-container');
    scannerContainer.style.display = 'block';
    
    // Check if ZXing is loaded
    if (typeof ZXing === 'undefined') {
        alert('ZXing library not loaded. Please check your connection.');
        return;
    }
    
    isScannerActive = true;
    var scanBtn = document.getElementById('scanner-btn');
    scanBtn.textContent = '⏹️ Stop Scan';
    scanBtn.style.backgroundColor = '#d32f2f';
    var resultElement = document.getElementById('scanner-result');
    resultElement.textContent = 'Starting camera...';
    resultElement.style.color = '#1976D2';
    console.log('Scanner started, waiting for camera...');
    
    // Create video element for camera stream
    var scannerDiv = document.getElementById('scanner');
    scannerDiv.innerHTML = '<video id="video-scanner" style="width: 100%; max-width: 500px; border-radius: 6px;"></video>';
    video = document.getElementById('video-scanner');
    
    // Initialize ZXing code reader
    codeReader = new ZXing.BrowserMultiFormatReader();
    codeReader.getVideoInputDevices()
        .then(videoInputDevices => {
            console.log('Available devices:', videoInputDevices);
            if (videoInputDevices.length > 0) {
                // Prefer rear camera
                var selectedDeviceId = videoInputDevices[0].deviceId;
                
                for (var i = 0; i < videoInputDevices.length; i++) {
                    var label = videoInputDevices[i].label.toLowerCase();
                    if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
                        selectedDeviceId = videoInputDevices[i].deviceId;
                        console.log('Using rear camera:', videoInputDevices[i].label);
                        break;
                    }
                }
                
                // Start decoding from video element
                codeReader.decodeFromVideoDevice(selectedDeviceId, video, (result, err) => {
                    if (result) {
                        console.log('Scanned:', result.text);
                        onScanSuccess(result.text);
                    }
                    if (err && !(err instanceof ZXing.NotFoundException)) {
                        console.error('Error:', err);
                    }
                }).catch(err => {
                    console.error('Camera error:', err);
                    resultElement.textContent = 'Camera access denied or not available.';
                    resultElement.style.color = '#d32f2f';
                });
            } else {
                alert('No camera found on this device.');
                stopScanner();
            }
        })
        .catch(err => {
            console.error('Error getting devices:', err);
            alert('Unable to access camera: ' + err);
            stopScanner();
        });
}

function stopScanner() {
    if (isScannerActive) {
        isScannerActive = false;
        if (codeReader) {
            codeReader.reset();
        }
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        var scanBtn = document.getElementById('scanner-btn');
        scanBtn.textContent = '📷 Scan QR-Code';
        scanBtn.style.backgroundColor = '#4CAF50';
        document.getElementById('scanner-container').style.display = 'none';
        // Keep the result message visible for user reference
    }
}

function onScanSuccess(decodedText) {
    console.log('SUCCESS: Scanned QR Code:', decodedText);
    
    // Populate textarea with scanned QR code content
    document.getElementById('text-input').value = decodedText;
    
    // Update result display with success message
    var resultElement = document.getElementById('scanner-result');
    resultElement.textContent = '✓ QR Code scanned successfully!';
    resultElement.style.color = '#4CAF50';
    resultElement.style.display = 'block';
    console.log('Result element updated:', resultElement.textContent);
    
    // Stop scanner after successful scan
    setTimeout(() => {
        stopScanner();
    }, 1500);
}