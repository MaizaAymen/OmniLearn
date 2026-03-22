import { useEffect, useState } from "react";
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";

// Stream.io configuration
// TODO: Move these to environment variables for production
const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY || "gdcvwxqyw72u";

/**
 * StreamVideoProvider wraps components with Stream.io video functionality
 *
 * To use this:
 * 1. Sign up at https://getstream.io/
 * 2. Create a new app
 * 3. Get your API key
 * 4. Generate a user token from the dashboard
 * 5. Add to .env file:
 *    VITE_STREAM_API_KEY=your_api_key
 *    VITE_STREAM_USER_TOKEN=your_user_token
 */
export const StreamVideoProvider = ({ children, userId, userName }) => {
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);

  useEffect(() => {
    // Get user token from environment or generate a placeholder
    const token = import.meta.env.VITE_STREAM_USER_TOKEN;

    if (!token) {
      console.warn(
        "Stream.io token not configured. Screen sharing will not work. " +
        "Please set VITE_STREAM_API_KEY and VITE_STREAM_USER_TOKEN in your .env file."
      );
      return;
    }

    const user = {
      id: userId || "user-" + Math.random().toString(36).substring(7),
      name: userName || "Anonymous User",
      image: `https://getstream.io/random_svg/?id=${userId}&name=${userName}`,
    };

    // Initialize Stream Video Client
    const videoClient = new StreamVideoClient({
      apiKey: STREAM_API_KEY,
      user,
      token,
    });

    // Create a call (one per problem solving session)
    const callId = `problem-session-${Date.now()}`;
    const videoCall = videoClient.call("default", callId);

    // Join the call
    videoCall.join({ create: true }).catch((err) => {
      console.error("Failed to join call:", err);
    });

    setClient(videoClient);
    setCall(videoCall);

    // Cleanup on unmount
    return () => {
      videoCall
        .leave()
        .catch((err) => console.error("Failed to leave call:", err));
      videoClient.disconnectUser();
    };
  }, [userId, userName]);

  // Don't render children until client is ready (or show without video functionality)
  if (!client || !call) {
    // Return children without video context if not configured
    return <>{children}</>;
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        {children}
      </StreamCall>
    </StreamVideo>
  );
};

export default StreamVideoProvider;
