export async function GET() {
  const info: Record<string, unknown> = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };

  try {
    const http2 = require("http2");
    info.http2Available = true;
    info.http2Connect = typeof http2.connect;
  } catch (err: unknown) {
    info.http2Available = false;
    info.http2Error = err instanceof Error ? err.message : String(err);
  }

  try {
    const http2 = await import("node:http2");
    info.http2DynamicImport = true;
    info.http2DynamicConnect = typeof http2.connect;
  } catch (err: unknown) {
    info.http2DynamicImport = false;
    info.http2DynamicError = err instanceof Error ? err.message : String(err);
  }

  return Response.json(info);
}
