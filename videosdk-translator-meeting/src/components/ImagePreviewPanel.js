import { useMeetingAppContext } from "../context/MeetingAppContext";

const ImagePreviewPanel = () => {
  const { images } = useMeetingAppContext();

  return (
    <div className="flex flex-col bg-gray-750 h-full overflow-y-auto">
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between px-4 py-3">
          {/* <h2 className="text-white text-base font-medium">Image Preview Panel</h2> */}
          <p className="text-white text-sm">{images.length} images</p>
        </div>
        <div className="flex-1 mb-4">
          {images.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-white text-sm">No images yet</p>
            </div>
          ) : (
            <div className="space-y-4 p-4 mb-4">
              {images.map(({ url, base64Data, loading, error }, index) => (
                <div key={url} className="relative ">
                  {loading ? (
                    <div className="w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center">
                      <p className="text-white text-sm">Loading...</p>
                    </div>
                  ) : error ? (
                    <div className="w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center">
                      <p className="text-white text-sm">Failed to load image</p>
                    </div>
                  ) : (
                    // <div className="max-h-[300px] flex items-center justify-center object-contain">
                    //   <img
                    //     src={base64Data || url}
                    //     alt={`Uploaded ${index + 1}`}
                    //     className="object-fit rounded-lg h-full"
                    //     onError={(e) => {
                    //       // Fallback to URL if base64 fails
                    //       if (e.target.src !== url) {
                    //         e.target.src = url;
                    //       }
                    //     }}
                    //   />
                    // </div>
                    <div className="max-h-[300px]  flex justify-center mb-4">
                      <img src={base64Data || url} className="max-h-[300px]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewPanel;
