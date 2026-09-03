import React from "react";
import { 
  EventDigestData, 
  UploadedPhoto, 
  LayoutStyle, 
  ColorTheme, 
  PageFormat, 
  EventPlanInput 
} from "../types";
import { MagazineLayout } from "./layouts/MagazineLayout";
import { ExecutiveLayout } from "./layouts/ExecutiveLayout";
import { GalleryLayout } from "./layouts/GalleryLayout";
import { TimelineLayout } from "./layouts/TimelineLayout";
import { PAGE_FORMAT_CONFIGS } from "../utils/themeStyles";

interface LayoutCanvasProps {
  digest: EventDigestData;
  photos: UploadedPhoto[];
  plan: EventPlanInput;
  layoutStyle: LayoutStyle;
  theme: ColorTheme;
  pageFormat: PageFormat;
  isEditable: boolean;
  onUpdateField: (key: keyof EventDigestData, value: any) => void;
}

export const LayoutCanvas: React.FC<LayoutCanvasProps> = ({
  digest,
  photos,
  plan,
  layoutStyle,
  theme,
  pageFormat,
  isEditable,
  onUpdateField,
}) => {
  const formatCfg = PAGE_FORMAT_CONFIGS[pageFormat] || PAGE_FORMAT_CONFIGS["a4-portrait"];

  const renderSelectedLayout = () => {
    switch (layoutStyle) {
      case "executive":
        return (
          <ExecutiveLayout
            digest={digest}
            photos={photos}
            plan={plan}
            theme={theme}
            isEditable={isEditable}
            onUpdateField={onUpdateField}
          />
        );
      case "gallery":
        return (
          <GalleryLayout
            digest={digest}
            photos={photos}
            plan={plan}
            theme={theme}
            isEditable={isEditable}
            onUpdateField={onUpdateField}
          />
        );
      case "chronicle":
        return (
          <TimelineLayout
            digest={digest}
            photos={photos}
            plan={plan}
            theme={theme}
            isEditable={isEditable}
            onUpdateField={onUpdateField}
          />
        );
      case "magazine":
      default:
        return (
          <MagazineLayout
            digest={digest}
            photos={photos}
            plan={plan}
            theme={theme}
            isEditable={isEditable}
            onUpdateField={onUpdateField}
          />
        );
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 sm:p-6 bg-stone-200/60 rounded-2xl overflow-x-auto min-h-[600px]">
      {/* Printable Sheet */}
      <div
        id="printable-digest-canvas"
        className={`w-full ${formatCfg.maxWidth} bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300 relative border border-stone-200/80`}
      >
        {renderSelectedLayout()}
      </div>
    </div>
  );
};
