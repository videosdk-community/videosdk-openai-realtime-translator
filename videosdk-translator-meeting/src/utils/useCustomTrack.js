import { createMicrophoneAudioTrack } from "@videosdk.live/react-sdk";
import { VideoSDKNoiseSuppressor } from "@videosdk.live/videosdk-media-processor-web";

const useCustomTrack = () => {
  const audioProcessor = new VideoSDKNoiseSuppressor();

  const getCustomAudioTrack = async (
    deviceId = undefined,
    encoderConfig,
    useNoiseSuppression
  ) => {
    try {
      let track;
      track = await createMicrophoneAudioTrack({
        microphoneId: deviceId,
        encoderConfig: encoderConfig,
      }).catch((error) => {
        console.log("Unable to create custom microphone Track", error);
      });

      if (useNoiseSuppression) {
        if (!audioProcessor.ready) {
          await audioProcessor.init();
        }

        try {
          track = await audioProcessor.getNoiseSuppressedAudioStream(track);
        } catch (error) {
          console.log(error);
        }
      }
      return track;
    } catch (error) {
      console.log("Unable to create custom microphone Track", error);
      return null;
    }
  };

  return {
    getCustomAudioTrack,
  };
};

export default useCustomTrack;
