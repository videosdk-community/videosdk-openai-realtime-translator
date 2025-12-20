import { createContext, useContext, useEffect, useState } from "react";
import { VirtualBackgroundProcessor } from "@videosdk.live/videosdk-media-processor-web";
import { participantModes } from "../utils/common";
import useIsMobile from "../hooks/useIsMobile";

export const MeetingAppContext = createContext();

export const useMeetingAppContext = () => useContext(MeetingAppContext);

export const MeetingAppProvider = ({
  children,
  initialMicOn,
  initialWebcamOn,
  participantMode,
  initialSpeakerOn,
  token,
  language,
}) => {
  const isMobile = useIsMobile();

  // Sidebar state (remains unchanged)
  const [sideBarMode, setSideBarMode] = useState("TRANSCRIPT");
  const [vadEnabled, setVadEnabled] = useState(false);
  // Audio input state
  const [selectedMicrophone, setSelectedMicroPhone] = useState({
    id: null,
    label: null,
  });
  // Re-added duplicate microphone state for proper mic switching behavior.
  const [selectedMicDevice, setSelectedMicDevice] =
    useState(selectedMicrophone);

  // Consolidated camera state (duplicate camera state removed)
  const [selectedWebcam, setSelectedWebcam] = useState({
    id: null,
    label: null,
  });
  // Note: Removed "selectedWebcamDevice" to prevent camera state inconsistency.

  // Speaker state (remains unchanged)
  const [selectedSpeaker, setSelectedSpeaker] = useState({
    id: null,
    label: null,
  });

  // Permissions (remain unchanged)
  const [isCameraPermissionAllowed, setIsCameraPermissionAllowed] =
    useState(null);
  const [isMicrophonePermissionAllowed, setIsMicrophonePermissionAllowed] =
    useState(null);

  // Raised hands, virtual background, resolution, participant left reason, camera facing mode, and meeting mode (unchanged)
  const [raisedHandsParticipants, setRaisedHandsParticipants] = useState([]);
  const [useVirtualBackground, setUseVirtualBackground] = useState(
    participantMode !== participantModes.CLIENT && !isMobile
  );
  const [webCamResolution, setWebCamResolution] = useState("h480p_w640p");
  const [participantLeftReason, setParticipantLeftReason] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState({
    facingMode: "front",
  });
  const [meetingMode, setMeetingMode] = useState(null);

  // Mute speaker state (remains unchanged)
  const [muteSpeaker, setMuteSpeaker] = useState(false);
  // Output device state (remains unchanged, uses microphone state)
  const [selectedOutputDevice, setSelectedOutputDevice] =
    useState(selectedMicrophone);

  // Images state (remains unchanged)
  const [images, setImages] = useState([]);

  const [customerLanguage, setCustomerLanguage] = useState("");
  const [translatorSessionId, setTranslatorSessionId] = useState(null);
  const [translatorStatus, setTranslatorStatus] = useState("normal"); // normal, starting, started
  const [bottomTranslationVisible, setBottomTranslationVisible] = useState(false);

  const videoProcessor = new VirtualBackgroundProcessor();

  const isAgent =
    !!participantMode && participantMode !== participantModes.CLIENT;

  useEffect(() => {
    setMuteSpeaker(initialSpeakerOn);
  }, [initialSpeakerOn]);

  return (
    <MeetingAppContext.Provider
      value={{
        // Default options (unchanged)
        initialMicOn,
        initialWebcamOn,
        participantMode,
        token,
        language,

        allowedVirtualBackground: false, //isAgent && !isMobile,
        maintainVideoAspectRatio: isAgent,
        maintainLandscapeVideoAspectRatio: true,
        canRemoveOtherParticipant: isAgent,

        // States
        sideBarMode,
        selectedWebcam, // Consolidated active camera state; duplicate removed.
        selectedMicrophone,
        selectedMicDevice, // Re-added duplicate microphone state.
        raisedHandsParticipants,
        useVirtualBackground,
        participantLeftReason,
        meetingMode,
        muteSpeaker,
        selectedOutputDevice,
        webCamResolution,
        cameraFacingMode,
        selectedSpeaker,
        isCameraPermissionAllowed,
        isMicrophonePermissionAllowed,
        images,
        customerLanguage,
        translatorSessionId,
        translatorStatus,
        bottomTranslationVisible,
        vadEnabled,
        // Setters
        setSideBarMode,
        // setSelectedWebcamDevice, // Removed duplicate camera state setter.
        setRaisedHandsParticipants,
        setUseVirtualBackground,
        setParticipantLeftReason,
        setMeetingMode,
        setMuteSpeaker,
        setSelectedOutputDevice,
        setWebCamResolution,
        setCameraFacingMode,
        setSelectedWebcam, // Setter for active camera.
        setSelectedSpeaker,
        setIsCameraPermissionAllowed,
        setIsMicrophonePermissionAllowed,
        setSelectedMicroPhone,
        setSelectedMicDevice, // Setter for duplicate microphone state.
        setImages,
        setCustomerLanguage,
        setTranslatorSessionId,
        setTranslatorStatus,
        setBottomTranslationVisible,
        videoProcessor,
        setVadEnabled,
      }}
    >
      {children}
    </MeetingAppContext.Provider>
  );
};
