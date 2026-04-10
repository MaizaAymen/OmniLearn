import React, { useMemo, useState, lazy, Suspense } from "react";
import {
  VideoIcon,
  CopyIcon,
  RefreshCwIcon,
  UsersIcon,
  LinkIcon,
  CheckIcon,
  PencilIcon,
  PencilOffIcon,
} from "lucide-react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";

const ExcalidrawPanel = lazy(() =>
  import("@excalidraw/excalidraw").then((mod) => ({
    default: mod.Excalidraw,
  }))
);

const generateRoomName = () =>
  `omni-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const VideoCall = () => {
  const [roomName, setRoomName] = useState(generateRoomName);
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);

  const meetingUrl = useMemo(
    () =>
      `https://meet.jit.si/${roomName}#config.startWithAudioMuted=false&config.prejoinPageEnabled=false&interfaceConfig.SHOW_JITSI_WATERMARK=false`,
    [roomName]
  );

  const handleNewRoom = () => {
    setRoomName(generateRoomName());
    setJoined(false);
    setCopied(false);
    setWhiteboardOpen(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-6">
        <div className="card bg-base-100 border border-base-300 shadow-lg w-full max-w-md">
          <div className="card-body gap-5">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <VideoIcon className="size-7 text-primary" />
              </div>
              <h1 className="text-xl font-bold">Video Conference</h1>
              <p className="text-sm text-base-content/60">
                Start or join a video call with your team
              </p>
            </div>

            {/* Room Info */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-base-content/70 flex items-center gap-1.5">
                <LinkIcon className="size-3.5" />
                Room Name
              </label>
              <div className="flex gap-2">
                <div className="flex-1 font-mono text-xs bg-base-200 rounded-lg px-3 py-2.5 text-base-content/70 truncate border border-base-300">
                  {roomName}
                </div>
                <button
                  className="btn btn-sm btn-outline btn-square"
                  onClick={handleNewRoom}
                  title="Generate new room"
                >
                  <RefreshCwIcon className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Meeting Link */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-base-content/70 flex items-center gap-1.5">
                <UsersIcon className="size-3.5" />
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  className="input input-sm input-bordered flex-1 font-mono text-xs"
                  value={meetingUrl}
                  readOnly
                />
                <button
                  className={`btn btn-sm gap-1.5 ${copied ? "btn-success" : "btn-outline"}`}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    <CopyIcon className="size-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Join Button */}
            <button
              className="btn btn-primary w-full gap-2 mt-2"
              onClick={() => setJoined(true)}
            >
              <VideoIcon className="size-4" />
              Join Room
            </button>

            <p className="text-[11px] text-base-content/40 text-center">
              Powered by Jitsi Meet — no account required
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-base-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-base-100 border-b border-base-300 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <VideoIcon className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">Video Conference</h2>
            <p className="font-mono text-[11px] text-base-content/50">{roomName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Whiteboard Toggle */}
          <button
            className={`btn btn-xs gap-1 ${whiteboardOpen ? "btn-primary" : "btn-outline"}`}
            onClick={() => setWhiteboardOpen((prev) => !prev)}
            title={whiteboardOpen ? "Close Whiteboard" : "Open Whiteboard"}
          >
            {whiteboardOpen ? (
              <PencilOffIcon className="size-3" />
            ) : (
              <PencilIcon className="size-3" />
            )}
            Whiteboard
          </button>

          <button
            className={`btn btn-xs gap-1 ${copied ? "btn-success" : "btn-outline"}`}
            onClick={handleCopy}
          >
            {copied ? (
              <CheckIcon className="size-3" />
            ) : (
              <CopyIcon className="size-3" />
            )}
            {copied ? "Copied" : "Copy Link"}
          </button>

          <button
            className="btn btn-xs btn-outline gap-1"
            onClick={handleNewRoom}
          >
            <RefreshCwIcon className="size-3" />
            New Room
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {whiteboardOpen ? (
          <PanelGroup direction="horizontal" className="h-full">
            {/* Video Panel */}
            <Panel defaultSize={50} minSize={30}>
              <iframe
                title="Jitsi Meet"
                src={meetingUrl}
                allow="camera; microphone; fullscreen; display-capture"
                className="w-full h-full border-0"
              />
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="w-1.5 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />

            {/* Whiteboard Panel */}
            <Panel defaultSize={50} minSize={25}>
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-base-100 border-b border-base-300 shrink-0">
                  <PencilIcon className="size-3.5 text-primary" />
                  <span className="text-xs font-semibold">Whiteboard</span>
                  <span className="text-[10px] text-base-content/40 ml-auto">
                    Powered by Excalidraw
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <Suspense
                    fallback={
                      <div className="h-full flex items-center justify-center bg-base-200">
                        <span className="loading loading-spinner loading-md text-primary" />
                      </div>
                    }
                  >
                    <ExcalidrawPanel
                      theme="light"
                      UIOptions={{
                        canvasActions: {
                          saveToActiveFile: false,
                          loadScene: false,
                          export: false,
                          toggleTheme: true,
                        },
                      }}
                    />
                  </Suspense>
                </div>
              </div>
            </Panel>
          </PanelGroup>
        ) : (
          <iframe
            title="Jitsi Meet"
            src={meetingUrl}
            allow="camera; microphone; fullscreen; display-capture"
            className="w-full h-full border-0"
          />
        )}
      </div>
    </div>
  );
};

export default VideoCall;
