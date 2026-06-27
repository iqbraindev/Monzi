import { requireSuperAdmin } from "@/lib/auth/require-role";
import { logAuditEvent } from "@/lib/billing/audit";
import { getAllPacks } from "@/lib/billing/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    const packFields: Record<string, unknown> = {};
    for (const key of [
      "name",
      "slug",
      "description",
      "price_monthly",
      "price_yearly",
      "stripe_price_id_monthly",
      "stripe_price_id_yearly",
      "is_active",
      "is_public",
      "sort_order",
    ] as const) {
      if (key in body) packFields[key] = body[key];
    }

    if (Object.keys(packFields).length > 0) {
      const { error } = await supabase
        .from("packs")
        .update({ ...packFields, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        return Response.json({ error: error.message }, { status: 400 });
      }
    }

    if (body.limits) {
      const { data: existing } = await supabase
        .from("pack_limits")
        .select("id")
        .eq("pack_id", id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("pack_limits")
          .update(body.limits)
          .eq("pack_id", id);
      } else {
        await supabase.from("pack_limits").insert({
          pack_id: id,
          ...body.limits,
        });
      }
    }

    await logAuditEvent({
      actorId: auth.userId,
      action: "pack.update",
      targetType: "pack",
      targetId: id,
      metadata: body,
    });

    const packs = await getAllPacks();
    return Response.json({ packs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update pack";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const supabase = getSupabaseAdmin();

    const { data: pack } = await supabase
      .from("packs")
      .select("slug")
      .eq("id", id)
      .single();

    if (pack?.slug === "free") {
      return Response.json(
        { error: "The free plan cannot be deleted" },
        { status: 400 }
      );
    }

    await supabase
      .from("packs")
      .update({ is_active: false, is_public: false })
      .eq("id", id);

    await logAuditEvent({
      actorId: auth.userId,
      action: "pack.deactivate",
      targetType: "pack",
      targetId: id,
    });

    const packs = await getAllPacks();
    return Response.json({ packs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete pack";
    return Response.json({ error: message }, { status: 500 });
  }
}
