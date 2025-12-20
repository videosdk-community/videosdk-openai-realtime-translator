import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import { useEffect, useRef } from "react";
import { useMeetingAppContext } from "../context/MeetingAppContext";
import useMediaStream from "../hooks/useMediaStream";

const ResolutionListner = () => {
  const mMeeting = useMeeting();

  const {
    selectedWebcam, // Now using the single source of truth for the active webcam
    allowedVirtualBackground,
    useVirtualBackground,
    setWebCamResolution,
    webCamResolution,
  } = useMeetingAppContext();

  const selectedWebcamRef = useRef();
  const webCamResolutionRef = useRef();

  useEffect(() => {
    webCamResolutionRef.current = webCamResolution;
  }, [webCamResolution]);

  useEffect(() => {
    selectedWebcamRef.current = selectedWebcam;
  }, [selectedWebcam]);

  const useVirtualBackgroundRef = useRef();

  useEffect(() => {
    useVirtualBackgroundRef.current = useVirtualBackground;
  }, [useVirtualBackground]);

  const { getVideoTrack } = useMediaStream();

  const { publish } = usePubSub(
    `CHANGE_RESOLUTION_${mMeeting?.localParticipant?.id}`,
    {
      onMessageReceived: async ({ message }) => {
        if (webCamResolutionRef.current === message.resolutionValue) return;
        setWebCamResolution(message.resolutionValue);
        let customTrack;
        const currentWebcam = selectedWebcamRef.current;
        if (!currentWebcam || !currentWebcam.id) {
          console.warn("No valid webcam selected");
          return;
        }
        if (allowedVirtualBackground && useVirtualBackgroundRef.current) {
          customTrack = await getVideoTrack({
            webcamId: currentWebcam.id,
            encoderConfig: message.resolutionValue,
            useVirtualBackground: useVirtualBackground,
          });
        } else {
          await mMeeting?.disableWebcam();
          customTrack = await getVideoTrack({
            webcamId: currentWebcam.id,
            encoderConfig: message.resolutionValue,
          });
        }
        mMeeting.changeWebcam(customTrack);
      },
    }
  );

  useEffect(() => {
    try {
      publish(
        {
          resolution: "sd",
          resolutionValue: "h480p_w640p",
        },
        {
          persist: true,
        }
      );
    } catch (e) {
      console.log("Error in pubsub", e)
    }
  }, []);

  return <></>;
};

export default ResolutionListner;
