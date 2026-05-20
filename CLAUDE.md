# goldlion

> Sistema de gestão para academia de artes marciais. App web/PWA com área administrativa e área do aluno.

## Stack

- **Linguagem:** TypeScript 5
- **Framework:** Next.js 16 (App Router) + React 19
- **UI:** Tailwind CSS v4
- **Banco/storage:** Supabase (Postgres + Auth + Storage)
- **Pagamentos:** Asaas (gateway brasileiro — webhook em `src/app/api/asaas/webhook/`)
- **PWA:** Service Worker em `public/sw.js` + `public/manifest.json` + componente `<PwaUpdater />`
- **Runtime:** Node 20 (fixado em `.node-version` e `.nvmrc`)
- **Deploy:** Vercel

## Status

- **Estado:** ativo — em desenvolvimento, sem cliente em produção ainda
- **Última feature:** check-in com aula, cancelamento e filtros admin; banner de atualização do PWA; tutorial SVG de instalação
- **Em andamento:** estabilização do fluxo de check-in (validação por geolocalização) + financeiro
- **Próximo passo:** decidir features acumuladas a re-incorporar da branch `backup-pre-merge-2026-05-18` (auth check no layout, filtros adicionais, refactor pra remover mocks)

## Estrutura do projeto

```
src/app/
├── (aluno)/                    # area do aluno (route group, layout proprio)
│   ├── aluno/
│   │   ├── avisos/
│   │   ├── checkin/
│   │   ├── pagamentos/
│   │   └── perfil/
│   └── professor/
│       └── checkin/
├── (app)/                       # area administrativa (route group)
│   ├── alunos/
│   ├── aulas/
│   ├── checkin/
│   ├── comunicacao/
│   ├── dashboard/
│   ├── financeiro/
│   ├── modalidades/
│   ├── planos/
│   └── professores/
├── api/
│   ├── alunos/                  # CRUD de alunos
│   ├── asaas/webhook/           # webhook de pagamento Asaas
│   ├── aulas/
│   ├── auth/callback/
│   ├── me/                       # endpoints autenticados do usuario logado
│   ├── modalidades/
│   ├── planos/
│   └── professores/
├── cadastro/                     # cadastro publico
├── recuperar-senha/
├── redefinir-senha/
└── trocar-senha/

src/components/                   # componentes compartilhados (BottomNav, Header, StatusBadge, PwaUpdater, etc)
src/lib/
├── actions/                      # Server Actions (alunos, auth, checkins, dashboard, mensagens, notifications, pagamentos)
├── hooks/                        # custom hooks
├── modalidades/                  # ModalidadesProvider (context)
└── supabase/                     # clients (browser, server, middleware)
src/middleware.ts                 # middleware do Next.js (auth + redirects)
src/types/                        # types do banco (database.ts) e gerais (index.ts)

supabase/                         # migrations SQL
├── schema.sql                    # schema principal
├── add_*.sql                     # migrations incrementais
├── migration_modalidades.sql
└── fix_rls_recursion.sql         # fix de RLS

public/                           # estaticos (manifest, sw.js, favicons, icones PWA, SVGs de tutorial)
```

## Comandos comuns

```bash
# Pre-requisitos: Node 20 (rode `nvm use` se tiver nvm)

# Setup inicial (apos clonar)
npm install
cp .env.example .env.local    # depois preencher os valores

# Dev (porta 3000)
npm run dev

# Build local (sanity check antes de pushar)
npm run build

# Producao local (testa build)
npm run start

# Lint
npm run lint

# Deploy (Vercel — automatico em push pra main)
git push
```

## Variáveis de ambiente

Veja `.env.example`. Resumo das que importam:

- **Supabase**
  - `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto (publico)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key (publico)
  - `SUPABASE_SERVICE_ROLE_KEY` — service role (NUNCA expor ao browser)
- **Asaas (pagamento)**
  - `ASAAS_API_KEY` — token da API
  - `ASAAS_BASE_URL` — URL base (sandbox vs producao)
- **Academia (geolocalizacao para validar check-in)**
  - `NEXT_PUBLIC_ACADEMIA_LAT` — latitude
  - `NEXT_PUBLIC_ACADEMIA_LNG` — longitude
  - `NEXT_PUBLIC_ACADEMIA_RAIO` — raio em metros para validar presenca
  - `NEXT_PUBLIC_ACADEMIA_NOME` — nome exibido na UI

**Onde estão as credenciais reais:** Bitwarden — pastas "goldlion / Supabase" e "goldlion / Asaas". Nunca em `.env` commitado no Git.

## Convenções

- **Commits:** Conventional Commits — `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `chore(db):` (migrations).
- **Branches:** trabalho direto em `main` por enquanto (projeto solo). Quando crescer, migrar para feature branches.
- **Lint:** `eslint-config-next` (rodando via `npm run lint`).
- **Route groups:** `(aluno)` e `(app)` separam contextos sem afetar URL — usar conforme o tipo de usuario.
- **Server vs Client Components:** padrao Server. Marque `"use client"` apenas quando precisar de estado/eventos no browser.
- **Mocks:** o projeto está se afastando de mocks — preferir leitura real do Supabase. Mocks legados sendo removidos progressivamente.

## Dependências externas

- **Supabase** — auth (RLS habilitado, ver `supabase/fix_rls_recursion.sql` se aparecer erro recursivo de RLS), banco Postgres, storage (uploads de comprovantes etc).
- **Asaas** — gateway de pagamento brasileiro. Webhook em `src/app/api/asaas/webhook/route.ts` recebe eventos de mensalidade.
- **Vercel** — deploy. Variaveis de ambiente configuradas no painel da Vercel, não duplicar no codigo.
- **Geolocalização do navegador** — check-in valida que o aluno está dentro do raio da academia (variaveis `NEXT_PUBLIC_ACADEMIA_*`).

## Branches importantes

- **`main`** — branch ativa, deploy automatico no Vercel
- **`backup-pre-merge-2026-05-18`** — branch local com 5 commits acumulados que ficaram de fora dos cherry-picks de 18/05/2026 (features que precisam ser re-aplicadas em commits limpos: auth no layout, filtros adicionais no checkin admin, refactor remove-mocks). **Ver `proximos-passos.md` no Vault para o plano de re-incorporação.**

## Ligações

- **Prosa, decisões e plano:** `~/Documents/Obsidian Vault/10-Projetos/goldlion/`
- **Issues/PRs:** `gh issue list -R fparanhos/goldlion`
- **Repo:** https://github.com/fparanhos/goldlion
- **Deploy:** Vercel (URL no painel)

## Notas pro Claude

- **Antes de mexer em `src/app/(app)/checkin/page.tsx` ou no layout `src/app/(app)/layout.tsx`**: ler `backup-pre-merge-2026-05-18` primeiro para entender features pendentes — esses arquivos têm versões alternativas com auth check server-side e filtros adicionais ainda não mergeados.
- **RLS do Supabase**: não rode migrations sem testar localmente. Schema tem RLS complexo (ver `fix_rls_recursion.sql`).
- **Asaas webhook**: nunca testar em produção. Use sandbox (`ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3`).
- **Geolocalização**: ao desenvolver fora da academia, ajuste `NEXT_PUBLIC_ACADEMIA_RAIO` para um valor alto (ex: 99999) no `.env.local` — não commitar essa mudança.
- **PWA**: cuidado com `public/sw.js` — service worker faz cache agressivo. Após mudar, pode precisar incrementar versão para invalidar caches dos usuarios.
- **`.claude/`, `.vercel/`, `.env*.local`**: gitignored. Nunca commitar.
