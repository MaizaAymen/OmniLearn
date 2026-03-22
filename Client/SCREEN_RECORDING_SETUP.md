# Screen Recording & Sharing Setup Guide

This guide explains how to set up screen recording and live screen sharing for the OmniLearn problem-solving platform.

## Features

### 1. **Local Screen Recording**
- Record your screen while solving problems
- Save recordings as `.webm` video files
- Automatic filename with problem ID and timestamp
- Recording timer displayed in real-time
- Download recorded videos with one click

### 2. **Live Screen Sharing**
- Share your screen in real-time with others (mentors, teammates, etc.)
- Uses Stream.io Video SDK
- Multiple participants can join and view your screen
- Low latency streaming

## Quick Start

### Step 1: Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
cd Client
npm install
```

### Step 2: Configure Stream.io (Required for Screen Sharing Only)

**Note:** Local screen recording works without any configuration. You only need Stream.io setup for live screen sharing with others.

1. **Sign up at Stream.io**
   - Go to https://getstream.io/
   - Create a free account

2. **Create a new app**
   - From the dashboard, create a new video app
   - Choose "Video & Audio" app type

3. **Get your credentials**
   - Copy your **API Key** from the dashboard
   - Generate a **User Token** (for development/testing only)
     - In your app dashboard, go to "Users & Tokens"
     - Click "Generate User Token"
     - Use any user ID (e.g., "test-user")

4. **Create `.env` file**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your credentials:
     ```env
     VITE_STREAM_API_KEY=your_api_key_here
     VITE_STREAM_USER_TOKEN=your_user_token_here
     ```

### Step 3: Start the Development Server

```bash
npm run dev
```

## Usage

### Starting a Recording

1. Navigate to any problem page
2. In the top toolbar, you'll see recording controls
3. Click **"Record"** to start recording your screen
4. You'll be prompted to select which screen/window/tab to share
5. A red recording indicator with timer will appear

### Stopping a Recording

1. Click **"Stop"** button (shows current recording time)
2. The recording will be processed

### Downloading a Recording

1. After stopping, a **"Download"** button appears
2. Click it to download your recording as a `.webm` file
3. Filename format: `{problemId}_{timestamp}.webm`

### Starting Screen Sharing (Live)

1. Click **"Share"** button in the toolbar
2. Select which screen/window to share
3. Click **"Stop Sharing"** when done

**Note:** If Stream.io is not configured, screen sharing will be disabled but recording will still work.

## Components

### `ScreenRecorder.jsx`
Main component that handles:
- Local screen recording using MediaRecorder API
- Live screen sharing using Stream.io
- UI controls for both features
- Recording timer and download functionality

### `StreamVideoProvider.jsx`
Wrapper component that:
- Initializes Stream.io Video Client
- Creates and manages video calls
- Provides video context to child components

### Files Created:
```
Client/
├── src/
│   └── ScreenShare/
│       ├── ScreenRecorder.jsx       # Recording & sharing controls
│       ├── StreamVideoProvider.jsx  # Stream.io provider wrapper
│       └── ScreenShare.jsx          # Original screen share component
├── .env.example                      # Environment variables template
└── .env                              # Your actual credentials (create this)
```

## Browser Compatibility

### Local Recording
- ✅ Chrome/Edge 49+
- ✅ Firefox 25+
- ✅ Safari 14.1+
- ✅ Opera 36+

### Screen Sharing (Stream.io)
- ✅ Chrome/Edge 72+
- ✅ Firefox 66+
- ✅ Safari 13+
- ✅ Opera 60+

## Troubleshooting

### Recording doesn't start
- **Cause:** Browser denied screen capture permission
- **Solution:** Check browser permissions and allow screen recording

### "Share" button is disabled
- **Cause:** Stream.io not configured
- **Solution:** Follow Step 2 to set up Stream.io credentials in `.env`

### Recording file is very large
- **Cause:** High resolution or long recording duration
- **Solution:**
  - Keep recordings shorter
  - Record specific windows instead of entire screen
  - Use video compression tools after download

### No audio in recording
- **Cause:** System audio not shared or browser doesn't support audio capture
- **Solution:**
  - When prompted, check "Share audio" checkbox
  - On Windows: Ensure you select "System Audio" tab in Chrome
  - Some browsers don't support system audio capture

## Production Considerations

### Security
⚠️ **Important:** The current setup uses client-side token generation for Stream.io, which is only suitable for development/testing.

For production:
1. **Never expose tokens in client code**
2. **Generate tokens on your backend server**
3. **Implement user authentication**
4. **Use short-lived tokens**

Example backend token generation:
```javascript
// Backend (Node.js example)
const { StreamClient } = require('@stream-io/node-sdk');

app.post('/api/stream-token', async (req, res) => {
  const client = new StreamClient(apiKey, apiSecret);
  const token = client.createToken(req.user.id);
  res.json({ token });
});
```

### Storage
- Local recordings are downloaded to user's device
- For cloud storage, integrate with AWS S3, Google Cloud Storage, etc.
- Consider implementing server-side recording for live streams

## Advanced Features (Future Enhancements)

Potential improvements:
- [ ] Recording quality selection (720p, 1080p, etc.)
- [ ] Webcam + screen recording (picture-in-picture)
- [ ] Cloud upload after recording
- [ ] Recording playback within the app
- [ ] Automatic problem solution review with AI
- [ ] Multiple participant video calls
- [ ] Recording annotations and markers

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Stream.io documentation: https://getstream.io/video/docs/
3. Check browser console for error messages
4. Create an issue in the project repository

## License

This feature is part of the OmniLearn platform.
