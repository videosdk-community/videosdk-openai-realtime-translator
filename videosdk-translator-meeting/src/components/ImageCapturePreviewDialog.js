import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { Cropper } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { useFile, useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import { useMeetingAppContext } from "../context/MeetingAppContext";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-toastify";
import useIsMobile from "../hooks/useIsMobile";

const ImageCapturePreviewDialog = ({ open, setOpen }) => {
  const mMeeting = useMeeting();
  const [imageSrc, setImageSrc] = useState(null);
  const { token } = useMeetingAppContext();
  const isMobile = useIsMobile();

  const { fetchBase64File, uploadBase64File } = useFile();
  const { publish: imageUpload } = usePubSub("IMAGE_TRANSFER", {});

  async function fetchFile({ url }) {
    const base64 = await fetchBase64File({ url, token });
    setImageSrc(`data:image/jpeg;base64,${base64}`);
  }

  usePubSub(`IMAGE_TRANSFER`, {
    onMessageReceived: ({ message }) => {
      if (message.senderId !== mMeeting.localParticipant.id) {
        fetchFile({ url: message.fileUrl }); // pass fileUrl to fetch the file
      }
    },
  });
  // end subscribe imageTransfer
  const [cropData, setCropData] = useState("#");
  const [cropper, setCropper] = useState();
  const [cropButtonClicked, setCropButtonClicked] = useState(false);

  const getCropData = () => {
    if (typeof cropper !== "undefined") {
      setCropData(cropper.getCroppedCanvas().toDataURL());
    }
  };

  const getCropperStyles = () => {
    if (isMobile) {
      return {
        // maxHeight: 200,
        height: "auto",
        width: "100%",
        objectFit: "contain",
        marginLeft: 0,
        marginTop: "1rem",
      };
    }
    return {
      // height: "28%",
      width: "38%",
      height: "auto",
      // widht: "auto",
      objectFit: "contain",
      marginLeft: "1rem",
    };
  };
  const handleClose = () => {
    if (isMobile) setOpen(false);
  };
  return (
    <>
      <Transition appear show={open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => {
            handleClose();
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center *:text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  style={{
                    maxHeight: `calc(100vh - 150px)`,
                  }}
                  className={`${
                    isMobile ? "w-11/12" : "w-9/12"
                  } transform relative overflow-y-auto rounded bg-gray-750 p-4 text-left align-middle flex flex-col items-center shadow-xl transition-all`}
                >
                  <Dialog.Title className="text-base font-medium text-white w-full">
                    Preview
                  </Dialog.Title>
                  <div
                    className={`flex ${
                      isMobile ? "flex-col" : "mt-8"
                    } items-center justify-center h-full w-full`}
                  >
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        width={isMobile ? "100%" : "38%"}
                        height={isMobile ? "auto" : "auto"}
                        alt="Image"
                        className={isMobile ? " object-contain" : ""}
                      />
                    ) : (
                      <div
                        width={isMobile ? "100%" : 300}
                        height={isMobile ? "auto" : 300}
                      >
                        <p className="text-white text-center">
                          Loading Image...
                        </p>
                      </div>
                    )}

                    <Cropper
                      style={getCropperStyles()}
                      zoomTo={0.5}
                      initialAspectRatio={1}
                      preview=".img-preview"
                      src={imageSrc}
                      viewMode={1}
                      minCropBoxHeight={10}
                      minCropBoxWidth={10}
                      background={false}
                      responsive={true}
                      autoCropArea={1}
                      checkOrientation={false}
                      onInitialized={(instance) => {
                        setCropper(instance);
                      }}
                      guides={true}
                      crossOrigin="anonymous"
                    />
                  </div>

                  <div className="flex items-end justify-end w-full mt-6">
                    <button
                      className="bg-white text-black px-3 py-2 rounded"
                      onClick={() => {
                        setCropButtonClicked(true);
                        getCropData();
                      }}
                    >
                      Crop Image
                    </button>
                  </div>
                  {cropData && cropButtonClicked && (
                    <div
                      className={`flex flex-col justify-center items-center ${
                        isMobile ? "w-full" : "max-w-[60%]"
                      }`}
                    >
                      <span className="text-white font-semibold">
                        After Crop Image
                      </span>
                      <div
                        className={`${
                          isMobile ? "w-full" : "max-h-[300px]"
                        } mt-3`}
                      >
                        <img
                          className={`object-contain ${
                            isMobile ? "w-full" : "h-[300px]"
                          }`}
                          src={cropData}
                          alt="cropped"
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex w-full justify-end gap-5">
                    <button
                      type="button"
                      className="rounded border border-white bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                      onClick={() => {
                        setOpen(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded border border-white bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                      onClick={async () => {
                        try {
                          // Use cropped image if available, otherwise use original image
                          const imageToUpload = cropButtonClicked
                            ? cropData
                            : imageSrc;

                          // Convert base64 URL to base64 string
                          const base64Data = imageToUpload.split(",")[1];
                          const fileName = `image-${uuidv4()}.jpeg`;

                          // Upload the image
                          const url = await uploadBase64File({
                            base64Data,
                            token,
                            fileName,
                          });

                          toast("Image uploaded successfully.", {
                            autoClose: 2000,
                          });

                          // Publish the uploaded image URL with senderId
                          imageUpload(
                            {
                              url,
                              // senderId: mMeeting.localParticipant.id,
                            },
                            {
                              persist: true,
                            }
                          );

                          setOpen(false);
                        } catch (error) {
                          console.error("Error uploading image:", error);
                          toast.error("Failed to upload image.", {
                            autoClose: 2000,
                          });
                        }
                      }}
                    >
                      Upload
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ImageCapturePreviewDialog;
