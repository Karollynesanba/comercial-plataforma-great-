# Supabase Great

## 1. Ambiente local

O projeto já está apontado para:

- `VITE_SUPABASE_URL=https://bwucqiqnxwdqapunbwip.supabase.co`
- `VITE_ENABLE_COMMERCIAL_AUTOMATION=false`

A automação cruzada entre agenda, agendamento e pipeline foi deixada desligada por padrão para evitar recriação automática de cards e divergência de métricas enquanto a base é reestruturada.

## 2. Zerar a base

No painel do Supabase, abra `SQL Editor` e rode o arquivo:

- `supabase/reset_platform_data.sql`

Esse reset:

- zera os dados comerciais, agenda, operacional e dashboards
- preserva usuários, perfis, times, boards, colunas, papéis e estrutura do banco
- limpa também `criativos`, metas e lembretes

## 3. Reiniciar a aplicação

Depois do `.env` e do reset SQL:

1. pare o servidor atual
2. rode `npm run dev`
3. abra novamente `http://localhost:8080`

## 4. Reativar automações

Quando o fluxo estiver estável, altere no `.env`:

```env
VITE_ENABLE_COMMERCIAL_AUTOMATION=true
```
