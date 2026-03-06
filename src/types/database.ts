export type Database = {
  public: {
    Tables: {
      perfis: {
        Row: {
          id: string;
          nome: string;
          email: string;
          telefone: string | null;
          perfil: "admin" | "professor" | "aluno";
          foto_url: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id: string;
          nome: string;
          email: string;
          telefone?: string | null;
          perfil?: "admin" | "professor" | "aluno";
          foto_url?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          telefone?: string | null;
          perfil?: "admin" | "professor" | "aluno";
          foto_url?: string | null;
          atualizado_em?: string;
        };
      };
      alunos: {
        Row: {
          id: string;
          cpf: string | null;
          data_nascimento: string | null;
          contato_emergencia: string | null;
          telefone_emergencia: string | null;
          modalidades: ("muaythai" | "boxe" | "jiujitsu")[];
          plano_id: string | null;
          status: "ativo" | "inadimplente" | "trancado" | "cancelado";
          faixa: string | null;
          data_inicio_plano: string | null;
          data_fim_plano: string | null;
          asaas_customer_id: string | null;
          observacoes: string | null;
        };
        Insert: {
          id: string;
          cpf?: string | null;
          data_nascimento?: string | null;
          contato_emergencia?: string | null;
          telefone_emergencia?: string | null;
          modalidades?: ("muaythai" | "boxe" | "jiujitsu")[];
          plano_id?: string | null;
          status?: "ativo" | "inadimplente" | "trancado" | "cancelado";
          faixa?: string | null;
          data_inicio_plano?: string | null;
          data_fim_plano?: string | null;
          asaas_customer_id?: string | null;
          observacoes?: string | null;
        };
        Update: {
          id?: string;
          cpf?: string | null;
          data_nascimento?: string | null;
          contato_emergencia?: string | null;
          telefone_emergencia?: string | null;
          modalidades?: ("muaythai" | "boxe" | "jiujitsu")[];
          plano_id?: string | null;
          status?: "ativo" | "inadimplente" | "trancado" | "cancelado";
          faixa?: string | null;
          data_inicio_plano?: string | null;
          data_fim_plano?: string | null;
          asaas_customer_id?: string | null;
          observacoes?: string | null;
        };
      };
      pagamentos: {
        Row: {
          id: string;
          aluno_id: string;
          valor: number;
          data_vencimento: string;
          data_pagamento: string | null;
          forma_pagamento: "pix" | "cartao" | "dinheiro" | "boleto" | null;
          status: "pago" | "pendente" | "atrasado" | "cancelado";
          referencia: string;
          asaas_payment_id: string | null;
          asaas_invoice_url: string | null;
          criado_em: string;
        };
        Insert: {
          aluno_id: string;
          valor: number;
          data_vencimento: string;
          referencia: string;
          data_pagamento?: string | null;
          forma_pagamento?: "pix" | "cartao" | "dinheiro" | "boleto" | null;
          status?: "pago" | "pendente" | "atrasado" | "cancelado";
          asaas_payment_id?: string | null;
          asaas_invoice_url?: string | null;
        };
        Update: {
          aluno_id?: string;
          valor?: number;
          data_vencimento?: string;
          referencia?: string;
          data_pagamento?: string | null;
          forma_pagamento?: "pix" | "cartao" | "dinheiro" | "boleto" | null;
          status?: "pago" | "pendente" | "atrasado" | "cancelado";
          asaas_payment_id?: string | null;
          asaas_invoice_url?: string | null;
        };
      };
      checkins: {
        Row: {
          id: string;
          aluno_id: string;
          data_hora_entrada: string;
          data_hora_saida: string | null;
          modalidade: "muaythai" | "boxe" | "jiujitsu";
          latitude: number;
          longitude: number;
          validado: boolean;
          criado_em: string;
        };
        Insert: {
          aluno_id: string;
          modalidade: "muaythai" | "boxe" | "jiujitsu";
          latitude: number;
          longitude: number;
          data_hora_entrada?: string;
          data_hora_saida?: string | null;
          validado?: boolean;
        };
        Update: {
          aluno_id?: string;
          modalidade?: "muaythai" | "boxe" | "jiujitsu";
          latitude?: number;
          longitude?: number;
          data_hora_entrada?: string;
          data_hora_saida?: string | null;
          validado?: boolean;
        };
      };
      mensagens: {
        Row: {
          id: string;
          remetente_id: string;
          conteudo: string;
          canal: string;
          criado_em: string;
        };
        Insert: {
          remetente_id: string;
          conteudo: string;
          canal?: string;
        };
        Update: {
          remetente_id?: string;
          conteudo?: string;
          canal?: string;
        };
      };
      aulas: {
        Row: {
          id: string;
          modalidade: "muaythai" | "boxe" | "jiujitsu";
          professor_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fim: string;
          vagas: number;
          ativo: boolean;
          criado_em: string;
        };
        Insert: {
          modalidade: "muaythai" | "boxe" | "jiujitsu";
          professor_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fim: string;
          vagas?: number;
          ativo?: boolean;
        };
        Update: {
          modalidade?: "muaythai" | "boxe" | "jiujitsu";
          professor_id?: string;
          dia_semana?: number;
          hora_inicio?: string;
          hora_fim?: string;
          vagas?: number;
          ativo?: boolean;
        };
      };
      planos: {
        Row: {
          id: string;
          nome: string;
          tipo: "mensal" | "trimestral" | "semestral" | "anual";
          modalidades: ("muaythai" | "boxe" | "jiujitsu")[];
          valor: number;
          ativo: boolean;
          criado_em: string;
        };
        Insert: {
          nome: string;
          tipo: "mensal" | "trimestral" | "semestral" | "anual";
          modalidades: ("muaythai" | "boxe" | "jiujitsu")[];
          valor: number;
          ativo?: boolean;
        };
        Update: {
          nome?: string;
          tipo?: "mensal" | "trimestral" | "semestral" | "anual";
          modalidades?: ("muaythai" | "boxe" | "jiujitsu")[];
          valor?: number;
          ativo?: boolean;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          criado_em: string;
        };
        Insert: {
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
        };
        Update: {
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
        };
      };
    };
  };
};
