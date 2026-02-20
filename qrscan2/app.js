
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
                // Prefer rear camera - try multiple strategies
                var selectedDeviceId = videoInputDevices[0].deviceId;
                var rearCameraFound = false;
                
                // Strategy 1: Look for device label containing "back", "rear", or "environment"
                for (var i = 0; i < videoInputDevices.length; i++) {
                    var label = videoInputDevices[i].label.toLowerCase();
                    if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
                        selectedDeviceId = videoInputDevices[i].deviceId;
                        console.log('Strategy 1 - Using rear camera by label:', videoInputDevices[i].label);
                        rearCameraFound = true;
                        break;
                    }
                }
                
                // Strategy 2: If not found by label and multiple cameras exist, use second device (usually rear on mobile)
                if (!rearCameraFound && videoInputDevices.length > 1) {
                    selectedDeviceId = videoInputDevices[1].deviceId;
                    console.log('Strategy 2 - Using second camera (likely rear):', videoInputDevices[1].label);
                }
                
                console.log('Selected camera deviceId:', selectedDeviceId);
                
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