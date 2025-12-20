import {
  useFile,
  useMeeting,
  useParticipant,
  usePubSub,
} from "@videosdk.live/react-sdk";
import { useEffect, useRef } from "react";
import { useMeetingAppContext } from "../context/MeetingAppContext";

const ImageUploadListner = () => {
  const mMeeting = useMeeting();

  const { webcamStream, captureImage } = useParticipant(
    mMeeting?.localParticipant?.id
  );
  const { token } = useMeetingAppContext();
  const { uploadBase64File } = useFile();

  const webcamStreamRef = useRef();

  useEffect(() => {
    webcamStreamRef.current = webcamStream;
  }, [webcamStream]);

  // publish image Transfer
  const { publish: imageUpload } = usePubSub("IMAGE_TRANSFER", {});

  async function uploadImage() {
    const base64Data = await captureImage();

    const fileName = "myCapture.jpeg"; // specify a name for image file with extension
    // upload image to videosdk storage system
    const fileUrl = await uploadBase64File({ base64Data, token, fileName });

    // publish on `IMAGE_TRANSFER` topic
    imageUpload({ fileUrl });
    // }
  }
  // end publish image transfer

  const _handleOnImageCaptureMessageReceived = ({ message }) => {
    try {
      if (message.senderId !== mMeeting?.localParticipant?.id) {
        uploadImage({ senderId: message.senderId });
      }
    } catch (err) {
      console.error("error on image capture", err);
    }
  };

  // subscribe image capture
  usePubSub(`IMAGE_CAPTURE_${mMeeting?.localParticipant?.id}`, {
    onMessageReceived: ({ message }) => {
      _handleOnImageCaptureMessageReceived({ message });
    },
  });
  // end of subscribe image capture

  return <></>;
};

export default ImageUploadListner;
