import { usePubSub, useMeeting } from "@videosdk.live/react-sdk";
import { useState, useEffect, useRef } from "react";

export const useAudioRouting = (participantId, isAgent) => {
    const { localParticipant } = useMeeting();
    const [isAudioAllowed, setIsAudioAllowed] = useState(false);
    const audioTimeoutRef = useRef(null);

    usePubSub(`AUDIO_ROUTING`, {
        onMessageReceived: ({ payload }) => {
            // Only process routing if this hook is attached to the Agent
            if (!isAgent) return;

            const { target_users, timestamp } = payload;

            // Check if I am one of the targets
            const amITarget = target_users && localParticipant?.id
                ? target_users.includes(localParticipant.id)
                : false;

            console.log(`[AudioRouting] Event for ${participantId}: Targets=${target_users?.length}, AmITarget=${amITarget}`);

            if (amITarget) {
                setIsAudioAllowed(true);

                // Safety timeout: If we don't get a "clear" event, auto-mute after 15s
                // (Average sentence length is rarely >15s)
                if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
                audioTimeoutRef.current = setTimeout(() => {
                    console.log("[AudioRouting] Auto-muting after timeout");
                    setIsAudioAllowed(false);
                }, 15000);

            } else {
                setIsAudioAllowed(false);
                if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
            }
        },
    });

    return { isAudioAllowed };
};
