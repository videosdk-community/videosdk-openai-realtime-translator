import React, { useEffect, useState } from "react";
import { MeetingProvider } from "@videosdk.live/react-sdk";
import { LeaveScreen } from "./components/screens/LeaveScreen";
import { JoiningScreen } from "./components/screens/JoiningScreen";
import { MeetingContainer } from "./meeting/MeetingContainer";
import { MeetingAppProvider } from "./context/MeetingAppContext";
import { getToken } from "./api";

const App = () => {
  const windowurl = new URLSearchParams(window.location.search);
  const MeetingId = windowurl.get("meetingId");
  const [token, setToken] = useState("");
  const [meetingId, setMeetingId] = useState(MeetingId || "");
  const [participantName, setParticipantName] = useState("");
  const [language, setLanguage] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [webcamOn, setWebcamOn] = useState(true);
  const [customAudioStream, setCustomAudioStream] = useState(null);
  const [customVideoStream, setCustomVideoStream] = useState(null);
  const [isMeetingStarted, setMeetingStarted] = useState(false);
  const [isMeetingLeft, setIsMeetingLeft] = useState(false);
  const [speakerOn, setSpekerOn] = useState(true);
  let url = new URL(window.location.href);
  let searchParams = new URLSearchParams(url.search);
  const participantMode = searchParams.get("mode");

  const isMobile = window.matchMedia(
    "only screen and (max-width: 768px)"
  ).matches;

  useEffect(() => {
    if (isMobile) {
      window.onbeforeunload = () => {
        return "Are you sure you want to exit?";
      };
    }
  }, [isMobile]);

  return (
    <>
      <MeetingAppProvider
        initialMicOn={micOn}
        initialWebcamOn={webcamOn}
        initialSpeakerOn={speakerOn}
        participantMode={participantMode}
        token={token}
        language={language}
      >
        {isMeetingStarted ? (
          <MeetingProvider
            config={{
              meetingId: meetingId,
              micEnabled: micOn,
              webcamEnabled: webcamOn,
              name: participantName ? participantName : "TestUser",
              multiStream: false,
              // customCameraVideoTrack: customVideoStream,
              // customMicrophoneAudioTrack: customAudioStream,
              metaData: {
                language: language === "" ? "en-IN" : language,
                participantMode: participantMode,
              },
            }}
            token={token}
            reinitialiseMeetingOnConfigChange={true}
            joinWithoutUserInteraction={true}
          >
            <MeetingContainer
              onMeetingLeave={() => {
                setToken("");
                setMeetingId("");
                setParticipantName("");
                setWebcamOn(false);
                setMicOn(false);
                setSpekerOn(false);
                setMeetingStarted(false);
                setIsMeetingLeft(true);
              }}
            />
          </MeetingProvider>
        ) : isMeetingLeft ? (
          <LeaveScreen setIsMeetingLeft={setIsMeetingLeft} />
        ) : (
          <JoiningScreen
            participantName={participantName}
            setParticipantName={setParticipantName}
            language={language}
            setLanguage={setLanguage}
            setMeetingId={setMeetingId}
            setToken={setToken}
            micEnabled={micOn}
            webcamEnabled={webcamOn}
            speakerEnabled={speakerOn}
            onClickStartMeeting={async () => {
              const token = await getToken();
              setToken(token);
              setMeetingStarted(true);
            }}
            participantMode={participantMode}
            customAudioStream={customAudioStream}
            setCustomAudioStream={setCustomAudioStream}
            customVideoStream={customVideoStream}
            setCustomVideoStream={setCustomVideoStream}
            micOn={micOn}
            setMicOn={setMicOn}
            webcamOn={webcamOn}
            setSpekerOn={setSpekerOn}
            setWebcamOn={setWebcamOn}
          />
        )}
      </MeetingAppProvider>
    </>
  );
};

export default App;
