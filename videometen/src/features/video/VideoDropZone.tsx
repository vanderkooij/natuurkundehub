import { useRef, useState, type DragEvent } from "react";
import { FileVideo, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useVideo } from "@/features/video/VideoState";
import { cn } from "@/lib/utils";

const ACCEPT = "video/mp4,video/quicktime,video/webm,video/*";

export function VideoDropZone() {
  const { loadFile } = useVideo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onPick = () => inputRef.current?.click();

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("video/")) return;
    loadFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex flex-1 flex-col items-center justify-center p-8 transition-colors",
        dragging ? "bg-(--accent)/10" : "bg-transparent",
      )}
    >
      <div
        className={cn(
          "flex max-w-md flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-10 py-12 text-center transition-colors",
          dragging ? "border-(--accent) bg-(--bg-card)" : "border-(--border-solid) bg-(--bg-card)",
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--accent)/10 text-(--accent)">
          <FileVideo className="size-7" />
        </div>
        <div>
          <p className="text-base font-semibold text-(--text-primary)">Sleep een video hierheen</p>
          <p className="mt-1 text-sm text-(--text-muted)">of klik om er een te kiezen</p>
        </div>
        <Button variant="default" size="default" onClick={onPick} className="gap-2">
          <Upload className="size-4" />
          Kies video
        </Button>
        <p className="font-mono text-[11px] text-(--text-muted)">
          MP4, MOV, WebM · blijft 100% lokaal in je browser
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
      {/* Lichte hint over film-condities. Bewust zacht (geen icoon/kader);
          uitgebreide help volgt in een latere prompt. */}
      <p className="mt-4 max-w-md text-center text-xs text-(--text-muted) opacity-70">
        <span className="font-semibold">Tip:</span> film met een stilstaande camera (geen pan, zoom
        of trilling) voor de meest precieze metingen.
      </p>
    </div>
  );
}
