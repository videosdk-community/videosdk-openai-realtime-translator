import { useState } from "react";
import { useMeetingAppContext } from "../context/MeetingAppContext";
import useDragging from "../hooks/useDraggable";
import { participantModes } from "../utils/common";
import { MemoizedParticipant } from "./ParticipantView";
import { PromoInfographic } from "./PromoInfographic";

function PipLayout({ participantIds }) {
  const [switchParticipants, setSwitchParticipants] = useState(false);
  const { participantMode } = useMeetingAppContext();
  const { ref, x, y, isDragging, wasDragged } = useDragging();

  // if (
  //   participantIds.length == 1 &&
  //   participantMode === participantModes.CLIENT
  // ) {
  //   participantIds.push("NULL");
  // }

  return (
    <div className="flex flex-grow w-full h-full relative p-4 md:px-16 md:py-10 ">
      {participantIds.length > 1 && (
        <div
          // style={{
          //   top: y,
          //   left: x,
          // }}
          ref={ref}
          className={`absolute w-36 h-48 md:w-64 md:h-48 z-10 bottom-0 right-0  m-3 border-2 rounded-lg ${
            isDragging ? "cursor-move border-white" : "border-slate-700"
          }`}
          // onClick={(e) => {
          //   if (!wasDragged) {
          //     setSwitchParticipants(!switchParticipants);
          //     e.preventDefault();
          //   }
          // }}
        >
          {participantIds[switchParticipants ? 1 : 0] == "NULL" ? (
            <PromoInfographic />
          ) : (
            <MemoizedParticipant
              participantId={
                participantIds.length > 1
                  ? participantIds[switchParticipants ? 1 : 0]
                  : participantIds[1]
              }
              key={
                participantIds.length > 1
                  ? participantIds[switchParticipants ? 1 : 0]
                  : participantIds[1]
              }
              isPip={true}
              showImageCapture={participantMode == participantModes.AGENT}
              showResolution={
                true //participantMode == participantModes.AGENT
              }
            />
          )}
        </div>
      )}
      <div className="w-full h-full">
        {participantIds[switchParticipants ? 0 : 1] == "NULL" ? (
          <PromoInfographic />
        ) : (
          <MemoizedParticipant
            participantId={
              participantIds.length > 1
                ? participantIds[switchParticipants ? 0 : 1]
                : participantIds[0]
            }
            key={
              participantIds.length > 1
                ? participantIds[switchParticipants ? 0 : 1]
                : participantIds[0]
            }
            showImageCapture={participantMode == participantModes.AGENT}
            showResolution={
              true //participantMode == participantModes.AGENT
            }
          />
        )}
      </div>
    </div>
  );
}

export default PipLayout;
