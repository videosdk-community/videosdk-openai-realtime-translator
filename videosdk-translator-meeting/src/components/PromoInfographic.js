import ReactPlayer from "react-player";

export function PromoInfographic() {
  return (
    <div
      className={`h-full w-full  bg-gray-750 relative overflow-hidden rounded-lg video-cover`}
    >
      <ReactPlayer
        playsinline // very very imp prop
        playIcon={<></>}
        pip={false}
        light={false}
        controls={false}
        muted={true}
        playing={true}
        url={
          "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        }
        height={"100%"}
        width={"100%"}
        onError={(err) => {
          console.log(err, "participant video error");
        }}
      />
    </div>
  );
}
