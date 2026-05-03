"use client";

import { useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/api";

const BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Props {
  /** Requerido para modo portada (una sola imagen); opcional si solo usas `multiple` + `onUploadMultiple`. */
  onUpload?: (url: string) => void;
  onUploadMultiple?: (urls: string[]) => void;
  multiple?: boolean;
  label?: string;
  currentImage?: string;
  /** Galería existente (edición) */
  initialGallery?: string[];
}

export default function ImageUploader({
  onUpload,
  onUploadMultiple,
  multiple = false,
  label = "Subir imagen",
  currentImage,
  initialGallery,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || "");
  const [previews, setPreviews] = useState<string[]>(initialGallery || []);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentImage || "");
  }, [currentImage]);

  useEffect(() => {
    if (initialGallery && initialGallery.length) {
      setPreviews(initialGallery);
    }
  }, [initialGallery]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const token = getToken();
    if (!token) {
      setError("Inicia sesión para subir imágenes.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      if (multiple) {
        if (files.length > 1) {
          const formData = new FormData();
          Array.from(files).forEach((file) => {
            formData.append("images", file);
          });
          const res = await fetch(`${BASE}/api/upload/images`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const data = (await res.json()) as {
            urls?: string[];
            error?: string;
          };
          if (!res.ok) {
            throw new Error(data.error || "Error al subir");
          }
          if (data.urls?.length) {
            setPreviews((prev) => {
              const next = [...prev, ...data.urls!];
              onUploadMultiple?.(next);
              return next;
            });
          }
        } else {
          const formData = new FormData();
          formData.append("image", files[0]);
          const res = await fetch(`${BASE}/api/upload/image`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const data = (await res.json()) as { url?: string; error?: string };
          if (!res.ok) {
            throw new Error(data.error || "Error al subir");
          }
          if (data.url) {
            setPreviews((prev) => {
              const next = [...prev, data.url!];
              onUploadMultiple?.(next);
              return next;
            });
          }
        }
      } else {
        const formData = new FormData();
        formData.append("image", files[0]);
        const res = await fetch(`${BASE}/api/upload/image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Error al subir");
        }
        if (data.url) {
          setPreview(data.url);
          onUpload?.(data.url);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-uploader">
      <div
        className="upload-area"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleUpload(e.dataTransfer.files);
        }}
      >
        {!multiple && preview ? (
          <div className="upload-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" />
            <div className="upload-overlay">
              <span>Cambiar imagen</span>
            </div>
          </div>
        ) : !multiple ? (
          <div className="upload-placeholder">
            <div className="upload-icon">📷</div>
            <p className="upload-label">{label}</p>
            <p className="upload-hint">
              JPG, PNG o WebP • Máx 5MB
              {multiple && " • Puedes subir varias"}
            </p>
            {uploading && <div className="upload-spinner">Subiendo...</div>}
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon">📷</div>
            <p className="upload-label">{label}</p>
            <p className="upload-hint">
              JPG, PNG o WebP • Máx 5MB • Puedes subir varias
            </p>
            {uploading && <div className="upload-spinner">Subiendo...</div>}
          </div>
        )}
      </div>

      {multiple && previews.length > 0 && (
        <div className="upload-previews-grid">
          {previews.map((url, i) => (
            <div key={`${url}-${i}`} className="upload-preview-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 1}`} />
              <button
                type="button"
                onClick={() => {
                  const newPreviews = previews.filter((_, j) => j !== i);
                  setPreviews(newPreviews);
                  onUploadMultiple?.(newPreviews);
                }}
                className="upload-remove-btn"
                aria-label="Quitar imagen"
              >
                ×
              </button>
            </div>
          ))}
          <div
            className="upload-add-more"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onClick={() => inputRef.current?.click()}
          >
            + Añadir más
          </div>
        </div>
      )}

      {error && <p className="upload-error">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleUpload(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
