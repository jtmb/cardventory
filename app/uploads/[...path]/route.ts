import { NextRequest, NextResponse } from "next/server";
import { existsSync, statSync, readFileSync } from "fs";
import { join, resolve, extname } from "path";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;

  // Security: resolve full path and ensure it stays inside the uploads directory
  const resolvedPath = resolve(UPLOADS_DIR, ...pathSegments);
  if (!resolvedPath.startsWith(UPLOADS_DIR + "/") && resolvedPath !== UPLOADS_DIR) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!existsSync(resolvedPath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const stat = statSync(resolvedPath);
  if (!stat.isFile()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const ext = extname(resolvedPath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  const fileBuffer = readFileSync(resolvedPath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": stat.mtime.toUTCString(),
    },
  });
}
