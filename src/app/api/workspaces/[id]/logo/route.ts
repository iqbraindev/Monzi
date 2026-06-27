import { auth } from "@clerk/nextjs/server";

import {
  readWorkspaceLogo,
  saveWorkspaceLogo,
} from "@/lib/workspaces/logo-storage";
import {
  getWorkspaceMembership,
  updateWorkspaceLogoUrl,
} from "@/lib/workspaces/service";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getWorkspaceMembership(userId, id);
  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const logo = await readWorkspaceLogo(id);
  if (!logo) {
    return Response.json({ error: "Logo not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(logo.buffer), {
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function POST(req: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const membership = await getWorkspaceMembership(userId, id);
  if (!membership || membership.role !== "owner") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Logo file is required" }, { status: 400 });
  }

  try {
    const logoUrl = await saveWorkspaceLogo(id, file);
    const workspace = await updateWorkspaceLogoUrl(
      id,
      membership.workspace.owner_user_id,
      logoUrl
    );
    return Response.json({ workspace, logo_url: logoUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload logo";
    return Response.json({ error: message }, { status: 400 });
  }
}
