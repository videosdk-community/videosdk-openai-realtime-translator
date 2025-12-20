import React from "react";
import { useMediaQuery } from "react-responsive";
import { useMeetingAppContext } from "../context/MeetingAppContext";
import { participantModes } from "../utils/common";
import { MemoizedParticipant } from "./ParticipantView";
import { PromoInfographic } from "./PromoInfographic";

function ParticipantGrid({ participantIds, isPresenting, sideBarMode }) {
  const isMobile = window.matchMedia(
    "only screen and (max-width: 768px)"
  ).matches;

  const gtThanMD = useMediaQuery({ minWidth: 768 });

  const { participantMode } = useMeetingAppContext();

  const perRow =
    isMobile || isPresenting
      ? participantIds.length < 4
        ? 1
        : participantIds.length < 9
        ? 2
        : 3
      : !gtThanMD
      ? participantIds.length < 4
        ? 1
        : participantIds.length < 9
        ? 2
        : 3
      : participantIds.length < 5
      ? 2
      : participantIds.length < 7
      ? 3
      : participantIds.length < 9
      ? 4
      : participantIds.length < 10
      ? 3
      : participantIds.length < 11
      ? 4
      : 4;

  if (
    participantIds.length == 1 &&
    participantMode === participantModes.CLIENT
  ) {
    participantIds.push("NULL");
  }

  return (
    <div
      className={`flex flex-col md:flex-row flex-grow m-3 items-center justify-center ${
        participantIds.length < 2 && !sideBarMode && !isPresenting
          ? "md:px-16 md:py-2"
          : participantIds.length < 3 && !sideBarMode && !isPresenting
          ? "md:px-16 md:py-8"
          : participantIds.length < 4 && !sideBarMode && !isPresenting
          ? "md:px-16 md:py-4"
          : participantIds.length > 4 && !sideBarMode && !isPresenting
          ? "md:px-14"
          : "md:px-0"
      }`}
    >
      <div
        className={`flex ${
          isPresenting && isMobile ? "flex-row" : "flex-col"
        } w-full h-full`}
      >
        {Array.from(
          { length: Math.ceil(participantIds.length / perRow) },
          (_, i) => {
            return (
              <div
                key={`participant-${i}`}
                className={`flex flex-1  ${
                  isPresenting
                    ? participantIds.length === 1
                      ? "justify-start items-start"
                      : "items-center justify-center"
                    : "items-center justify-center"
                }`}
              >
                {participantIds
                  .slice(i * perRow, (i + 1) * perRow)
                  .map((participantId) => {
                    return (
                      <div
                        key={`participant_${participantId}`}
                        className={`flex flex-1  ${
                          isPresenting
                            ? participantIds.length === 1
                              ? "md:h-48 md:w-44 xl:w-52 xl:h-48 "
                              : participantIds.length === 2
                              ? `${
                                  isPresenting && isMobile
                                    ? "w-36 h-full md:w-44 xl:w-56 md:h-full"
                                    : "md:w-44 xl:w-56"
                                } `
                              : participantIds.length === 3
                              ? `${
                                  isPresenting && isMobile
                                    ? "w-36 h-full md:w-44 xl:w-48 md:h-full"
                                    : "md:w-44 xl:w-48"
                                } `
                              : "md:w-44 xl:w-48"
                            : "w-full"
                        } items-center justify-center h-full ${
                          participantIds.length === 1
                            ? "md:max-w-7xl 2xl:max-w-[1480px] "
                            : "md:max-w-lg 2xl:max-w-2xl"
                        } overflow-clip overflow-hidden  p-1`}
                      >
                        {participantId == "NULL" ? (
                          <PromoInfographic />
                        ) : (
                          <MemoizedParticipant
                            participantId={participantId}
                            showImageCapture={
                              participantMode == participantModes.AGENT
                            }
                            showResolution={
                              true //participantMode == participantModes.AGENT
                            }
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

export const MemoizedParticipantGrid = React.memo(
  ParticipantGrid,
  (prevProps, nextProps) => {
    return (
      JSON.stringify(prevProps.participantIds) ===
        JSON.stringify(nextProps.participantIds) &&
      prevProps.isPresenting === nextProps.isPresenting &&
      prevProps.sideBarMode === nextProps.sideBarMode
    );
  }
);
