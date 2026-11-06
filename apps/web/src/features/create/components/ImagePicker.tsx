"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type PreparedImage, prepareImage } from "../lib/image";

export function ImagePicker({
  image,
  onImage,
}: {
  image: PreparedImage | undefined;
  onImage: (image: PreparedImage | undefined) => void;
}) {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2 text-small">
      <span className="text-text-muted">Image</span>
      <div className="flex items-center gap-4">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface">
          {image ? (
            // biome-ignore lint/performance/noImgElement: local blob preview, not an optimisable asset
            <img src={image.url} alt="Market preview" className="size-full object-cover" />
          ) : (
            <span className="text-text-faint">None</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="cursor-pointer text-signal underline-offset-4 hover:underline">
            {busy ? "Processing…" : image ? "Replace image" : "Upload image"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              disabled={busy}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setError(undefined);
                setBusy(true);
                try {
                  if (image) URL.revokeObjectURL(image.url);
                  onImage(await prepareImage(file));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not read the image");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          {image ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                URL.revokeObjectURL(image.url);
                onImage(undefined);
              }}
            >
              Remove
            </Button>
          ) : null}
          <p className="text-text-faint">
            Pinned to IPFS. Resized to 1200 px WebP in your browser.
          </p>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
