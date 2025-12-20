import React, { useEffect, useRef, useState } from "react";
import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import { formatAMPM, nameTructed } from "../utils/helper";
import { XMarkIcon } from "@heroicons/react/24/outline";

const TranslationMessage = ({ senderId, senderName, originalText, translatedText, timestamp, isLocal }) => {
  return (
    <div
      className={`flex ${isLocal ? "justify-end" : "justify-start"} mb-3`}
      style={{
        maxWidth: "100%",
      }}
    >
      <div
        className={`flex ${isLocal ? "items-end" : "items-start"
          } flex-col py-2 px-3 rounded-lg bg-gray-700 max-w-xs`}
      >
        <p className="text-xs text-gray-400 mb-1">
          {isLocal ? "You" : nameTructed(senderName, 15)}
        </p>
        
        {/* Original Text */}
        <div className="mb-2 w-full">
          <p className="text-xs text-gray-400 mb-1">Original:</p>
          <p className="text-sm text-white break-words">
            {originalText}
          </p>
        </div>
        
        {/* Translated Text */}
        <div className="mb-1 w-full">
          <p className="text-xs text-gray-400 mb-1">Translated:</p>
          <p className="text-sm text-blue-300 font-medium break-words">
            {translatedText}
          </p>
        </div>
        
        <div className="mt-1">
          <p className="text-xs italic text-gray-500">
            {formatAMPM(new Date(timestamp))}
          </p>
        </div>
      </div>
    </div>
  );
};

const TranslationMessages = ({ maxHeight }) => {
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
    <div 
      ref={listRef} 
      style={{ 
        overflowY: "auto", 
        maxHeight: maxHeight,
        scrollbarWidth: "thin",
        scrollbarColor: "#4B5563 #1F2937"
      }}
      className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
    >
      <div className="p-3">
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
      <p className="text-gray-400 text-sm">No translations yet</p>
      <p className="text-xs text-gray-500 mt-1">
        Start speaking to see translations appear here
      </p>
    </div>
  );
};

export function BottomTranslationPanel({ isVisible, onClose }) {
  const maxHeight = "200px"; // Fixed height for bottom panel

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-600">
        <h3 className="text-white font-semibold text-sm">Live Translation</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* Messages */}
      <TranslationMessages maxHeight={maxHeight} />
    </div>
  );
}
