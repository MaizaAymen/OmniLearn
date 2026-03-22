# Quick Start - Screen Recording for Problem Solving

## What's Been Added

✅ **Local Screen Recording** - Record your screen and download as video file
✅ **Live Screen Sharing** - Share your screen in real-time with Stream.io
✅ **Integrated UI** - Recording controls in the ProblemPage toolbar
✅ **Auto-naming** - Videos named with problem ID and timestamp

## Files Created

```
Client/src/ScreenShare/
├── ScreenRecorder.jsx           # Main recording component
├── StreamVideoProvider.jsx      # Stream.io wrapper
└── ScreenShare.jsx              # (your original file)

Client/
├── .env.example                # Environment variable template
└── SCREEN_RECORDING_SETUP.md   # Detailed setup guide
```

## How to Use (No Setup Required for Recording)

### 1. Local Recording (Works Immediately)

1. Navigate to any problem: `http://localhost:5173/problems/two-sum`
2. Click the **"Record"** button in the toolbar
3. Select which screen/window/tab to record
4. Solve the problem (timer shows recording duration)
5. Click **"Stop"** when done
6. Click **"Download"** to save the `.webm` video file

**That's it!** Recording works out of the box with no configuration.

### 2. Live Screen Sharing (Requires Stream.io Setup)

To share your screen live with others (mentors, teammates):

1. **Sign up at**: https://getstream.io/
2. **Create a video app** and get your API key
3. **Generate a user token** (in dashboard under "Users & Tokens")
4. **Create `.env` file** in the `Client/` folder:
   ```env
   VITE_STREAM_API_KEY=your_api_key_here
   VITE_STREAM_USER_TOKEN=your_user_token_here
   ```
5. **Restart dev server**: `npm run dev`
6. **Click "Share"** in the toolbar to start sharing

## UI Controls

In the ProblemPage toolbar, you'll see:

```
[Record] | [Download*] | [Share]
```

- **Record** - Start/Stop local recording
- **Download** - Download recorded video (appears after stopping)
- **Share** - Start/Stop live screen sharing

## Tips

1. **Keep recordings short** - Longer recordings = larger file sizes
2. **Check browser permissions** - Allow screen capture when prompted
3. **Share audio** - Check "Share audio" when prompted for system sound
4. **Close other tabs** - For better performance during recording

## Troubleshooting

**"Record" button doesn't work**
- Check browser permissions for screen recording
- Try refreshing the page

**"Share" button is disabled**
- Stream.io is not configured
- Local recording still works without Stream.io

**Recording file too large**
- Record specific windows instead of full screen
- Keep recordings shorter
- Use video compression tools after download

## Next Steps

- Read `SCREEN_RECORDING_SETUP.md` for detailed documentation
- Set up Stream.io for live screen sharing (optional)
- Test recording on a sample problem

Enjoy recording your problem-solving sessions! 🎥
