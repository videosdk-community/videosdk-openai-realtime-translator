import React, { useState, useRef } from "react";
import Lottie from "lottie-react";
import { createPopper } from "@popperjs/core";

const OutlineIconTextButton = ({
  onClick,
  isFocused,
  bgColor,
  focusBGColor,
  disabled,
  renderRightComponent,
  lottieOption,
  tooltipTitle,
  btnID,
  buttonText,
  large,
  textColor,
}) => {
  const [mouseOver, setMouseOver] = useState(false);
  const [tooltipShow, setTooltipShow] = useState(false);

  const btnRef = useRef();
  const tooltipRef = useRef();

  const openTooltip = () => {
    createPopper(btnRef.current, tooltipRef.current, {
      placement: "top",
    });
    setTooltipShow(true);
  };
  const closeTooltip = () => {
    setTooltipShow(false);
  };

  const iconSize = 22 * (large ? 1 : 1);

  return (
    <>
      <div ref={btnRef} onMouseEnter={openTooltip} onMouseLeave={closeTooltip}>
        <button
          className={`flex items-center justify-center  rounded-lg ${
            bgColor ? `${bgColor}` : isFocused ? "bg-white" : "bg-gray-750"
          } ${
            mouseOver
              ? "border-2 border-transparent border-solid"
              : focusBGColor
              ? `border-2 border-[${focusBGColor}] border-solid`
              : bgColor
              ? "border-2 border-transparent border-solid"
              : "border-2 border-solid border-[#ffffff33]"
          } md:m-2 m-1 cursor-pointer`}
          id={btnID}
          onMouseEnter={() => {
            setMouseOver(true);
          }}
          onMouseLeave={() => {
            setMouseOver(false);
          }}
          disabled={disabled}
          onClick={onClick}
        >
          <div className="flex items-center justify-center p-1 m-1 rounded-lg overflow-hidden">
            {buttonText ? (
              lottieOption ? (
                <div className="flex items-center justify-center">
                  <div
                    className={`lg:h-[${22 * (large ? 1 : 1)}px] w-[${
                      (22 * (large ? 1 : 1) * lottieOption?.width) /
                      lottieOption?.height
                    }px]`}
                    style={{
                      height: iconSize,
                      width:
                        (iconSize * lottieOption?.width) / lottieOption?.height,
                    }}
                  >
                    <Lottie
                      loop={lottieOption.loop}
                      autoPlay={lottieOption.autoPlay}
                      animationData={lottieOption.animationData}
                      rendererSettings={{
                        preserveAspectRatio:
                          lottieOption.rendererSettings.preserveAspectRatio,
                      }}
                      isClickToPauseDisabled
                    />
                  </div>
                </div>
              ) : (
                <p
                  className={`text-sm font-semibold leading-6 ${
                    isFocused
                      ? "text-[#1c1f2e]"
                      : textColor
                      ? textColor
                      : disabled
                      ? "text-gray-500"
                      : "text-white"
                  }`}
                >
                  {buttonText}
                </p>
              )
            ) : null}
          </div>

          {typeof renderRightComponent === "function" && renderRightComponent()}
        </button>
      </div>
      <div
        style={{ zIndex: 999 }}
        className={`${
          tooltipShow && tooltipTitle ? "" : "hidden"
        } overflow-hidden flex flex-col items-center justify-center pt-1`}
        ref={tooltipRef}
      >
        <div className={"rounded-md p-1.5 bg-black "}>
          <p className="text-base text-white ">{tooltipTitle || ""}</p>
        </div>
      </div>
    </>
  );
};

export default OutlineIconTextButton;
