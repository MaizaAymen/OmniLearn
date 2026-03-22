import { useState, useRef, useCallback, useEffect } from "react";
import { useCall } from "@stream-io/video-react-sdk";
import {
  VideoIcon,
  VideoOffIcon,
  MonitorIcon,
  MonitorOffIcon,
  DownloadIcon,
  Loader2Icon,
} from "lucide-react";
import toast from "react-hot-toast";

export const ScreenRecorder = ({ problemId, problemTitle }) => {
  const call = useCall();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlobs, setRecordedBlobs] = useState([]);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  // Sharing state
  const [isSharing, setIsSharing] = useState(false);
  const [sharingError, setSharingError] = useState(null);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Start recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Start screen recording
  const startRecording = useCallback(async () => {
    try {
      // Get screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          logicalSurface: true,
          cursor: "always",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      setRecordedBlobs([]);
      setRecordingTime(0);

      // Create MediaRecorder
      const options = { mimeType: "video/webm; codecs=vp9,opus" };

      // Fallback to vp8 if vp9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = "video/webm; codecs=vp8,opus";
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        setRecordedBlobs(chunks);
        setIsRecording(false);
      };

      // Stop recording when user stops sharing
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopRecording();
      });

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      toast.success("Screen recording started!");
    } catch (err) {
      console.error("Failed to start recording:", err);
      toast.error("Failed to start recording: " + err.message);
    }
  }, []);

  // Stop screen recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      toast.success("Recording stopped!");
    }
  }, [isRecording]);

  // Download recorded video
  const downloadRecording = useCallback(() => {
    if (recordedBlobs.length === 0) {
      toast.error("No recording available to download");
      return;
    }

    const blob = new Blob(recordedBlobs, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;

    // Create filename with problem info and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${problemId || "problem"}_${timestamp}.webm`;
    a.download = filename;

    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    toast.success("Recording downloaded!");
  }, [recordedBlobs, problemId]);

  // Start screen sharing (Stream.io)
  const startScreenShare = useCallback(async () => {
    if (!call) {
      toast.error("Video call not initialized");
      return;
    }

    try {
      setSharingError(null);

      // Get screen stream for sharing
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Publish to Stream.io
      await call.localParticipant.publishTracks(stream.getTracks(), {
        type: "screen",
      });

      // Stop sharing when user closes screen share
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopScreenShare();
      });

      setIsSharing(true);
      toast.success("Screen sharing started!");
    } catch (err) {
      console.error("Screen share failed:", err);
      setSharingError(err.message);
      toast.error("Failed to share screen: " + err.message);
    }
  }, [call]);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    if (!call) return;

    try {
      // Get all screen tracks and unpublish them
      const screenTracks = call.localParticipant.publishedTracks.filter(
        (track) => track.trackType === "screenShareVideo" || track.trackType === "screenShareAudio"
      );

      if (screenTracks.length > 0) {
        await call.localParticipant.unpublishTracks(
          screenTracks.map((t) => t.track)
        );
      }

      setIsSharing(false);
      toast.success("Screen sharing stopped!");
    } catch (err) {
      console.error("Failed to stop screen share:", err);
      toast.error("Failed to stop sharing");
    }
  }, [call]);

  return (
    <div className="flex items-center gap-2">
      {/* Recording controls */}
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="btn btn-sm btn-outline gap-1.5"
            title="Start recording screen"
          >
            <VideoIcon className="size-3.5" />
            Record
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={stopRecording}
              className="btn btn-sm btn-error gap-1.5"
              title="Stop recording"
            >
              <VideoOffIcon className="size-3.5" />
              Stop ({formatTime(recordingTime)})
            </button>

            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
              </span>
            </div>
          </div>
        )}

        {/* Download button (shown when recording is stopped and blobs exist) */}
        {!isRecording && recordedBlobs.length > 0 && (
          <button
            onClick={downloadRecording}
            className="btn btn-sm btn-success gap-1.5"
            title="Download recorded video"
          >
            <DownloadIcon className="size-3.5" />
            Download
          </button>
        )}
      </div>

      <div className="divider divider-horizontal mx-0 h-6" />

      {/* Screen sharing controls */}
      <div className="flex items-center gap-2">
        {!isSharing ? (
          <button
            onClick={startScreenShare}
            className="btn btn-sm btn-outline gap-1.5"
            title="Share screen with others"
            disabled={!call}
          >
            {!call ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <MonitorIcon className="size-3.5" />
            )}
            Share
          </button>
        ) : (
          <button
            onClick={stopScreenShare}
            className="btn btn-sm btn-warning gap-1.5"
            title="Stop sharing screen"
          >
            <MonitorOffIcon className="size-3.5" />
            Stop Sharing
          </button>
        )}
      </div>

      {sharingError && (
        <div className="text-xs text-error">
          {sharingError}
        </div>
      )}
    </div>
  );
};

export default ScreenRecorder;
