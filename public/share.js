// Instagram Story Sharing Feature

function createStoryTemplate(canvasData, playerName, word) {
    // Create a canvas for Instagram story (1080x1920)
    const storyCanvas = document.createElement('canvas');
    storyCanvas.width = 1080;
    storyCanvas.height = 1920;
    const storyCtx = storyCanvas.getContext('2d');
    
    // Background gradient
    const gradient = storyCtx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    storyCtx.fillStyle = gradient;
    storyCtx.fillRect(0, 0, 1080, 1920);
    
    // Top decorative elements
    storyCtx.fillStyle = 'rgba(255, 107, 43, 0.1)';
    storyCtx.beginPath();
    storyCtx.arc(200, 200, 300, 0, Math.PI * 2);
    storyCtx.fill();
    
    storyCtx.fillStyle = 'rgba(0, 201, 123, 0.08)';
    storyCtx.beginPath();
    storyCtx.arc(880, 1700, 250, 0, Math.PI * 2);
    storyCtx.fill();
    
    // Title
    storyCtx.fillStyle = '#ffffff';
    storyCtx.font = 'bold 80px Inter, sans-serif';
    storyCtx.textAlign = 'center';
    storyCtx.fillText('Chitrakaar', 540, 150);
    
    storyCtx.font = '40px Inter, sans-serif';
    storyCtx.fillStyle = '#9999bb';
    storyCtx.fillText('Draw & Guess, Desi Style!', 540, 220);
    
    // Drawing frame
    const frameX = 90;
    const frameY = 320;
    const frameWidth = 900;
    const frameHeight = 900;
    
    // Frame border with gradient
    const frameBorder = storyCtx.createLinearGradient(frameX, frameY, frameX + frameWidth, frameY + frameHeight);
    frameBorder.addColorStop(0, '#ff6b2b');
    frameBorder.addColorStop(1, '#ffc845');
    storyCtx.fillStyle = frameBorder;
    storyCtx.fillRect(frameX - 10, frameY - 10, frameWidth + 20, frameHeight + 20);
    
    // White background for drawing
    storyCtx.fillStyle = '#ffffff';
    storyCtx.fillRect(frameX, frameY, frameWidth, frameHeight);
    
    // Draw the game canvas (scaled)
    const tempImg = new Image();
    tempImg.onload = () => {
        storyCtx.drawImage(tempImg, frameX, frameY, frameWidth, frameHeight);
        
        // Word label
        if (word) {
            storyCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            storyCtx.fillRect(0, 1300, 1080, 100);
            storyCtx.fillStyle = '#ffc845';
            storyCtx.font = 'bold 60px Inter, sans-serif';
            storyCtx.textAlign = 'center';
            storyCtx.fillText(`The word was: "${word}"`, 540, 1370);
        }
        
        // Player name
        storyCtx.fillStyle = '#ffffff';
        storyCtx.font = 'bold 48px Inter, sans-serif';
        storyCtx.fillText(`Drawn by ${playerName}`, 540, 1480);
        
        // Call to action
        const siteUrl = 'chitrakaar-dct4.onrender.com';
        storyCtx.font = '36px Inter, sans-serif';
        storyCtx.fillStyle = '#9999bb';
        storyCtx.fillText(`Play now at ${siteUrl}`, 540, 1560);

        // Load QR Code, then show modal once it’s drawn (so it appears in the image)
        const qrImg = new Image();
        qrImg.onload = () => {
            storyCtx.drawImage(qrImg, 440, 1610, 200, 200);
            showShareModal(storyCanvas);
        };
        qrImg.onerror = () => {
            // QR not found — draw a placeholder label instead
            storyCtx.fillStyle = 'rgba(255,255,255,0.08)';
            storyCtx.fillRect(440, 1610, 200, 200);
            storyCtx.fillStyle = '#667799';
            storyCtx.font = '22px Inter, sans-serif';
            storyCtx.textAlign = 'center';
            storyCtx.fillText('chitrakaar-dct4', 540, 1700);
            storyCtx.fillText('.onrender.com', 540, 1726);
            showShareModal(storyCanvas);
        };
        qrImg.src = '/qr-code.png';
    };
    tempImg.src = canvasData;
}

