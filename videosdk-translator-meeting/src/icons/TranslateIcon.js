import React from "react";

const TranslateIcon = ({ style, fillcolor, ...props }) => {
  console.log(props);
  return (
    <svg
      className="MuiSvgIcon-root "
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 256 256"
      {...props}
    >
      <path
        fill={fillcolor || "#fff"}
        strokeMiterlimit={10}
        d="M6 3C4.3 3 3 4.3 3 6v20c0 1.7 1.3 3 3 3h.063l4.406-5.281.312-.375c-.304.117-.508.199-.562.218l-.625-1.906c.054-.02 2.8-.957 5.469-2.843-2.56-2.325-3.856-4.692-3.938-4.844l1.75-.938c.02.035 1.293 2.313 3.781 4.5 1.61-1.453 2.969-3.3 3.282-5.531H8v-2h8V8h2v2h7v2h-3.063c-.296 2.79-1.804 5.035-3.656 6.781.75.52 1.567.996 2.469 1.407A4.975 4.975 0 0 1 24 19h5V6c0-1.7-1.3-3-3-3zm10.688 17.125c-1.442 1.078-2.938 1.875-4.125 2.438l.968 1.156L17.937 29H19v-5c0-.785.188-1.531.5-2.188a18.357 18.357 0 0 1-2.813-1.687zM24 21c-1.7 0-3 1.3-3 3v8.063l5.281 4.406L28.125 38l-1.844 1.531L21 43.938V44c0 1.7 1.3 3 3 3h20c1.7 0 3-1.3 3-3V24c0-1.7-1.3-3-3-3zm-12 4-5 6h3v4h4v-4h3zm21 1.406h2.094l5.218 13.782h-2.5L36.688 37h-5.282l-1.093 3.188h-2.5zm1 3-2 5.688h4zM19 33v3h-9l4 4h5v3l6-5z"
        fontFamily="none"
        fontSize="none"
        fontWeight="none"
        style={{
          mixBlendMode: "normal",
        }}
        textAnchor="none"
        transform="scale(5.12)"
      />
    </svg>
  );
};

export default TranslateIcon;
