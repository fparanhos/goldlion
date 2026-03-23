import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getAuthUser() {
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
  return user;
}

// Listar pagamentos do aluno logado
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from("pagamentos")
      .select("*")
      .eq("aluno_id", user.id)
      .order("data_vencimento", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ pagamentos: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Sinalizar pagamento com comprovante
export async function PUT(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const supabase = getSupabase();

  try {
    const formData = await request.formData();
    const pagamentoId = formData.get("pagamentoId") as string;
    const arquivo = formData.get("comprovante") as File;

    if (!pagamentoId || !arquivo) {
      return NextResponse.json({ error: "Pagamento e comprovante sao obrigatorios" }, { status: 400 });
    }

    // Verificar se o pagamento pertence ao aluno
    const { data: pag } = await supabase
      .from("pagamentos")
      .select("id, aluno_id, status")
      .eq("id", pagamentoId)
      .eq("aluno_id", user.id)
      .single();

    if (!pag) {
      return NextResponse.json({ error: "Pagamento nao encontrado" }, { status: 404 });
    }

    if (pag.status === "pago") {
      return NextResponse.json({ error: "Este pagamento ja foi confirmado" }, { status: 400 });
    }

    // Upload do comprovante para Supabase Storage
    const ext = arquivo.name.split(".").pop() || "jpg";
    const fileName = `${user.id}/${pagamentoId}_${Date.now()}.${ext}`;
    const arrayBuffer = await arquivo.arrayBuffer();

    // Garantir que o bucket existe
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b: any) => b.id === "comprovantes")) {
      await supabase.storage.createBucket("comprovantes", { public: true });
    }

    const { error: uploadError } = await supabase.storage
      .from("comprovantes")
      .upload(fileName, arrayBuffer, {
        contentType: arquivo.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Erro ao enviar comprovante: " + uploadError.message }, { status: 400 });
    }

    // Gerar URL publica
    const { data: urlData } = supabase.storage
      .from("comprovantes")
      .getPublicUrl(fileName);

    // Atualizar pagamento com comprovante
    const { error: updateError } = await supabase
      .from("pagamentos")
      .update({
        comprovante_url: urlData.publicUrl,
        sinalizado_em: new Date().toISOString(),
      })
      .eq("id", pagamentoId);

    if (updateError) {
      return NextResponse.json({ error: "Erro ao atualizar pagamento: " + updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, comprovanteUrl: urlData.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
