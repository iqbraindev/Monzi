import fs from "fs/promises";
import path from "path";

const LOGO_DIR = path.join(process.cwd(), "data", "workspace-logos");
const ALLOWED_MIME = new Set(["image/png", "image/jpeg"]);
const MAX_BYTES = 2 * 1024 * 1024;

const EXT_BY_MIME: Record<string, "png" | "jpg"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

export function workspaceLogoApiPath(workspaceId: string): string {
  return `/api/workspaces/${workspaceId}/logo`;
}

async function ensureLogoDir(): Promise<void> {
  await fs.mkdir(LOGO_DIR, { recursive: true });
}

function logoFilePath(workspaceId: string, ext: "png" | "jpg"): string {
  return path.join(LOGO_DIR, `${workspaceId}.${ext}`);
}

export async function findWorkspaceLogoFile(
  workspaceId: string
): Promise<{ filePath: string; contentType: string } | null> {
  for (const [ext, contentType] of [
    ["png", "image/png"],
    ["jpg", "image/jpeg"],
  ] as const) {
    const filePath = logoFilePath(workspaceId, ext);
    try {
      await fs.access(filePath);
      return { filePath, contentType };
    } catch {
      // try next extension
    }
  }
  return null;
}

export async function saveWorkspaceLogo(
  workspaceId: string,
  file: File
): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Logo must be a PNG or JPEG image");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Logo must be 2 MB or smaller");
  }

  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    throw new Error("Logo must be a PNG or JPEG image");
  }

  await ensureLogoDir();
  await deleteWorkspaceLogo(workspaceId);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(logoFilePath(workspaceId, ext), buffer);

  return workspaceLogoApiPath(workspaceId);
}

export async function readWorkspaceLogo(
  workspaceId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const found = await findWorkspaceLogoFile(workspaceId);
  if (!found) return null;

  const buffer = await fs.readFile(found.filePath);
  return { buffer, contentType: found.contentType };
}

export async function deleteWorkspaceLogo(workspaceId: string): Promise<void> {
  for (const ext of ["png", "jpg"] as const) {
    try {
      await fs.unlink(logoFilePath(workspaceId, ext));
    } catch {
      // file may not exist
    }
  }
}
