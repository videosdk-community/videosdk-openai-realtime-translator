import { useMeeting, useParticipant } from "@videosdk.live/react-sdk";
import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useMeetingAppContext } from "../../context/MeetingAppContext";
import MicOffIcon from "../../icons/ParticipantTabPanel/MicOffIcon";
import MicOnIcon from "../../icons/ParticipantTabPanel/MicOnIcon";
import ParticipantRemoveIcon from "../../icons/ParticipantTabPanel/ParticipantRemoveIcon";
import RaiseHand from "../../icons/ParticipantTabPanel/RaiseHand";
import VideoCamOffIcon from "../../icons/ParticipantTabPanel/VideoCamOffIcon";
import VideoCamOnIcon from "../../icons/ParticipantTabPanel/VideoCamOnIcon";
import { meetingLeftReasons } from "../../utils/common";
import { nameTructed, trimSnackBarText } from "../../utils/helper";
import ConfirmBox from "../ConfirmBox";

const ParticipantRemoveButton = ({ setIsParticipantKickoutVisible }) => {
  return (
    <>
      <div>
        {/* {!isLocal && canRemoveOtherParticipant && ( */}
        <button
          className="m-1 p-1"
          onClick={() => {
            setIsParticipantKickoutVisible(true);
          }}
        >
          <ParticipantRemoveIcon />
        </button>
        {/* )} */}
      </div>
    </>
  );
};

function ParticipantListItem({ participantId, raisedHand }) {
  const { participant, micOn, webcamOn, displayName, isLocal } =
    useParticipant(participantId);
  const [isParticipantKickoutVisible, setIsParticipantKickoutVisible] =
    useState(false);
  const { canRemoveOtherParticipant, setParticipantLeftReason } =
    useMeetingAppContext();

  return (
    <div className="mt-2 m-2 p-2 bg-gray-700 rounded-lg mb-0">
      <div className="flex flex-1 items-center justify-center relative">
        <div
          style={{
            color: "#212032",
            backgroundColor: "#757575",
          }}
          className="h-10 w-10 text-lg mt-0 rounded overflow-hidden flex relative items-center justify-center"
        >
          {displayName?.charAt(0).toUpperCase()}
        </div>
        <div className="ml-2 mr-1 flex flex-1">
          <p className="text-base text-white overflow-hidden whitespace-pre-wrap overflow-ellipsis">
            {isLocal ? "You" : nameTructed(displayName, 15)}
          </p>
        </div>
        {raisedHand && (
          <div className="flex items-center justify-center m-1 p-1">
            <RaiseHand fillcolor={"#fff"} />
          </div>
        )}
        <div className="m-1 p-1">{micOn ? <MicOnIcon /> : <MicOffIcon />}</div>
        <div className="m-1 p-1">
          {webcamOn ? <VideoCamOnIcon /> : <VideoCamOffIcon />}
        </div>

        {!isLocal && canRemoveOtherParticipant && (
          <ParticipantRemoveButton
            setIsParticipantKickoutVisible={setIsParticipantKickoutVisible}
          />
        )}
      </div>
      <ConfirmBox
        open={isParticipantKickoutVisible}
        title={`Remove ${nameTructed(displayName, 15)} `}
        subTitle={`Are you sure want to remove ${nameTructed(
          displayName,
          15
        )} from the call?`}
        successText={"Remove"}
        rejectText={"Cancel"}
        onSuccess={() => {
          setParticipantLeftReason(meetingLeftReasons.KICKOUT);
          toast(
            `${trimSnackBarText(
              `${nameTructed(
                participant.displayName,
                15
              )} has been kicked out. `
            )}`,
            {
              position: "bottom-left",
              autoClose: 4000,
              hideProgressBar: true,
              closeButton: false,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
            }
          );
          participant.remove();
          setIsParticipantKickoutVisible(false);
        }}
        onReject={() => {
          setIsParticipantKickoutVisible(false);
        }}
      />
    </div>
  );
}

export function ParticipantPanel({ panelHeight }) {
  const mMeeting = useMeeting();
  const participants = mMeeting.participants;

  const { raisedHandsParticipants } = useMeetingAppContext();

  const sortedRaisedHandsParticipants = useMemo(() => {
    const participantIds = [...participants.keys()];

    const notRaised = participantIds.filter(
      (pID) =>
        raisedHandsParticipants.findIndex(
          ({ participantId: rPID }) => rPID === pID
        ) === -1
    );

    const raisedSorted = raisedHandsParticipants.sort((a, b) => {
      if (a.raisedHandOn > b.raisedHandOn) {
        return -1;
      }
      if (a.raisedHandOn < b.raisedHandOn) {
        return 1;
      }
      return 0;
    });

    const combined = [
      ...raisedSorted.map(({ participantId: p }) => ({
        raisedHand: true,
        participantId: p,
      })),
      ...notRaised.map((p) => ({ raisedHand: false, participantId: p })),
    ];

    return combined;
  }, [raisedHandsParticipants, participants]);

  const filterParticipants = (sortedRaisedHandsParticipants) =>
    sortedRaisedHandsParticipants;

  const part = useMemo(
    () => filterParticipants(sortedRaisedHandsParticipants, participants),

    [sortedRaisedHandsParticipants, participants]
  );

  return (
    <div
      className={`flex w-full flex-col bg-gray-750 overflow-y-auto `}
      style={{ height: panelHeight }}
    >
      <div
        className="flex flex-col flex-1"
        style={{ height: panelHeight - 100 }}
      >
        {[...participants.keys()].map((participantId, index) => {
          const { raisedHand, participantId: peerId } = part[index];
          return (
            <ParticipantListItem
              participantId={participantId}
              raisedHand={raisedHand}
            />
          );
        })}
      </div>
    </div>
  );
}