function showShareModal(storyCanvas) {
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-overlay"></div>
        <div class="share-content">
            <div class="share-header">
                <h2>Share Your Drawing</h2>
                <button class="close-share" aria-label="Close">×</button>
            </div>
            
            <div class="share-preview">
                <img src="${storyCanvas.toDataURL('image/png')}" alt="Share preview" />
            </div>
            
            <div class="share-buttons">
                <button class="share-btn instagram" onclick="shareToInstagram()">
                    <span class="share-icon">📷</span>
                    <span>Instagram Story</span>
                </button>
                <button class="share-btn whatsapp" onclick="shareToWhatsApp()">
                    <span class="share-icon">💬</span>
                    <span>WhatsApp</span>
                </button>
                <button class="share-btn download" onclick="downloadImage()">
                    <span class="share-icon">⬇️</span>
                    <span>Download</span>
                </button>
                <button class="share-btn copy" onclick="copyImageToClipboard()">
                    <span class="share-icon">📋</span>
                    <span>Copy Image</span>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store canvas data for sharing functions
    window.currentShareCanvas = storyCanvas;
    
    // Close button
    modal.querySelector('.close-share').addEventListener('click', () => {
        modal.remove();
        window.currentShareCanvas = null;
    });
    
    // Close on overlay click
    modal.querySelector('.share-overlay').addEventListener('click', () => {
        modal.remove();
        window.currentShareCanvas = null;
    });
}

function shareToInstagram() {
    if (!window.currentShareCanvas) return;
    
    const dataUrl = window.currentShareCanvas.toDataURL('image/png');
    
    // For mobile, try to open Instagram app
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
        // Download the image first
        const link = document.createElement('a');
        link.download = `chitrakaar-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        
        // Show instructions
        showToast('Image downloaded! Open Instagram and add it to your story', 'success');
        
        // Try to open Instagram
        setTimeout(() => {
            window.location.href = 'instagram://story-camera';
        }, 1000);
    } else {
        // Desktop - just download
        downloadImage();
        showToast('Image downloaded! Upload it to Instagram from your phone', 'success');
    }
}

function shareToWhatsApp() {
    if (!window.currentShareCanvas) return;
    
    // Download image first
    downloadImage();
    
    const message = `Check out my Chitrakaar drawing! 🎨\n\nPlay now: ${window.location.origin}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
}

function downloadImage() {
    if (!window.currentShareCanvas) return;
    
    const link = document.createElement('a');
    link.download = `chitrakaar-${Date.now()}.png`;
    link.href = window.currentShareCanvas.toDataURL('image/png');
    link.click();
    
    showToast('Image downloaded!', 'success');
}

async function copyImageToClipboard() {
    if (!window.currentShareCanvas) return;
    
    try {
        const blob = await new Promise(resolve => 
            window.currentShareCanvas.toBlob(resolve, 'image/png')
        );
        
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        
        showToast('Image copied to clipboard!', 'success');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        // Fallback: just download
        downloadImage();
    }
}

// Add share button to game UI
function initializeShareFeature() {
    // Add share button after save button in tools bar
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn && !document.getElementById('share-drawing-btn')) {
        const shareBtn = document.createElement('button');
        shareBtn.id = 'share-drawing-btn';
        shareBtn.className = 'tool-btn tool-btn-share';
        shareBtn.title = 'Share to Instagram';
        shareBtn.innerHTML = '📷 Share';
        shareBtn.style.cssText = 'display: flex !important; align-items: center !important; gap: 4px !important;';
        shareBtn.addEventListener('click', shareCurrentDrawing);
        // Use touchend for better mobile support
        shareBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            shareCurrentDrawing();
        });
        saveBtn.parentNode.insertBefore(shareBtn, saveBtn.nextSibling);
    }
}

function shareCurrentDrawing() {
    if (!canvas) return;
    
    const playerName = playerNameInput?.value || 'You';
    const currentWord = wordHint?.textContent.replace(/[_\s]/g, '') || '';
    
    createStoryTemplate(canvas.toDataURL('image/png'), playerName, currentWord);
}

// Initialize when game starts and on new turns
if (typeof socket !== 'undefined') {
    socket.on('gameStarted', () => {
        setTimeout(initializeShareFeature, 500);
    });
    socket.on('newTurn', () => {
        setTimeout(initializeShareFeature, 500);
    });
    socket.on('turnStarted', () => {
        setTimeout(initializeShareFeature, 500);
    });
}

// Also initialize when DOM is ready (fallback)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeShareFeature, 2000);
    });
} else {
    setTimeout(initializeShareFeature, 2000);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createStoryTemplate,
        showShareModal,
        shareToInstagram,
        downloadImage
    };
}
