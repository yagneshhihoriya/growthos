import JSZip from "jszip";
import { IMAGE_STYLE_CONFIG, type ImageStyle } from "@/types/photo-studio";

export async function downloadAllImages(
  results: { style: ImageStyle; imageUrl: string }[],
  productName = "product"
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder(`${productName}-images`);
  if (!folder) return;

  await Promise.all(
    results.map(async (result) => {
      try {
        const res = await fetch(result.imageUrl, { credentials: "same-origin" });
        if (!res.ok) return;
        const blob = await res.blob();
        const config = IMAGE_STYLE_CONFIG[result.style];
        const safe = config.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        folder.file(`${safe}.jpg`, blob);
      } catch (err) {
        console.error(`[downloadAllImages] ${result.style} failed`, err);
      }
    })
  );

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${productName}-images.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadSingleImage(
  imageUrl: string,
  style: ImageStyle
): Promise<void> {
  const config = IMAGE_STYLE_CONFIG[style];
  const res = await fetch(imageUrl, { credentials: "same-origin" });
  if (!res.ok) return;
  const blob = await res.blob();
  const safe = config.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
