import React, { useEffect, useRef, useState } from "react";
import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import { formatAMPM, nameTructed } from "../../utils/helper";

const TranslationMessage = ({ senderId, senderName, originalText, translatedText, timestamp, isLocal }) => {
  return (
    <div
      className={`flex ${isLocal ? "justify-end" : "justify-start"} mt-4`}
      style={{
        maxWidth: "100%",
      }}
    >
      <div
        className={`flex ${isLocal ? "items-end" : "items-start"
          } flex-col py-1 px-2 rounded-md bg-gray-700`}
      >
        <p style={{ color: "#ffffff80" }}>
          {isLocal ? "You" : nameTructed(senderName, 15)}
        </p>
        
        {/* Original Text */}
        <div className="mb-2">
          <p className="text-xs text-gray-400 mb-1">Original:</p>
          <p className="inline-block whitespace-pre-wrap break-words text-white">
            {originalText}
          </p>
        </div>
        
        {/* Translated Text */}
        <div className="mb-1">
          <p className="text-xs text-gray-400 mb-1">Translated:</p>
          <p className="inline-block whitespace-pre-wrap break-words text-blue-300 font-medium">
            {translatedText}
          </p>
        </div>
        
        <div className="mt-1">
          <p className="text-xs italic" style={{ color: "#ffffff80" }}>
            {formatAMPM(new Date(timestamp))}
          </p>
        </div>
      </div>
    </div>
  );
};

const TranslationMessages = ({ listHeight }) => {
  const listRef = useRef();
  const { messages } = usePubSub("TRANSLATION");
  const mMeeting = useMeeting();
  const localParticipantId = mMeeting?.localParticipant?.id;

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return messages ? (
    <div ref={listRef} style={{ overflowY: "scroll", height: listHeight }}>
      <div className="p-4">
        {messages.map((msg, i) => {
          const { senderId, senderName, originalText, translatedText, timestamp } = msg;
          const isLocal = localParticipantId === senderId;
          
          return (
            <TranslationMessage
              key={`translation_item_${i}`}
              senderId={senderId}
              senderName={senderName}
              originalText={originalText}
              translatedText={translatedText}
              timestamp={timestamp}
              isLocal={isLocal}
            />
          );
        })}
      </div>
    </div>
  ) : (
    <div className="p-4 text-center">
      <p className="text-gray-400">No translations yet</p>
      <p className="text-xs text-gray-500 mt-2">
        Start speaking to see translations appear here
      </p>
    </div>
  );
};

export function TranslationPanel({ panelHeight }) {
  const listHeight = panelHeight;

  return (
    <div>
      <TranslationMessages listHeight={listHeight} />
    </div>
  );
}
