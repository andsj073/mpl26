"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";

type PhotoItem = { id: string; url: string; uploadedBy: string };

/** Skala ned till maxDim och komprimera till JPEG innan uppladdning —
 *  semesterbilder ska inte äta gigabyte. */
async function resizeImage(file: File, maxDim = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    // respektera EXIF-rotation från mobilkameror
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Kunde inte komprimera"))),
      "image/jpeg",
      0.82
    )
  );
}

export function DayPhotos({
  dayDate,
  photos,
}: {
  dayDate: string;
  photos: PhotoItem[];
}) {
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMe(localStorage.getItem("mpl26:name"));
  }, []);

  async function upload(files: FileList | null) {
    if (!files?.length || !me) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const small = await resizeImage(file);
        const form = new FormData();
        form.set("file", new File([small], "bild.jpg", { type: "image/jpeg" }));
        form.set("dayDate", dayDate);
        form.set("uploadedBy", me);
        const res = await fetch("/api/photos", { method: "POST", body: form });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Fel ${res.status}`);
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uppladdningen misslyckades.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(photo: PhotoItem) {
    if (!me || photo.uploadedBy !== me) return;
    const res = await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id, person: me }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      {photos.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {photos.map((p) => (
            <span key={p.id} className="relative shrink-0">
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`Foto av ${p.uploadedBy}`}
                  loading="lazy"
                  className="size-20 rounded-lg object-cover"
                />
              </a>
              {me === p.uploadedBy && (
                <button
                  onClick={() => remove(p)}
                  aria-label="Ta bort bilden"
                  className="absolute -right-1 -top-1 rounded-full bg-background/90 p-0.5 text-muted-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {me && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => upload(e.target.files)}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary disabled:opacity-50"
          >
            <Camera className="size-3.5" />
            {busy ? "Laddar upp …" : "Lägg till bilder"}
          </button>
        </>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
