import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import { useMeetingAppContext } from "../context/MeetingAppContext";
import { useEffect, useRef, useState } from "react";
import useMediaStream from "../hooks/useMediaStream";

const SwitchCameraListner = () => {
  const [webcams, setWebcams] = useState([]);
  const webcamsRef = useRef();

  useEffect(() => {
    webcamsRef.current = webcams;
  }, [webcams]);

  const getWebcams = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const webcams = devices.filter(
      (d) =>
        d.kind === "videoinput" &&
        d.deviceId !== "default" &&
        d.deviceId !== "communications"
    );

    webcams && webcams?.length && setWebcams(webcams);
  };

  const mMeeting = useMeeting();

  useEffect(() => {
    getWebcams(mMeeting?.getWebcams);
  }, []);

  const { setSelectedWebcam, selectedWebcam } = useMeetingAppContext();

  const selectedWebcamDeviceRef = useRef();

  useEffect(() => {
    selectedWebcamDeviceRef.current = selectedWebcam;
  }, [selectedWebcam]);

  const { getVideoTrack } = useMediaStream();

  usePubSub(`SWITCH_PARTICIPANT_CAMERA_${mMeeting?.localParticipant?.id}`, {
    onMessageReceived: async ({ message }) => {
      let customTrack;

      const deviceId = webcamsRef.current.find((webcam) =>
        webcam.label.toLowerCase().includes(message.facingMode)
      )?.deviceId;
      const label = webcamsRef.current.find((webcam) =>
        webcam.label.toLowerCase().includes(message.facingMode)
      )?.label;

      setSelectedWebcam({
        id: deviceId,
        label,
      });

      if (message.isChangeWebcam) {
        mMeeting?.disableWebcam();
        customTrack = await getVideoTrack({
          webcamId: deviceId,
        });
        mMeeting.changeWebcam(customTrack);
        return;
      }
    },
  });

  return <></>;
};

export default SwitchCameraListner;
