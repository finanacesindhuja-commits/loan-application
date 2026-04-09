import React, { useState, useRef, useEffect } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

/* ===== Helper: crop image with rotation ===== */
const getCroppedImage = (image, crop, rotation) => {
  const canvas = document.createElement("canvas");

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const pixelWidth = crop.width * scaleX;
  const pixelHeight = crop.height * scaleY;

  canvas.width = pixelWidth;
  canvas.height = pixelHeight;

  const ctx = canvas.getContext("2d");

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    pixelWidth,
    pixelHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
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

