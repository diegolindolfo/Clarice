# Clarice — Sistema de Biblioteca Escolar

Aplicação Next.js 15 + Supabase para gerenciamento de biblioteca escolar.

## Telas

| Rota | Descrição |
|------|-----------|
| `/dashboard` | Métricas, gráficos por turma, livros mais emprestados |
| `/emprestimos` | Lista com filtros, devolver, renovar, exportar PDF |
| `/emprestimos/novo` | Formulário 3 etapas: aluno → livro → confirmar |
| `/acervo` | Catálogo paginado com busca e filtros |
| `/acervo/[id]` | Detalhe do título com exemplares físicos |
| `/acervo/novo` | Cadastro de novo título + exemplares |
| `/alunos` | Lista + painel individual com histórico |
| `/login` | Autenticação com Supabase Auth |

## Pré-requisitos

- Node.js 18+
- Projeto Supabase com o schema aplicado
- Conta Vercel (para deploy)

## Configuração local

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

Você encontra esses valores no painel do Supabase em:
**Settings → API → Project URL** e **anon public**

### 3. Rodar localmente

```bash
npm run dev
```

Acesse http://localhost:3000

## Criar usuário no Supabase

No painel do Supabase, vá em:
**Authentication → Users → Add user**

Crie o usuário da bibliotecária com e-mail e senha.

## Deploy no Vercel

### Opção A — via CLI (recomendado)

```bash
npm install -g vercel
vercel
```

Siga o assistente. Na etapa de variáveis de ambiente, adicione:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Opção B — via GitHub

1. Suba o projeto para um repositório GitHub
2. Acesse vercel.com → New Project → importe o repositório
3. Em **Environment Variables**, adicione as duas variáveis
4. Clique em **Deploy**

## Banco de dados (Supabase)

O schema completo está no arquivo `schema.sql` que você já tem.
As principais tabelas e views usadas pelo app:

| Objeto | Tipo | Uso |
|--------|------|-----|
| `acervo` | Tabela | Títulos do acervo |
| `livros_exemplares` | Tabela | Exemplares físicos |
| `alunos` | Tabela | Cadastro de alunos |
| `turmas` | Tabela | Lookup de turmas |
| `emprestimos` | Tabela | Registro de empréstimos |
| `vw_acervo_catalogo` | View | Acervo com contagem de exemplares |
| `vw_painel_aluno` | View | Empréstimos com todos os detalhes |
| `vw_emprestimos_atrasados` | View | Empréstimos em atraso em tempo real |
| `renovar_emprestimo(uuid)` | Função | Renova com validação de regras |
| `devolver_livro(uuid)` | Função | Devolve e libera o exemplar |

## Tecnologias

- **Next.js 16** — App Router
- **Supabase** — Banco de dados + Auth
- **Tailwind CSS** — Estilização
- **jsPDF + jspdf-autotable** — Exportação de PDF
- **TypeScript** — Tipagem estática
- **PWA** via `@ducanh2912/next-pwa`

## Notas de build

- Os scripts `dev` e `build` usam `--webpack` em vez do Turbopack (default no
  Next 16). Isso é intencional: o plugin `@ducanh2912/next-pwa` ainda não
  suporta Turbopack. Quando o suporte chegar, basta remover a flag.

## Banco — agendamento de refresh do ranking

A view materializada `mv_ranking_ano` (usada por `get_passaporte`) precisa ser
atualizada periodicamente para refletir novas devoluções. Em produção, habilite
`pg_cron` no Supabase (Database → Extensions) e agende:

```sql
select cron.schedule(
  'refresh-ranking-ano',
  '15 * * * *',
  $$select public.refresh_mv_ranking_ano()$$
);
```

Sem o cron, o ranking fica congelado no último refresh manual.

## Testes / lint

```bash
npm test            # testes unitários (Vitest)
npm run lint        # ESLint
npm run type-check  # checagem de tipos sem emitir
```
