import { CameraIcon } from "@heroicons/react/24/solid";
import {
  useParticipant,
  usePubSub,
  VideoPlayer,
} from "@videosdk.live/react-sdk";
import React, { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useMeetingAppContext } from "../context/MeetingAppContext";
import ImageCapturePreviewDialog from "./ImageCapturePreviewDialog";
import * as ReactDOM from "react-dom";
import useIsMobile from "../hooks/useIsMobile";
import useIsTab from "../hooks/useIsTab";
import { useMediaQuery } from "react-responsive";
import useWindowSize from "../hooks/useWindowSize";
import MicOffSmallIcon from "../icons/MicOffSmallIcon";
import SpeakerIcon from "../icons/SpeakerIcon";
import {
  getQualityScore,
  nameTructed,
  participantModes,
} from "../utils/common";
import { Popover, Transition } from "@headlessui/react";
import NetworkIcon from "../icons/NetworkIcon";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { LANGUAGES } from "../utils/languages";
import { useAudioRouting } from "../hooks/useAudioRouting";

export const CornerDisplayName = ({
  participantId,
  isPresenting,
  displayName,
  isLocal,
  micOn,
  screenShareStream,
  isPip,
  isActiveSpeaker,
}) => {
  const isMobile = useIsMobile();
  const isTab = useIsTab();
  const isLGDesktop = useMediaQuery({ minWidth: 1024, maxWidth: 1439 });
  const isXLDesktop = useMediaQuery({ minWidth: 1440 });

  const { height: windowHeight } = useWindowSize();

  const [statsBoxHeightRef, setStatsBoxHeightRef] = useState(null);
  const [statsBoxWidthRef, setStatsBoxWidthRef] = useState(null);

  const [coords, setCoords] = useState({}); // takes current button coordinates

  const statsBoxHeight = useMemo(
    () => statsBoxHeightRef?.offsetHeight,
    [statsBoxHeightRef]
  );

  const statsBoxWidth = useMemo(
    () => statsBoxWidthRef?.offsetWidth,
    [statsBoxWidthRef]
  );

  const analyzerSize = isXLDesktop
    ? 32
    : isLGDesktop
      ? 28
      : isTab
        ? 24
        : isMobile
          ? 20
          : 18;

  const {
    webcamStream,
    micStream,
    getVideoStats,
    getAudioStats,
    metaData,
    getShareStats,
  } = useParticipant(participantId);

  const statsIntervalIdRef = useRef();
  const [score, setScore] = useState({});
  const [audioStats, setAudioStats] = useState({});
  const [videoStats, setVideoStats] = useState({});

  const updateStats = async () => {
    let stats = [];
    let audioStats = [];
    let videoStats = [];
    if (isPresenting) {
      stats = await getShareStats();
    } else if (webcamStream) {
      stats = await getVideoStats();
    } else if (micStream) {
      stats = await getAudioStats();
    }

    if (webcamStream || micStream || isPresenting) {
      videoStats = isPresenting ? await getShareStats() : await getVideoStats();
      audioStats = isPresenting ? [] : await getAudioStats();
    }

    let score = stats
      ? stats.length > 0
        ? getQualityScore(stats[0])
        : 100
      : 100;

    setScore(score);
    setAudioStats(audioStats);
    setVideoStats(videoStats);
  };

  const qualityStateArray = [
    { label: "", audio: "Audio", video: "Video" },
    {
      label: "Latency",
      audio:
        audioStats && audioStats[0]?.rtt ? `${audioStats[0]?.rtt} ms` : "-",
      video:
        videoStats && videoStats[0]?.rtt ? `${videoStats[0]?.rtt} ms` : "-",
    },
    {
      label: "Jitter",
      audio:
        audioStats && audioStats[0]?.jitter
          ? `${parseFloat(audioStats[0]?.jitter).toFixed(2)} ms`
          : "-",
      video:
        videoStats && videoStats[0]?.jitter
          ? `${parseFloat(videoStats[0]?.jitter).toFixed(2)} ms`
          : "-",
    },
    {
      label: "Packet Loss",
      audio: audioStats
        ? audioStats[0]?.packetsLost
          ? `${parseFloat(
            (audioStats[0]?.packetsLost * 100) / audioStats[0]?.totalPackets
          ).toFixed(2)}%`
          : "-"
        : "-",
      video: videoStats
        ? videoStats[0]?.packetsLost
          ? `${parseFloat(
            (videoStats[0]?.packetsLost * 100) / videoStats[0]?.totalPackets
          ).toFixed(2)}%`
          : "-"
        : "-",
    },
    {
      label: "Bitrate",
      audio:
        audioStats && audioStats[0]?.bitrate
          ? `${parseFloat(audioStats[0]?.bitrate).toFixed(2)} kb/s`
          : "-",
      video:
        videoStats && videoStats[0]?.bitrate
          ? `${parseFloat(videoStats[0]?.bitrate).toFixed(2)} kb/s`
          : "-",
    },
    {
      label: "Frame rate",
      audio: "-",
      video:
        videoStats &&
          (videoStats[0]?.size?.framerate === null ||
            videoStats[0]?.size?.framerate === undefined)
          ? "-"
          : `${videoStats ? videoStats[0]?.size?.framerate : "-"}`,
    },
    {
      label: "Resolution",
      audio: "-",
      video: videoStats
        ? videoStats && videoStats[0]?.size?.width === null
          ? "-"
          : `${videoStats[0]?.size?.width}x${videoStats[0]?.size?.height}`
        : "-",
    },
    {
      label: "Codec",
      audio: audioStats && audioStats[0]?.codec ? audioStats[0]?.codec : "-",
      video: videoStats && videoStats[0]?.codec ? videoStats[0]?.codec : "-",
    },
    {
      label: "Cur. Layers",
      audio: "-",
      video:
        videoStats && !isLocal
          ? videoStats && videoStats[0]?.currentSpatialLayer === null
            ? "-"
            : `S:${videoStats[0]?.currentSpatialLayer || 0} T:${videoStats[0]?.currentTemporalLayer || 0
            }`
          : "-",
    },
    {
      label: "Pref. Layers",
      audio: "-",
      video:
        videoStats && !isLocal
          ? videoStats && videoStats[0]?.preferredSpatialLayer === null
            ? "-"
            : `S:${videoStats[0]?.preferredSpatialLayer || 0} T:${videoStats[0]?.preferredTemporalLayer || 0
            }`
          : "-",
    },
  ];

  useEffect(() => {
    if (webcamStream || micStream) {
      updateStats();

      if (statsIntervalIdRef.current) {
        clearInterval(statsIntervalIdRef.current);
      }

      statsIntervalIdRef.current = setInterval(updateStats, 500);
    } else {
      if (statsIntervalIdRef.current) {
        clearInterval(statsIntervalIdRef.current);
        statsIntervalIdRef.current = null;
      }
    }

    return () => {
      if (statsIntervalIdRef.current) clearInterval(statsIntervalIdRef.current);
    };
  }, [webcamStream, micStream]);

  return (
    <>
      <div
        className={`absolute bottom-2 left-2 rounded-md flex items-center justify-center ${isPip ? "p-1" : "p-2"
          }`}
        style={{
          backgroundColor: "#00000066",
          transition: "all 200ms",
          transitionTimingFunction: "linear",
        }}
      >
        {!micOn && !isPresenting ? (
          <div
            style={{
              padding: isMobile ? 2 : isTab ? 3 : 1,
              backgroundColor: "#D32F2Fcc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 24,
              marginRight: 6,
            }}
          >
            <MicOffSmallIcon fillcolor="white" />
          </div>
        ) : micOn && isActiveSpeaker ? (
          <div
            style={{
              padding: isMobile ? 2 : isTab ? 3 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 24,
              marginRight: 6,
            }}
          >
            <SpeakerIcon />
          </div>
        ) : null}
        <p className="text-sm text-white">
          {isPresenting
            ? isLocal
              ? `You are presenting`
              : `${nameTructed(displayName, 15)} is presenting`
            : isLocal
              ? `You${metaData?.language
                ? ` (${LANGUAGES.find((lang) => lang.code === metaData?.language)
                  ?.name
                })`
                : ""
              }`
              : `${nameTructed(displayName, 26)}${metaData?.language
                ? ` (${LANGUAGES.find((lang) => lang.code === metaData?.language)
                  ?.name
                })`
                : ""
              }`}
        </p>
      </div>

      {(webcamStream || micStream || screenShareStream) && (
        <div>
          <div
            style={{
              position: "absolute",
              top: isMobile ? 4 : isTab ? 8 : 12,
              right: isMobile ? 4 : isTab ? 8 : 12,
            }}
          >
            <Popover className="relative ">
              {({ close }) => (
                <>
                  <Popover.Button
                    className={`absolute right-0 top-0 rounded-md flex items-center justify-center ${isPip ? "p-1" : "p-1.5"
                      } cursor-pointer`}
                    style={{
                      backgroundColor:
                        score > 7
                          ? "#3BA55D"
                          : score > 4
                            ? "#faa713"
                            : "#FF5D5D",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.target.getBoundingClientRect();
                      setCoords({
                        left: Math.round(rect.x + rect.width / 2),
                        top: Math.round(rect.y + window.scrollY),
                      });
                    }}
                  >
                    <div>
                      <NetworkIcon
                        color1={"#ffffff"}
                        color2={"#ffffff"}
                        color3={"#ffffff"}
                        color4={"#ffffff"}
                        style={{
                          height:
                            analyzerSize * (isPip && !isMobile ? 0.4 : 0.6),
                          width:
                            analyzerSize * (isPip && !isMobile ? 0.4 : 0.6),
                        }}
                      />
                    </div>
                  </Popover.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="opacity-0 translate-y-1"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 translate-y-1"
                  >
                    <Popover.Panel
                      style={{ zIndex: 999 }}
                      className="absolute  "
                    >
                      {ReactDOM.createPortal(
                        <div
                          ref={setStatsBoxWidthRef}
                          style={{
                            top:
                              coords?.top + statsBoxHeight > windowHeight
                                ? windowHeight - statsBoxHeight - 20
                                : coords?.top,
                            left:
                              coords?.left - statsBoxWidth < 0
                                ? 12
                                : coords?.left - statsBoxWidth,
                          }}
                          className={`absolute`}
                        >
                          <div
                            ref={setStatsBoxHeightRef}
                            className="bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 "
                          >
                            <div
                              className={`p-[9px] flex items-center justify-between rounded-t-lg`}
                              style={{
                                backgroundColor:
                                  score > 7
                                    ? "#3BA55D"
                                    : score > 4
                                      ? "#faa713"
                                      : "#FF5D5D",
                              }}
                            >
                              <p className="text-sm text-white font-semibold">{`Quality Score : ${score > 7
                                ? "Good"
                                : score > 4
                                  ? "Average"
                                  : "Poor"
                                }`}</p>

                              <button
                                className="cursor-pointer text-white hover:bg-[#ffffff33] rounded-full px-1 text-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  close();
                                }}
                              >
                                <XMarkIcon
                                  className="text-white"
                                  style={{ height: 16, width: 16 }}
                                />
                              </button>
                            </div>
                            <div className="flex">
                              <div className="flex flex-col">
                                {qualityStateArray.map((item, index) => {
                                  return (
                                    <div
                                      key={index}
                                      className="flex"
                                      style={{
                                        borderBottom:
                                          index === qualityStateArray.length - 1
                                            ? ""
                                            : `1px solid #ffffff33`,
                                      }}
                                    >
                                      <div className="flex flex-1 items-center w-[120px]">
                                        {index !== 0 && (
                                          <p className="text-xs text-white my-[6px] ml-2">
                                            {item.label}
                                          </p>
                                        )}
                                      </div>
                                      <div
                                        className="flex flex-1 items-center justify-center"
                                        style={{
                                          borderLeft: `1px solid #ffffff33`,
                                        }}
                                      >
                                        <p className="text-xs text-white my-[6px] w-[80px] text-center">
                                          {item.audio}
                                        </p>
                                      </div>
                                      <div
                                        className="flex flex-1 items-center justify-center"
                                        style={{
                                          borderLeft: `1px solid #ffffff33`,
                                        }}
                                      >
                                        <p className="text-xs text-white my-[6px] w-[80px] text-center">
                                          {item.video}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>,
                        document.body
                      )}
                    </Popover.Panel>
                  </Transition>
                </>
              )}
            </Popover>
          </div>
        </div>
      )}
    </>
  );
};

function ParticipantView({
  participantId,
  showImageCapture,
  showResolution,
  isPip,
}) {
  const {
    displayName,
    webcamStream,
    micStream,
    webcamOn,
    micOn,
    isLocal,
    mode,
    isActiveSpeaker,
    metaData,
  } = useParticipant(participantId);

  const isMobile = useIsMobile();

  const { participantMode, cameraFacingMode, setCameraFacingMode } =
    useMeetingAppContext();

  const isAgent =
    !!participantMode && participantMode !== participantModes.CLIENT;

  const [participantResolution, setParticipantResolution] = useState("sd");

  const { publish } = usePubSub(`CHANGE_RESOLUTION_${participantId}`, {
    onMessageReceived: async ({ message }) => {
      setParticipantResolution({
        res: message.resolution,
      });
    },
    onOldMessagesReceived: async (messages) => {
      const newResolution = messages.map(({ message }) => {
        return { ...message };
      });
      newResolution.forEach((res) => {
        if (res.resolution) {
          setParticipantResolution({
            res: res.resolution,
          });
        }
      });
    },
  });

  const { publish: switchCameraPublish } = usePubSub(
    `SWITCH_PARTICIPANT_CAMERA_${participantId}`,
    {
      onMessageReceived: async ({ message }) => {
        setCameraFacingMode({
          facingMode: message.facingMode,
        });
      },
    }
  );

  const { publish: imageCaptureUpload } = usePubSub(
    `IMAGE_CAPTURE_${participantId}`,
    {
      onMessageReceived: ({ message }) => {
        if (message.showImagePreviewDialog && isAgent) {
          setShowImagePreview(true);
        }
      },
    }
  );

  const [traslatorState, setTraslatorState] = useState(null);
  usePubSub(`STATE_CHANGE`, {
    onMessageReceived: ({ payload }) => {
      setTraslatorState(payload.state);
    },
  });

  const { maintainLandscapeVideoAspectRatio, muteSpeaker, selectedSpeaker } =
    useMeetingAppContext();

  // Determine if this participant is the AI Translator Agent
  // The Python bot sets meta_data={"translator": True}
  const isRemoteAgent = useMemo(() => {
    return metaData?.translator === true || metaData?.translator === "true";
  }, [metaData]);

  // Hook for selective audio routing
  const { isAudioAllowed } = useAudioRouting(participantId, isRemoteAgent);

  const micRef = useRef(null);
  const webcamRef = useRef(null);
  const [mouseOver, setMouseOver] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  useEffect(() => {
    if (micRef.current) {
      if (micOn && micStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(micStream.track);
        micRef.current.srcObject = mediaStream;
        try {
          micRef.current.setSinkId(selectedSpeaker?.id);
        } catch (error) {
          console.log("error", error);
        }
        micRef.current
          .play()
          .catch((error) =>
            console.error("videoElem.current.play() failed", error)
          );
      } else {
        micRef.current.srcObject = null;
      }
    }
  }, [micStream, micOn, muteSpeaker, selectedSpeaker]);

  // Calculate mute state
  // Mute if:
  // 1. It's the local participant (always)
  // 2. Global speaker is OFF (!muteSpeaker)
  // 3. It's the Agent AND audio is NOT allowed for me
  const shouldMute = isLocal || !muteSpeaker || (isRemoteAgent && !isAudioAllowed);

  return mode === "SEND_AND_RECV" ? (
    <div
      key={`participant-${participantId}`}
      onMouseEnter={() => {
        setMouseOver(true);
      }}
      onMouseLeave={() => {
        setMouseOver(false);
      }}
      className={`h-full w-full  bg-gray-750 relative overflow-hidden rounded-lg ${maintainLandscapeVideoAspectRatio ? "video-contain" : "video-cover"
        }`}
    >
      <audio id="audio" ref={micRef} autoPlay muted={shouldMute} />
      {webcamOn ? (
        <VideoPlayer
          participantId={participantId} // Required
          type="video" // "video" or "share"
          containerStyle={{
            height: "100%",
            width: "100%",
          }}
          className="h-full"
          classNameVideo="h-full"
          videoStyle={{}}
        />
      ) : (
        <div className="h-full w-full flex flex-col space-y-2 items-center justify-center">
          <div
            className={`z-10 flex items-center justify-center rounded-full bg-gray-800 2xl:h-[92px] h-[52px] 2xl:w-[92px] w-[52px]`}
          >
            <p className="text-2xl text-white">
              {String(displayName).charAt(0).toUpperCase()}
            </p>
          </div>

          {/* Translator State Indicator */}
          {metaData?.translator && (
            <div className="bg-slate-800 text-white text-sm px-2 py-1 rounded-full font-medium">
              {traslatorState || "IDLE"}
            </div>
          )}
        </div>
      )}

      {!isLocal && isAgent && (
        <div
          className={`absolute ${isPip
            ? "top-0 md:top-2 left-7 md:left-10"
            : `top-1 md:top-3 ${isMobile ? "left-14" : "left-10"} md:left-14`
            }`}
        >
          <div>
            {[
              { value: "front", label: "FRONT", res: "h480p_w640p" },
              { value: "back", label: "BACK", res: "h720p_w1280p" },
            ].map(({ value, label, res }) =>
              label === "FRONT" || label === "BACK" ? (
                <button
                  className={`inline-flex items-center justify-center ${isPip ? "px-2 py-0.5" : "px-3 py-1"
                    } border ${cameraFacingMode?.facingMode === value
                      ? "bg-purple-350 border-purple-350"
                      : "border-gray-100"
                    }  ${isPip ? "text-xs" : "text-sm"
                    } font-medium rounded-sm text-white bg-gray-750`}
                  onClick={async (e) => {
                    try {
                      switchCameraPublish(
                        {
                          facingMode: value,
                          isChangeWebcam: true,
                        },
                        {
                          persist: true,
                        }
                      );
                    } catch (e) {
                      console.log("Error in pubsub", e);
                    }
                    e.stopPropagation();
                  }}
                >
                  {label}
                </button>
              ) : null
            )}
          </div>
        </div>
      )}

      {webcamOn && showResolution && (
        <div
          className={`absolute ${isPip
            ? "top-0 md:top-2 right-7 md:right-10"
            : "top-1 md:top-3 right-10 md:right-14"
            }`}
        >
          <div>
            {[
              { value: "sd", label: "SD", res: "h480p_w640p" },
              { value: "hd", label: "HD", res: "h720p_w1280p" },
            ].map(({ value, label, res }) =>
              label === "SD" || label === "HD" ? (
                <button
                  key={label}
                  className={`inline-flex items-center justify-center ${isPip ? "px-2 py-0.5" : "px-3 py-1"
                    } border ${participantResolution?.res === value
                      ? "bg-purple-350 border-purple-350"
                      : "border-gray-100"
                    }  ${isPip ? "text-xs" : "text-sm"
                    } font-medium rounded-sm text-white bg-gray-750`}
                  onClick={async (e) => {
                    try {
                      publish(
                        {
                          resolution: value,
                          resolutionValue: res,
                        },
                        {
                          persist: true,
                        }
                      );
                    } catch (e) {
                      console.log("Error in pubsub", e);
                    }
                    e.stopPropagation();
                  }}
                >
                  {label}
                </button>
              ) : null
            )}
          </div>
        </div>
      )}
      {showImageCapture && !isLocal && (
        <div
          className={`absolute ${isMobile ? "top-1" : "top-2"
            } left-2 rounded-md flex items-center justify-center p-2 cursor-pointer`}
          style={{
            backgroundColor: "#00000066",
          }}
          onClick={() => {
            imageCaptureUpload(
              { showImagePreviewDialog: true },
              { persist: true }
            );
          }}
        >
          <CameraIcon className="w-6 h-6 text-white" />
        </div>
      )}
      {showImagePreview && !isLocal && (
        <ImageCapturePreviewDialog
          open={showImagePreview}
          setOpen={setShowImagePreview}
        />
      )}
      <CornerDisplayName
        {...{
          isLocal,
          displayName,
          micOn,
          webcamOn,
          isPresenting: false,
          participantId,
          mouseOver,
          isPip,
          isActiveSpeaker,
        }}
      />
    </div>
  ) : (
    <></>
  );
}

export const MemoizedParticipant = React.memo(
  ParticipantView,
  (prevProps, nextProps) => {
    return (
      prevProps.participantId === nextProps.participantId &&
      prevProps.showImageCapture === nextProps.showImageCapture &&
      prevProps.isPip === nextProps.isPip
    );
  }
);
