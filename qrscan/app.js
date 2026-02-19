
// Status: experimental

// Description
// QR-Code Scanner

// QR Code Scanner with Html5Qrcode
var scanner = null;
var isScannerActive = false;

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
    
    // Check if Html5Qrcode is loaded
    if (typeof Html5Qrcode === 'undefined') {
        alert('Html5Qrcode library not loaded. Please check your connection.');
        return;
    }
    
    scanner = new Html5Qrcode("scanner");
    isScannerActive = true;
    document.getElementById('scanner-btn').textContent = '⏹️ Stop Scan';
    var resultElement = document.getElementById('scanner-result');
    resultElement.textContent = 'Starting camera...';
    resultElement.style.color = '#1976D2';
    console.log('Scanner started, waiting for camera...');
    
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            // Prefer rear camera on iOS/mobile
            var cameraId = devices[0].id;
            
            // Look for rear/back camera
            for (var i = 0; i < devices.length; i++) {
                var label = devices[i].label.toLowerCase();
                // iOS labels: "Front Camera", "Back Camera" or "Camera 0", "Camera 1"
                if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
                    cameraId = devices[i].id;
                    console.log('Using rear camera:', devices[i].label);
                    break;
                }
            }
            
            // If no rear camera found and multiple devices exist, try the second one
            if (devices.length > 1 && cameraId === devices[0].id) {
                cameraId = devices[1].id;
                console.log('Trying alternate camera:', devices[1].label);
            }
            
            scanner.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                onScanSuccess,
                onScanFailure
            ).catch(err => {
                console.error('Camera error:', err);
                document.getElementById('scanner-result').textContent = 'Camera access denied or not available.';
                document.getElementById('scanner-result').style.color = '#d32f2f';
            });
        } else {
            alert('No camera found on this device.');
            stopScanner();
        }
    }).catch(err => {
        console.error('Error getting cameras:', err);
        alert('Unable to access camera: ' + err);
        stopScanner();
    });
}

function stopScanner() {
    if (scanner && isScannerActive) {
        scanner.stop().then(() => {
            scanner.clear();
            isScannerActive = false;
            document.getElementById('scanner-btn').textContent = '📷 Scan QR';
            document.getElementById('scanner-container').style.display = 'none';
            // Keep the result message visible for user reference
        }).catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
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

function onScanFailure(error) {
    // Silently handle scanning errors (normal when no QR code in frame)
    // Uncomment for debugging:
    // console.log('Scan error:', error);
}