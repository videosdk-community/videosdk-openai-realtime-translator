import React, { useMemo } from "react";
import { useMeeting } from "@videosdk.live/react-sdk";
import { MemoizedParticipantGrid } from "../../components/ParticipantGrid";
import PipLayout from "../../components/PipLayout";

function ParticipantsViewer({ isPresenting, sideBarMode }) {
  const {
    participants,
    pinnedParticipants,
    activeSpeakerId,
    localParticipant,
    localScreenShareOn,
    presenterId,
  } = useMeeting();

  const isMobile = window.matchMedia(
    "only screen and (max-width: 768px)"
  ).matches;

  const participantIds = useMemo(() => {
    const pinnedParticipantId = [...pinnedParticipants.keys()].filter(
      (participantId) => {
        return participantId != localParticipant.id;
      }
    );
    const regularParticipantIds = [...participants.keys()].filter(
      (participantId) => {
        return (
          ![...pinnedParticipants.keys()].includes(participantId) &&
          localParticipant.id != participantId
        );
      }
    );

    const ids = [
      localParticipant.id,
      ...pinnedParticipantId,
      ...regularParticipantIds,
    ].slice(0, isPresenting ? (isMobile ? 2 : 6) : 16);

    if (activeSpeakerId) {
      if (!ids.includes(activeSpeakerId)) {
        ids[ids.length - 1] = activeSpeakerId;
      }
    }
    return ids;
  }, [
    participants,
    activeSpeakerId,
    pinnedParticipants,
    presenterId,
    localScreenShareOn,
  ]);

  if (participantIds.length > 2) {
    return (
      <MemoizedParticipantGrid
        participantIds={participantIds}
        isPresenting={isPresenting}
        sideBarMode={sideBarMode}
      />
    );
  }
  return <PipLayout participantIds={participantIds} />;
}

const MemorizedParticipantView = React.memo(
  ParticipantsViewer,
  (prevProps, nextProps) => {
    return (
      prevProps.sideBarMode === nextProps.sideBarMode &&
      prevProps.isPresenting === nextProps.isPresenting
    );
  }
);

export default MemorizedParticipantView;
