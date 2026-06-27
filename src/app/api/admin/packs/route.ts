import { requireSuperAdmin } from "@/lib/auth/require-role";
import { logAuditEvent } from "@/lib/billing/audit";
import { getAllPacks } from "@/lib/billing/subscription";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const packs = await getAllPacks();
    return Response.json({ packs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load packs";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    const { data: pack, error: packError } = await supabase
      .from("packs")
      .insert({
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
        price_monthly: body.price_monthly ?? 0,
        price_yearly: body.price_yearly ?? 0,
        stripe_price_id_monthly: body.stripe_price_id_monthly ?? null,
        stripe_price_id_yearly: body.stripe_price_id_yearly ?? null,
        is_active: body.is_active ?? true,
        is_public: body.is_public ?? true,
        sort_order: body.sort_order ?? 0,
      })
      .select("id")
      .single();

    if (packError || !pack) {
      return Response.json(
        { error: packError?.message ?? "Failed to create pack" },
        { status: 400 }
      );
    }

    if (body.limits) {
      await supabase.from("pack_limits").insert({
        pack_id: pack.id,
        ...body.limits,
      });
    }

    await logAuditEvent({
      actorId: auth.userId,
      action: "pack.create",
      targetType: "pack",
      targetId: pack.id,
      metadata: { slug: body.slug, name: body.name },
    });

    const packs = await getAllPacks();
    return Response.json({ packs }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create pack";
    return Response.json({ error: message }, { status: 500 });
  }
}
