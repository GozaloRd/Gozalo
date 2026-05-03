"use client";

type QRCardProps = {
  imageUrl?: string | null;
  title: string;
  subtitle?: string;
};

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function QRCard({ imageUrl, title, subtitle }: QRCardProps) {
  async function onDownload() {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFileName(title) || "qr"}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      <div className="mt-4 flex justify-center">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="QR" className="h-44 w-44 rounded-xl bg-white p-2 sm:h-52 sm:w-52" />
        ) : (
          <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-dashed border-white/15 bg-night-950 text-xs text-slate-500 sm:h-52 sm:w-52">
            Generando...
          </div>
        )}
      </div>
      <button
        type="button"
        disabled={!imageUrl}
        onClick={() => void onDownload()}
        className="mt-4 w-full rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Descargar QR
      </button>
    </div>
  );
}
