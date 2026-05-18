import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const JANELA_CANCELAMENTO_MINUTOS = 30;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const cookieStore = await cookies();
  const authServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() { /* read-only */ },
      },
    }
  );

  const { data: { user } } = await authServer.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: checkin, error: getErr } = await supabase
    .from("checkins")
    .select("aluno_id, data_hora_entrada")
    .eq("id", id)
    .single();

  if (getErr || !checkin) {
    return NextResponse.json({ error: "Check-in nao encontrado" }, { status: 404 });
  }

  if (checkin.aluno_id !== user.id) {
    return NextResponse.json({ error: "Este check-in nao pertence a voce" }, { status: 403 });
  }

  const entrada = new Date(checkin.data_hora_entrada).getTime();
  const agora = Date.now();
  const minutosDecorridos = (agora - entrada) / 60000;

  if (minutosDecorridos > JANELA_CANCELAMENTO_MINUTOS) {
    return NextResponse.json(
      {
        error: `Janela de cancelamento expirada (${JANELA_CANCELAMENTO_MINUTOS} min apos o check-in). Peça ao administrador para remover.`,
        minutosDecorridos: Math.floor(minutosDecorridos),
      },
      { status: 400 }
    );
  }

  const { error: delErr } = await supabase.from("checkins").delete().eq("id", id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
