export type Modalidade = "muaythai" | "boxe" | "jiujitsu";

export type StatusAluno = "ativo" | "inadimplente" | "trancado" | "cancelado";

export type TipoPlano = "mensal" | "trimestral" | "semestral" | "anual";

export type FormaPagamento = "pix" | "cartao" | "dinheiro" | "boleto";

export type StatusPagamento = "pago" | "pendente" | "atrasado" | "cancelado";

export type PerfilUsuario = "admin" | "professor" | "aluno";

export type Faixa =
  | "branca"
  | "azul"
  | "roxa"
  | "marrom"
  | "preta"
  | "coral"
  | "vermelha";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  perfil: PerfilUsuario;
  foto?: string;
  criadoEm: string;
}

export interface Aluno extends Usuario {
  perfil: "aluno";
  cpf: string;
  dataNascimento: string;
  contatoEmergencia: string;
  telefoneEmergencia: string;
  modalidades: Modalidade[];
  plano: TipoPlano;
  status: StatusAluno;
  faixa?: Faixa; // para jiujitsu
  dataInicioPlano: string;
  dataFimPlano: string;
  observacoes?: string;
}

export interface Plano {
  id: string;
  nome: string;
  tipo: TipoPlano;
  modalidades: Modalidade[];
  valor: number;
  ativo: boolean;
}

export interface Pagamento {
  id: string;
  alunoId: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  formaPagamento?: FormaPagamento;
  status: StatusPagamento;
  referencia: string; // ex: "03/2026"
}

export interface CheckIn {
  id: string;
  alunoId: string;
  dataHoraEntrada: string;
  dataHoraSaida?: string;
  modalidade: Modalidade;
  latitude: number;
  longitude: number;
  validado: boolean;
}

export interface Mensagem {
  id: string;
  remetenteId: string;
  remetenteNome: string;
  conteudo: string;
  canal: string; // "geral", "muaythai", "boxe", "jiujitsu"
  criadoEm: string;
}

export interface Aula {
  id: string;
  modalidade: Modalidade;
  professorId: string;
  professorNome: string;
  diaSemana: number; // 0-6
  horaInicio: string;
  horaFim: string;
  vagas: number;
}
