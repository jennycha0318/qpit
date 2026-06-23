// 이미지 파일을 최대 maxDim(기본 1024px) JPEG로 리사이즈해 base64로 반환.
// 전송량·비전 비용을 줄이고 Vercel 요청 본문 한도를 피하기 위함.
export function fileToResized(
  file: File,
  maxDim = 1024,
): Promise<{ media_type: string; data: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve({ media_type: "image/jpeg", data: dataUrl.split(",")[1] ?? "" });
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}
