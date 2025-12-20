import { useMeeting, usePubSub, useFile } from "@videosdk.live/react-sdk";
import { useEffect } from "react";
import { useMeetingAppContext } from "../context/MeetingAppContext";

const ImageHandler = () => {
  const { token, images, setImages } = useMeetingAppContext();
  const mMeeting = useMeeting();
  const { fetchBase64File } = useFile();

  const fetchAndAddImage = async (fileUrl) => {
    try {
      const base64 = await fetchBase64File({ url: fileUrl, token });

      setImages((prevImages) => {
        // Check if image already exists
        const existingImageIndex = prevImages.findIndex(
          (img) => img.url === fileUrl
        );
        if (existingImageIndex !== -1) {
          // Update existing image
          const newImages = [...prevImages];
          newImages[existingImageIndex] = {
            url: fileUrl,
            base64Data: `data:image/jpeg;base64,${base64}`,
            loading: false,
          };
          return newImages;
        } else {
          // Add new image
          return [
            ...prevImages,
            {
              url: fileUrl,
              base64Data: `data:image/jpeg;base64,${base64}`,
              loading: false,
            },
          ];
        }
      });
    } catch (error) {
      console.error("Error fetching image:", fileUrl, error);
      setImages((prevImages) => {
        // Check if image already exists
        const existingImageIndex = prevImages.findIndex(
          (img) => img.url === fileUrl
        );
        if (existingImageIndex !== -1) {
          // Update existing image with error
          const newImages = [...prevImages];
          newImages[existingImageIndex] = {
            url: fileUrl,
            base64Data: null,
            loading: false,
            error: true,
          };
          return newImages;
        } else {
          // Add new image with error
          return [
            ...prevImages,
            {
              url: fileUrl,
              base64Data: null,
              loading: false,
              error: true,
            },
          ];
        }
      });
    }
  };

  usePubSub("IMAGE_TRANSFER", {
    onMessageReceived: ({ message }) => {
      if (message.url) {
        // Check if image already exists
        if (!images.some((img) => img.url === message.url)) {
          setImages((prevImages) => [
            ...prevImages,
            {
              url: message.url,
              base64Data: null,
              loading: true,
            },
          ]);
          fetchAndAddImage(message.url);
        }
      }
    },
    onOldMessagesReceived(messages) {
      messages.forEach(({ message }) => {
        if (message.url) {
          // Check if image already exists
          if (!images.some((img) => img.url === message.url)) {
            setImages((prevImages) => [
              ...prevImages,
              {
                url: message.url,
                base64Data: null,
                loading: true,
              },
            ]);
            fetchAndAddImage(message.url);
          }
        }
      });
    },
  });

  return null;
};

export default ImageHandler;
