"use client";

import { Camera, Plus, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  CameraHud,
  type CapturedFramePayload,
} from "@/components/biometric/camera-hud";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface StagedPhotoItem {
  id: string;
  fileName: string;
  previewUrl: string;
  imageElement: HTMLImageElement;
}

function loadDecodedImage(previewUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Corrupt or unreadable image file."));
    img.src = previewUrl;
  });
}

export function AddPhotosDialog({
  onAddPhotos,
}: {
  onAddPhotos: (photos: StagedPhotoItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingUpload, setProcessingUpload] = useState(false);

  async function handleCameraCapture(frame: CapturedFramePayload) {
    onAddPhotos([
      {
        id: crypto.randomUUID(),
        fileName: frame.fileName,
        previewUrl: frame.previewUrl,
        imageElement: frame.imageElement,
      },
    ]);
    toast.success("Photo added successfully");
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploadError(null);
    setProcessingUpload(true);

    const added: StagedPhotoItem[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const mime = file.type.toLowerCase();
      if (!["image/jpeg", "image/jpg", "image/png"].includes(mime)) {
        errors.push(`${file.name}: only JPG, JPEG, or PNG images are supported.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: exceeds 10 MB limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      try {
        const imageElement = await loadDecodedImage(previewUrl);
        added.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          previewUrl,
          imageElement,
        });
      } catch {
        URL.revokeObjectURL(previewUrl);
        errors.push(`${file.name}: could not decode image.`);
      }
    }

    if (added.length > 0) {
      onAddPhotos(added);
      toast.success(
        added.length === 1
          ? "Photo added successfully"
          : `${added.length} photos added successfully`
      );
    }

    if (errors.length > 0) {
      setUploadError(errors.join(" "));
    }

    setProcessingUpload(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Photo
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Capture or Upload Photos</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="camera" className="mt-3">
          <TabsList>
            <TabsTrigger value="camera">
              <Camera className="h-4 w-4" aria-hidden="true" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera">
            <CameraHud
              title="Classroom Camera Capture"
              statusLabel="Camera ready"
              allowUploadFallback={false}
              onCapture={handleCameraCapture}
            />
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <label
              htmlFor="classroom-multi-upload"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed border-[#B9D0D8]/35 bg-[#060708] p-8 text-center transition-colors duration-200 hover:border-[#B9D0D8]/65 hover:bg-[#141719]"
            >
              <Upload className="h-8 w-8 text-[var(--accent-primary)]" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {processingUpload ? "Processing images..." : "Upload Images (JPG, JPEG, PNG)"}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Select multiple classroom snapshots at once (max 10 MB per file).
                </p>
              </div>
              <input
                id="classroom-multi-upload"
                type="file"
                suppressHydrationWarning
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={handleFileUpload}
                disabled={processingUpload}
                className="visually-hidden"
              />
            </label>

            {uploadError ? (
              <Alert variant="warning" aria-live="polite">
                {uploadError}
              </Alert>
            ) : null}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
