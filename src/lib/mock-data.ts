import { Aluno, Pagamento, CheckIn, Mensagem, Plano, Aula } from "@/types";

export const planos: Plano[] = [
  {
    id: "p1",
    nome: "Muay Thai Mensal",
    tipo: "mensal",
    modalidades: ["muaythai"],
    valor: 120,
    ativo: true,
  },
  {
    id: "p2",
    nome: "Boxe Mensal",
    tipo: "mensal",
    modalidades: ["boxe"],
    valor: 120,
    ativo: true,
  },
  {
    id: "p3",
    nome: "Jiu-Jitsu Mensal",
    tipo: "mensal",
    modalidades: ["jiujitsu"],
    valor: 150,
    ativo: true,
  },
  {
    id: "p4",
    nome: "Combo 2 Modalidades",
    tipo: "mensal",
    modalidades: ["muaythai", "boxe"],
    valor: 200,
    ativo: true,
  },
  {
    id: "p5",
    nome: "Combo Completo",
    tipo: "mensal",
    modalidades: ["muaythai", "boxe", "jiujitsu"],
    valor: 280,
    ativo: true,
  },
  {
    id: "p6",
    nome: "Combo Completo Trimestral",
    tipo: "trimestral",
    modalidades: ["muaythai", "boxe", "jiujitsu"],
    valor: 750,
    ativo: true,
  },
];

export const alunos: Aluno[] = [];

export const pagamentos: Pagamento[] = [];

export const checkins: CheckIn[] = [];

export const mensagens: Mensagem[] = [];

export const aulas: Aula[] = [
  { id: "au1", modalidade: "muaythai", professorId: "prof1", professorNome: "Prof. Ricardo", diaSemana: 1, horaInicio: "07:00", horaFim: "08:30", vagas: 20 },
  { id: "au2", modalidade: "muaythai", professorId: "prof1", professorNome: "Prof. Ricardo", diaSemana: 3, horaInicio: "07:00", horaFim: "08:30", vagas: 20 },
  { id: "au3", modalidade: "muaythai", professorId: "prof1", professorNome: "Prof. Ricardo", diaSemana: 5, horaInicio: "07:00", horaFim: "08:30", vagas: 20 },
  { id: "au4", modalidade: "boxe", professorId: "prof1", professorNome: "Prof. Ricardo", diaSemana: 2, horaInicio: "18:00", horaFim: "19:30", vagas: 15 },
  { id: "au5", modalidade: "boxe", professorId: "prof1", professorNome: "Prof. Ricardo", diaSemana: 4, horaInicio: "18:00", horaFim: "19:30", vagas: 15 },
  { id: "au6", modalidade: "jiujitsu", professorId: "prof2", professorNome: "Prof. Amanda", diaSemana: 1, horaInicio: "09:00", horaFim: "10:30", vagas: 25 },
  { id: "au7", modalidade: "jiujitsu", professorId: "prof2", professorNome: "Prof. Amanda", diaSemana: 3, horaInicio: "09:00", horaFim: "10:30", vagas: 25 },
  { id: "au8", modalidade: "jiujitsu", professorId: "prof2", professorNome: "Prof. Amanda", diaSemana: 5, horaInicio: "09:00", horaFim: "10:30", vagas: 25 },
];
