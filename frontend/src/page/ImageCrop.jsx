import React, { useState, useRef, useEffect } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

/* ===== Helper: crop image with rotation ===== */
const getCroppedImage = (image, crop, rotation) => {
  // 1. Create a canvas for full rotation of the image
  const fullCanvas = document.createElement("canvas");
  const fullCtx = fullCanvas.getContext("2d");

  const angleRad = (rotation * Math.PI) / 180;
  const is90or270 = Math.abs(rotation % 180) === 90;
  
  const originalWidth = image.naturalWidth;
  const originalHeight = image.naturalHeight;

  fullCanvas.width = is90or270 ? originalHeight : originalWidth;
  fullCanvas.height = is90or270 ? originalWidth : originalHeight;

  fullCtx.translate(fullCanvas.width / 2, fullCanvas.height / 2);
  fullCtx.rotate(angleRad);
  fullCtx.drawImage(image, -originalWidth / 2, -originalHeight / 2);

  // 2. Now perform the crop on the fully rotated canvas
  const cropCanvas = document.createElement("canvas");
  const cropCtx = cropCanvas.getContext("2d");

  // Calculate scales based on rotated dimensions
  const scaleX = fullCanvas.width / image.width;
  const scaleY = fullCanvas.height / image.height;

  const pixelWidth = crop.width * scaleX;
  const pixelHeight = crop.height * scaleY;

  // Max dimension threshold for crisp but compressed storage (1200px)
  const MAX_DIMENSION = 1200;
  let targetWidth = pixelWidth;
  let targetHeight = pixelHeight;

  if (pixelWidth > MAX_DIMENSION || pixelHeight > MAX_DIMENSION) {
    if (pixelWidth > pixelHeight) {
      targetWidth = MAX_DIMENSION;
      targetHeight = (pixelHeight * MAX_DIMENSION) / pixelWidth;
    } else {
      targetHeight = MAX_DIMENSION;
      targetWidth = (pixelWidth * MAX_DIMENSION) / pixelHeight;
    }
  }

  cropCanvas.width = targetWidth;
  cropCanvas.height = targetHeight;

  cropCtx.drawImage(
    fullCanvas,
    crop.x * scaleX,
    crop.y * scaleY,
    pixelWidth,
    pixelHeight,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve) => {
    cropCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
  });
};

/* ===== Crop Component ===== */
export default function ImageCrop({ file, onCropComplete, onCancel }) {
  const imgRef = useRef(null);

  const [imageUrl, setImageUrl] = useState("");
  const [rotation, setRotation] = useState(0);

  const [crop, setCrop] = useState({
    unit: "px",
    x: 50,
    y: 50,
    width: 250,
    height: 250,
  });

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = async () => {
    if (!imgRef.current) return alert("Adjust crop first");
    const blob = await getCroppedImage(imgRef.current, crop, rotation);
    onCropComplete(blob);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2">
      <div className="bg-white w-full h-full max-w-md rounded-lg flex flex-col overflow-hidden">

        {/* Crop Area */}
        <div className="flex-1 flex items-center justify-center">
          {imageUrl && (
            <ReactCrop
              crop={crop}
              onChange={setCrop}
              keepSelection
              ruleOfThirds
              minWidth={50}
              minHeight={50}
              className="w-full h-full"
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop"
                className="w-full h-full object-contain"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </ReactCrop>
          )}
        </div>

        {/* Rotate */}
        <div className="flex justify-center gap-4 py-2">
          <button
            onClick={() => setRotation((r) => r - 90)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            ⟲ Rotate
          </button>
          <button
            onClick={() => setRotation((r) => r + 90)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            ⟳ Rotate
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-4 p-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-400 text-white py-3 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium"
          >
            Crop & Save
          </button>
        </div>
      </div>
    </div>
  );
}

