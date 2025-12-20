import React, { useState, useEffect, useRef } from "react";
import { usePubSub } from "@videosdk.live/react-sdk";
import { useMeetingAppContext } from "../context/MeetingAppContext";

const TranscriptPanel = () => {
  const [transcripts, setTranscripts] = useState([]);
  const { localParticipant } = useMeetingAppContext();
  const listRef = useRef();

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcripts]);

  const { publish } = usePubSub("TRANSCRIPT", {
    onOldMessagesReceived: (messages) => {
      const newTranscripts = messages.map(
        ({ message, senderId, senderName, timestamp, payload }) => {
          if (payload) {
            const { peerId, text, timestamps, peerName } = payload;

            return {
              id: `${peerId}-${timestamps || Date.now()}`,
              message: text || "",
              senderId: peerId || senderId,
              senderName: peerName || senderName,
              timestamp: timestamps || timestamp || Date.now(),
              isLocal: (peerId || senderId) === localParticipant?.id,
            };
          } else {
            // Fallback for messages without payload
            return {
              id: `${senderId}-${timestamp || Date.now()}`,
              message,
              senderId,
              senderName,
              timestamp: timestamp || Date.now(),
              isLocal: senderId === localParticipant?.id,
            };
          }
        }
      );

      setTranscripts((prev) => [...prev, ...newTranscripts]);
    },
    onMessageReceived: (data) => {
      const { message, senderId, senderName, timestamp, payload } = data;

      if (payload) {
        const { peerId, text, timestamps, peerName } = payload;

        setTranscripts((prev) => [
          ...prev,
          {
            id: `${peerId}-${timestamps || Date.now()}`,
            message: text || "",
            senderId: peerId || senderId,
            senderName: peerName,
            timestamp: timestamps || timestamp || Date.now(),
            isLocal: (peerId || senderId) === localParticipant?.id,
          },
        ]);
      } else {
        // Fallback for messages without payload
        setTranscripts((prev) => [
          ...prev,
          {
            id: `${senderId}-${timestamp || Date.now()}`,
            message,
            senderId,
            senderName,
            timestamp: timestamp || Date.now(),
            isLocal: senderId === localParticipant?.id,
          },
        ]);
      }
    },
  });

  const formatTime = (timestamp) => {
    // Handle Unix timestamp (seconds) by converting to milliseconds
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col bg-gray-750 h-full overflow-y-auto">
      <div className="flex flex-col flex-1">
        <div
          className="flex-1 mb-4"
          ref={listRef}
          style={{ overflowY: "scroll" }}
        >
          {transcripts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-white text-sm">No transcript messages yet</p>
            </div>
          ) : (
            <div className="space-y-3 p-4 mb-4">
              {transcripts.map(
                ({ id, message, senderName, timestamp, isLocal }) => (
                  <div
                    key={id}
                    className={`flex flex-col ${
                      isLocal ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isLocal
                          ? "bg-purple-350 text-white"
                          : "bg-gray-650 text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">
                          {isLocal ? "You" : senderName}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatTime(timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">{message}</p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptPanel;
