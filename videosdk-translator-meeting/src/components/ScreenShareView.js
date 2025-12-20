import {
  createScreenShareVideoTrack,
  useMeeting,
} from "@videosdk.live/react-sdk";
import { useMeetingAppContext } from "../context/MeetingAppContext";
import ScreenShareIcon from "../icons/ScreenShareIcon";
import { participantModes } from "../utils/common";

export function ScreenShareView({ height }) {
  const { toggleScreenShare } = useMeeting();
  const { participantMode } = useMeetingAppContext();
  return (
    <div
      className={` bg-gray-750 rounded m-2 flex items-center justify-center overflow-hidden w-full h-[${height}] `}
    >
      {participantMode === participantModes.AGENT ? (
        <div className="flex flex-col items-center justify-center ">
          <ScreenShareIcon />
          <div className="mt-4">
            <p className="text-white text-base md:text-xl font-semibold text-center">
              Present your screen
            </p>
          </div>
          <div className="mt-8">
            <button
              className="bg-purple-550 text-white px-4 py-2 rounded text-sm text-center font-medium"
              onClick={async (e) => {
                e.stopPropagation();
                let customTrack = await createScreenShareVideoTrack({
                  optimizationMode: "text",
                  encoderConfig: "h720p_15fps",
                });
                toggleScreenShare(customTrack);
              }}
            >
              START PRESENTING
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center ">
          <ScreenShareIcon />
          <div className="mt-4">
            <p className="text-white text-base md:text-xl font-semibold text-center">
              Wait until the presenter shares the screen
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
