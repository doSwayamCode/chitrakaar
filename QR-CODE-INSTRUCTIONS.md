# QR Code Setup Instructions

## Where to Put Your QR Code Image

1. **Create/Generate a QR Code**:
   - Go to https://qr-code-generator.com or https://www.qr-code-generator.com
   - Enter your website URL: `https://chitrakaar-dct4.onrender.com`
   - Download the QR code image (PNG format recommended)
   - Make sure it's at least 400x400 pixels for good quality

2. **Save the QR Code**:
   - Save the downloaded QR code image as `qr-code.png`
   - Place it directly in the `public` folder:
     ```
     game/
     └── public/
         ├── qr-code.png  ← PUT YOUR QR CODE IMAGE HERE
         ├── app.js
         ├── index.html
         ├── share.js
         └── ...
     ```

3. **Alternative Name** (Optional):
   - If you want to use a different filename, update line 102 in `share.js`:
   - Change `qrImg.src = '/qr-code.png';` to your filename

## Testing the QR Code

After placing the image:

1. Restart your server
2. Start a game and draw something
3. Click the "Share" button
4. The Instagram story template should now show your QR code instead of the placeholder

## QR Code Recommendations

✅ **DO:**

- Use high contrast (black on white or vice versa)
- Keep it at least 400x400 pixels
- Test it with multiple QR scanners
- Use PNG format with transparent/white background

❌ **DON'T:**

- Make it too small (blurry in stories)
- Use low contrast colors
- Add too much design (might not scan properly)
- Use JPEG with compression artifacts

## Quick QR Code Generators

- **Free Online**: https://www.qr-code-generator.com
- **With Logo**: https://www.canva.com/qr-code-generator/
- **API**: https://goqr.me/api/
