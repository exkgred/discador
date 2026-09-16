# Discador Zenvia

App de call center com discagem via API de Voz da Zenvia (TotalVoice). O backend nunca usa `@zenvia/sdk` (mensagens); chamadas passam por `https://voice-api.zenvia.com` com header `Access-Token`.

## Stack

- Backend: NestJS 10, Prisma, PostgreSQL, Redis, Socket.IO
- Frontend: React + Vite + Tailwind
- Telefonia: adapter Mock (local) ou HTTP (sandbox/produção)

## Como executar

```bash
docker compose up -d
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

- API / Swagger: http://localhost:3001/api/docs
- Frontend: http://localhost:5173

### Contas seed

| Email | Senha | Papel |
|-------|-------|-------|
| admin@discador.dev | password123 | ADMIN |
| supervisor@discador.dev | password123 | SUPERVISOR |
| agent@discador.dev | password123 | AGENT |

`ZENVIA_MODE=mock` (padrão) simula chamadas sem token. Para sandbox real, defina `ZENVIA_MODE=http` e `ZENVIA_ACCESS_TOKEN`.

## Demo na Vercel (estática)

O frontend sobe sozinho, sem Nest, Postgres, Redis ou Zenvia. Com `VITE_DEMO=true` o Axios usa um adapter no navegador (leads, campanhas, fila, discagem simulada e wrap-up no `localStorage`).

1. No [Vercel](https://vercel.com/new) importe `exkgred/discador`
2. **Root Directory:** `frontend` (Settings → General). Não deixe Override no Install Command.
3. Framework: Vite · o build gera `dist`
4. Variável: `VITE_DEMO=true` (já vem em `frontend/.env.production`)

Login da demo: `agent@discador.dev` / `password123` (já vem preenchido).

Demo: [https://discador.vercel.app/](https://discador.vercel.app/)

Código: [https://github.com/exkgred/discador](https://github.com/exkgred/discador)

## Fluxo do discador

1. Agente escolhe campanha e fica disponível
2. Backend reserva o próximo lead (`PENDING` → `DIALING`)
3. `POST /chamada` na Zenvia (ou mock)
4. Webhook **Chamada-Fim** (ou hangup simulado) abre o wrap-up
5. Agente grava o resultado; no modo POWER o próximo lead é discado automaticamente
