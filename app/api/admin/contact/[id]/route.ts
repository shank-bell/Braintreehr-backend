// PATCH /api/admin/contact/:id — update lead status
// Design doc §5.2
import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession, UnauthorizedError } from "@/lib/auth";
import { contactStatusUpdateSchema } from "@/lib/validation";
import { getServiceClient } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireStaffSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = contactStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const supabase = getServiceClient();
  const { data: lead, error } = await supabase
    .from("contact_submissions")
    .update({ status: parsed.data.status })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Could not update submission" }, { status: 500 });
  }

  return NextResponse.json({ lead });
}
