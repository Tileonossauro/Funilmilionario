# GostoSAH 💪

App de treino na academia — monte a rotina da semana, siga o treino guiado com timer de descanso,
registre cada série e o peso corporal, e acompanhe a evolução nos gráficos.

Os dados ficam salvos no próprio celular e, com uma conta (e-mail e senha, em **Configurações →
Conta**), também na nuvem (Supabase): trocar de celular ou limpar o navegador não perde nada, e dois
aparelhos na mesma conta juntam os treinos dos dois.

## Instalar no celular

1. Abra o endereço do app no celular (Safari no iPhone, Chrome no Android).
2. iPhone: **Compartilhar → Adicionar à Tela de Início**. Android: menu **⋮ → Adicionar à tela inicial**.
3. Pronto: o GostoSAH abre em tela cheia, como um app normal, e funciona offline.

## Nuvem (Supabase)

Projeto `gostosah` (região São Paulo). A tabela e as regras de acesso estão em
`supabase/migrations/`: uma linha por conta (`gostosah_state`) com o estado inteiro do app, e cada
conta só lê e grava a própria linha. Contas novas já nascem confirmadas (sem e-mail de
confirmação). A URL e a chave pública do projeto vão no script `build:local` de
`frontend/package.json`; a sincronização fica em `frontend/src/lib/cloud.js`.

Fotos e vídeos de exercícios personalizados continuam só no aparelho.

## Publicar (Vercel)

O `vercel.json` na raiz já está configurado: importe o repositório na Vercel e faça o deploy,
sem variáveis de ambiente. O build roda `npm run build:local` em `frontend/` e publica
`frontend/dist`. O `vercel.json` usa `builds` de propósito: sem ele, a Vercel transformaria cada
arquivo da pasta `api/` (o servidor do openGym, que o GostoSAH não usa) numa função serverless,
mais do que o plano grátis permite.

Rodar localmente:

```bash
cd frontend
npm install
npm run build:local && npx vite preview   # versão igual à publicada
npm test                                   # testes
```

## Créditos e licença

O GostoSAH é baseado no [openGym](https://github.com/DuarteSantos8/openGym), de Duarte Santos,
distribuído sob a licença **AGPL-3.0-or-later**. Esta versão continua sob a mesma licença (ver
[`LICENSE`](LICENSE) e [`NOTICE.md`](NOTICE.md)); o README original está em
[`README.openGym.md`](README.openGym.md).

Imagens e animações dos exercícios: © [Gym visual](https://gymvisual.com/), via
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (MIT).

Mudanças em relação ao openGym:

- Nome GostoSAH no app, na tela inicial e no ícone instalado.
- Modo "só local" (`VITE_LOCAL_ONLY=1`, em `frontend/src/lib/local-only.js`): abre direto no app,
  sem tela de login, sem sincronização e sem opções de servidor.
- Começa em português do Brasil.
- Login por e-mail e senha com salvamento na nuvem (Supabase), no lugar do servidor próprio. A conta
  vem primeiro: o app só abre depois de criar a conta ou entrar.
- Tutorial na primeira vez (`frontend/src/views/Welcome.jsx`), uma vez por conta; dá pra ver de novo
  em Configurações → Conta.
- Sem o cartão da academia (check-in com QR code).
