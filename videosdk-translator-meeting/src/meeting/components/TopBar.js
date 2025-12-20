import React from "react";

export function TopBar({ bottomBarHeight }) {
  const search = window.location.search;
  const urlParams = new URLSearchParams(search);
  const imageLink = urlParams.get("imageLink");
  return (
    <div
      style={{ height: bottomBarHeight }}
      className="flex lg:px-2 xl:px-6 pb-2 px-2 bg-transparent items-center "
    >
      <img className="mt-6 h-10 md:h-full" src={imageLink} />
    </div>
  );
}
