import { useParams } from "react-router-dom";

const JITSI_DOMAIN = (import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

const MeetingRoom = () => {
  const { roomId } = useParams();
  const src = `https://${JITSI_DOMAIN}/${roomId}#config.prejoinPageEnabled=false&config.requireDisplayName=false&config.skipPrejoin=true&config.startWithAudioMuted=false&interfaceConfig.SHOW_JITSI_WATERMARK=false`;

  return (
    <iframe
      title="Jitsi Meet"
      src={src}
      allow="camera; microphone; fullscreen; display-capture"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: "none", zIndex: 9999 }}
    />
  );
};

export default MeetingRoom;
