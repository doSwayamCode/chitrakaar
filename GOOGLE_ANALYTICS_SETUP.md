# Google Analytics Setup Guide

## 🎯 What's Implemented

Google Analytics 4 (GA4) tracking has been added to Chitrakaar with the following features:

### Automatic Tracking:
- Page views
- User sessions
- Device types (mobile/desktop)
- Browser information
- Geographic location

### Custom Events Tracked:
1. **room_created** - When a player creates a room
   - game_mode, is_public, total_rounds

2. **room_joined** - When a player joins a room
   - game_mode, player_count, total_rounds

3. **game_started** - When a game begins
   - game_mode, player_count, total_rounds, turn_time

4. **game_completed** - When a game finishes successfully
   - game_mode, player_count, final_score, placement, won_game

5. **game_cancelled** - When a game is cancelled
   - game_mode, reason

## 📋 Setup Instructions

### Step 1: Create Google Analytics Account
1. Go to [Google Analytics](https://analytics.google.com/)
2. Sign in with your Google account
3. Click **"Start measuring"**
4. Enter account name: `Chitrakaar`
5. Click **"Next"**

### Step 2: Create Property
1. Property name: `Chitrakaar Game`
2. Time zone: Select your timezone (e.g., `India`)
3. Currency: `INR` (or your preferred currency)
4. Click **"Next"**

### Step 3: Get Measurement ID
1. Choose **"Web"** as platform
2. Enter website URL: `https://chitrakaar.com`
3. Stream name: `Chitrakaar Web`
4. Click **"Create stream"**
5. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 4: Update Your Code
1. Open `public/index.html`
2. Find **two instances** of `G-XXXXXXXXXX`
3. Replace both with your actual Measurement ID:
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR-ACTUAL-ID"></script>
   ```
   and
   ```javascript
   gtag('config', 'G-YOUR-ACTUAL-ID', {
   ```

### Step 5: Deploy & Verify
1. Deploy your updated code
2. Visit your website
3. In Google Analytics, go to **Reports > Realtime**
4. You should see your visit within 30 seconds!

## 📊 View Your Data

### Real-time Data
**Reports > Realtime** - See current users on your site

### Event Tracking
**Reports > Engagement > Events** - See custom events:
- room_created
- room_joined
- game_started
- game_completed
- game_cancelled

### User Insights
- **Reports > User attributes** - Demographics
- **Reports > Tech > Tech details** - Browsers, devices
- **Reports > Acquisition** - How users find your game

## 🔒 Privacy Features Enabled

✅ **IP Anonymization** - User IPs are anonymized
✅ **Cookie Consent Ready** - SameSite=None;Secure flags
✅ **No PII Collected** - Only game metrics tracked

## 🎨 Custom Dashboards

Create custom reports for:
- Most popular game modes
- Average game completion rate
- Peak playing times
- Player retention

## 📝 Notes

- Data appears in reports within 24-48 hours
- Real-time reports update within seconds
- Keep your Measurement ID private (don't commit to public repos)
- Consider adding it to `.env` file for security

## 🆘 Troubleshooting

**Not seeing data?**
1. Check Measurement ID is correct in both places
2. Clear browser cache
3. Check browser console for errors
4. Verify AdBlockers are disabled for testing
5. Wait 30 seconds for real-time data

**Events not showing?**
- Events appear in "Events" section after ~10 minutes
- Check browser console: `gtag` should be defined
- Test: Open console and run `window.trackEvent('test', {})`

---

🎉 **You're all set!** Analytics will help you understand your players and improve Chitrakaar!
