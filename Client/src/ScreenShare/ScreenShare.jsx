import React from 'react'
import { useCall } from '@stream-io/video-react-sdk';
export const ScreenShare = () => {
  const call = useCall();

  const startScreenShare = async () => {
    if (!call) return;

    try {
      // Ask the user to pick a screen/window/tab
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // optional, include if you want system audio
      });

      // Add the screen stream as a track in the call
      await call.localParticipant.publishTracks(stream.getTracks(), {
        type: 'screen',
      });

      // Optional: stop sharing after user ends
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        call.localParticipant.unpublishTracks(stream.getTracks());
      });
    } catch (err) {
      console.error('Screen share failed', err);
    }
  };

  return <button onClick={startScreenShare}>Share Screen</button>;
};