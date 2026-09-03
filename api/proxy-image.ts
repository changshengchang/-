export default async function handler(req: any, res: any) {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl || !imageUrl.startsWith("http")) {
      return res.status(400).json({ error: "Invalid image URL" });
    }
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch remote image" });
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    console.error("Image proxy error:", err);
    res.status(500).json({ error: "Failed to proxy image" });
  }
}
