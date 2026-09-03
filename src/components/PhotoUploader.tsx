import React, { useRef, useState } from "react";
import { UploadedPhoto } from "../types";
import { 
  UploadCloud, 
  Trash2, 
  Star, 
  ArrowLeft, 
  ArrowRight, 
  Image as ImageIcon,
  Edit3,
  Check,
  Sparkles
} from "lucide-react";

interface PhotoUploaderProps {
  photos: UploadedPhoto[];
  onPhotosChange: (photos: UploadedPhoto[]) => void;
  onLoadPreset?: () => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onPhotosChange,
  onLoadPreset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    fileArray.forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) return;

        // Compress large image slightly on canvas for snappy preview
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const maxDim = 1600; // ample resolution for crisp A4 print
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.88);

          const newPhoto: UploadedPhoto = {
            id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            dataUrl: compressedDataUrl,
            size: file.size,
            isCover: photos.length === 0, // first photo defaults to cover
            captionTitle: "精采瞬間",
            captionText: file.name.replace(/\.[^/.]+$/, ""),
          };

          onPhotosChange([...photos, newPhoto]);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      // Reset input value so same files can be re-selected if deleted
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    if (updated.length > 0 && !updated.some((p) => p.isCover)) {
      updated[0].isCover = true;
    }
    onPhotosChange(updated);
  };

  const handleSetCover = (id: string) => {
    const updated = photos.map((p) => ({
      ...p,
      isCover: p.id === id,
    }));
    onPhotosChange(updated);
  };

  const handleMove = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;
    const copy = [...photos];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onPhotosChange(copy);
  };

  const startEditCaption = (photo: UploadedPhoto) => {
    setEditingPhotoId(photo.id);
    setEditTitle(photo.captionTitle || "");
    setEditCaption(photo.captionText || "");
  };

  const saveEditCaption = (id: string) => {
    const updated = photos.map((p) =>
      p.id === id
        ? { ...p, captionTitle: editTitle.trim(), captionText: editCaption.trim() }
        : p
    );
    onPhotosChange(updated);
    setEditingPhotoId(null);
  };

  return (
    <div id="photo-uploader-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center font-medium text-sm">
            1
          </div>
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              上傳活動照片 ({photos.length} 張)
            </h2>
            <p className="text-xs text-stone-500">
              支援多選上傳，可自訂封面與排列順序，系統將自動完成排版
            </p>
          </div>
        </div>

        {photos.length > 0 && (
          <button
            type="button"
            onClick={() => onPhotosChange([])}
            className="text-xs text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空所有照片
          </button>
        )}
      </div>

      {/* Drag & Drop Upload Target */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-amber-600 bg-amber-50/50 scale-[1.01]"
            : "border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50/60 shadow-xs"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png, image/jpeg, image/webp, image/heic"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="text-sm text-stone-700 font-medium">
            點擊此處或拖曳照片至此上傳
          </div>
          <div className="text-xs text-stone-600">
            支援 JPG、PNG、WEBP，建議上傳 3 ~ 8 張以獲得最佳排版效果
          </div>
        </div>
      </div>

      {/* Photos Thumbnail Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {photos.map((photo, index) => {
            const isEditing = editingPhotoId === photo.id;
            return (
              <div
                key={photo.id}
                className={`group relative bg-white rounded-lg border overflow-hidden transition-all duration-150 shadow-xs ${
                  photo.isCover
                    ? "border-amber-600 ring-2 ring-amber-600/20"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                {/* Image Preview */}
                <div className="aspect-4/3 w-full bg-stone-100 relative overflow-hidden">
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />

                  {/* Cover Badge */}
                  {photo.isCover && (
                    <span className="absolute top-1.5 left-1.5 bg-amber-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      主視覺封面
                    </span>
                  )}

                  {/* Reorder & Action Controls Overlay */}
                  <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(index, "left");
                        }}
                        title="向左前移"
                        className="p-1.5 rounded-md bg-white/90 text-stone-800 hover:bg-white text-xs cursor-pointer shadow-xs"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!photo.isCover && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetCover(photo.id);
                        }}
                        title="設為封面主視覺"
                        className="p-1.5 rounded-md bg-white/90 text-stone-800 hover:bg-white text-xs cursor-pointer shadow-xs"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditCaption(photo);
                      }}
                      title="編輯圖說"
                      className="p-1.5 rounded-md bg-white/90 text-stone-800 hover:bg-white text-xs cursor-pointer shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {index < photos.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMove(index, "right");
                        }}
                        title="向右後移"
                        className="p-1.5 rounded-md bg-white/90 text-stone-800 hover:bg-white text-xs cursor-pointer shadow-xs"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(photo.id);
                      }}
                      title="刪除照片"
                      className="p-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700 text-xs cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Caption Bar */}
                <div className="p-2 text-left">
                  {isEditing ? (
                    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="分類標籤 (如: 專注投入)"
                        className="w-full text-xs px-1.5 py-1 border border-stone-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder="照片短評 (如: 討論熱烈)"
                        className="w-full text-xs px-1.5 py-1 border border-stone-300 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => saveEditCaption(photo.id)}
                        className="w-full bg-stone-900 text-white text-[11px] py-1 rounded flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        完成修訂
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-semibold text-stone-800 truncate">
                        {photo.captionTitle || `照片 #${index + 1}`}
                      </div>
                      <div className="text-[11px] text-stone-500 truncate mt-0.5">
                        {photo.captionText || photo.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
