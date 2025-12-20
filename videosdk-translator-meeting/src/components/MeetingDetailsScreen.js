import { CheckIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { LANGUAGES } from "../utils/languages";

export function MeetingDetailsScreen({
  onClickJoin,
  _handleOnCreateMeeting,
  participantName,
  setParticipantName,
  language,
  setLanguage,
  videoTrack,
  setVideoTrack,
  onClickStartMeeting,
}) {
  const url = new URLSearchParams(window.location.search);
  const MeetingId = url.get("meetingId");
  const mode = url.get("mode");

  const [meetingId, setMeetingId] = useState(MeetingId || "");
  const [meetingIdError, setMeetingIdError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [iscreateMeetingClicked, setIscreateMeetingClicked] = useState(
    MeetingId && mode === "AGENT" ? true : false
  );
  const [isJoinMeetingClicked, setIsJoinMeetingClicked] = useState(
    MeetingId && !mode ? true : false
  );

  return (
    <div
      className={`flex flex-1 flex-col justify-center w-full md:p-[6px] sm:p-1 p-1.5`}
    >
      {iscreateMeetingClicked ? (
        <div className="border border-solid border-gray-400 rounded-xl px-4 py-3  flex items-center justify-center">
          <p className="text-white text-base">
            {`Meeting code : ${meetingId}`}
          </p>
          <button
            className="ml-2"
            onClick={() => {
              navigator.clipboard.writeText(meetingId);
              setIsCopied(true);
              setTimeout(() => {
                setIsCopied(false);
              }, 3000);
            }}
          >
            {isCopied ? (
              <CheckIcon className="h-5 w-5 text-green-550" />
            ) : (
              <ClipboardIcon className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      ) : isJoinMeetingClicked ? (
        <>
          <input
            defaultValue={meetingId}
            onChange={(e) => {
              setMeetingId(e.target.value);
            }}
            placeholder={"Enter meeting Id"}
            className="px-4 py-3 bg-gray-650 rounded-xl text-white w-full text-center"
          />
          {meetingIdError && (
            <p className="text-xs text-red-600">{`Please enter valid meetingId`}</p>
          )}
        </>
      ) : null}

      {(iscreateMeetingClicked || isJoinMeetingClicked) && (
        <>
          <input
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="Enter your name"
            className="px-4 py-3 mt-5 bg-gray-650 rounded-xl text-white w-full text-center"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-4 py-3 mt-5 bg-gray-650 rounded-xl text-white w-full text-center pr-8"
          >
            <option value="" disabled>
              Select your language
            </option>
            {LANGUAGES.slice().sort((a, b) => a.name.localeCompare(b.name)).map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>

          {/* <p className="text-xs text-white mt-1 text-center">
            Your name will help everyone identify you in the meeting.
          </p> */}
          <button
            disabled={participantName.length < 3}
            className={`w-full ${
              participantName.length < 3 ? "bg-gray-650" : "bg-purple-350"
            }  text-white px-2 py-3 rounded-xl mt-5`}
            onClick={(e) => {
              if (iscreateMeetingClicked) {
                if (videoTrack) {
                  videoTrack.stop();
                  setVideoTrack(null);
                }
                onClickStartMeeting();
                toast(`Join screen button clicked`, {
                  position: "bottom-left",
                  autoClose: 4000,
                  hideProgressBar: true,
                  closeButton: false,
                  pauseOnHover: true,
                  draggable: true,
                  progress: undefined,
                  theme: "light",
                });
              } else {
                if (meetingId.match("\\w{4}\\-\\w{4}\\-\\w{4}")) {
                  onClickJoin(meetingId);
                  toast(`Join screen button clicked`, {
                    position: "bottom-left",
                    autoClose: 4000,
                    hideProgressBar: true,
                    closeButton: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                  });
                } else setMeetingIdError(true);
              }
            }}
          >
            {iscreateMeetingClicked ? "Start a meeting" : "Join a meeting"}
          </button>
        </>
      )}

      {!iscreateMeetingClicked && !isJoinMeetingClicked && !MeetingId && (
        <div className="w-full md:mt-0 mt-4 flex flex-col justify-center h-full">
          <button
            className="w-full bg-purple-350 text-white px-2 py-3 rounded-xl"
            onClick={async (e) => {
              const meetingId = await _handleOnCreateMeeting();
              setMeetingId(meetingId);
              setIscreateMeetingClicked(true);
            }}
          >
            Create a meeting
          </button>
          <button
            className="w-full bg-gray-650 text-white px-2 py-3 rounded-xl mt-5"
            onClick={(e) => {
              setIsJoinMeetingClicked(true);
            }}
          >
            Join a meeting
          </button>
        </div>
      )}
    </div>
  );
}
