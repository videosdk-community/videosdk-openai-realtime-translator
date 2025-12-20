import { usePubSub } from "@videosdk.live/react-sdk";
import { useMeetingAppContext } from "../context/MeetingAppContext";

const ModeListner = () => {
  const { setMeetingMode } = useMeetingAppContext();
  usePubSub(`CHANGE_MODE`, {
    onMessageReceived: ({ message }) => {
      setMeetingMode(message.mode);
    },
    onOldMessagesReceived: (messages) => {
      const latestMessage = messages.sort((a, b) => {
        if (a.timestamp > b.timestamp) {
          return -1;
        }
        if (a.timestamp < b.timestamp) {
          return 1;
        }
        return 0;
      })[0];
      if (latestMessage) {
        setMeetingMode(latestMessage.message.mode);
      }
    },
  });

  return <></>;
};

export default ModeListner;
