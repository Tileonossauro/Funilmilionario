# DEPLOY.md — colocar no ar

## Primeiro: domínio e hospedagem são coisas diferentes

**Domínio** é o endereço: `funilmilionario.voltaregestao.com.br`. Já existe, está na
Hostinger, e vai continuar lá.

**Hospedagem** é o computador que fica ligado rodando o app. O endereço aponta pra ele.

Ter o endereço não coloca nada no ar — precisa existir algo rodando pra onde ele aponta.
Então a pergunta nunca é "Hostinger ou outro lugar": **o domínio fica na Hostinger nos
dois casos**. A pergunta é só onde o app roda.

## O que este app exige de quem hospeda

Não é um site de arquivos parados. Precisa de **Node.js rodando no servidor**, porque:

- salvar o funil passa por código que roda no servidor (Server Actions);
- o login é verificado a cada acesso (middleware);
- a rota `/api/extract` é onde a chave da Anthropic fica — ela **tem** que ficar no
  servidor, nunca no navegador.

Hospedagem compartilhada tradicional (a de WordPress/PHP, com cPanel ou hPanel) é feita
pra outro tipo de site e **não roda isso**. Não é preferência: sem processo Node, o app
não sobe.

### Como descobrir qual é o seu caso

No hPanel da Hostinger, olhe o menu:

| O que você vê | Roda o app? | O que fazer |
|---|---|---|
| **VPS** | Sim | Caminho B, tudo na Hostinger |
| **Hospedagem de Sites** (Premium / Business / Cloud) | Não | Caminho A |

Atalho: procure "Node.js" no hPanel. Se a opção não existir, é compartilhada.

---

## Caminho A — Vercel + subdomínio da Hostinger

### 1. Subir o app

1. Entre em [vercel.com](https://vercel.com) com a conta do GitHub.
2. **Add New → Project** e importe `Tileonossauro/Funilmilionario`.
3. **Não mexa em Framework, Build Command nem Output Directory.** A Vercel
   reconhece Next.js sozinha, e o branch certo já é o padrão do repositório —
   não há nada para selecionar.
4. Abra **Environment Variables** e preencha:

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://fcspyecxcukhwgzcyqog.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do painel do Supabase (Settings → API) |
   | `ANTHROPIC_API_KEY` | sua chave — opcional, só a leitura de print depende dela |
   | `ANTHROPIC_MODEL` | `claude-sonnet-5` |

5. **Deploy.** Sai uma URL tipo `funilmilionario-algo.vercel.app`.

> **Região.** O `vercel.json` do repositório fixa as funções em `gru1`
> (São Paulo), do lado do banco. Sem isso elas rodariam nos EUA por padrão e
> cada consulta atravessaria o continente — abrir um funil faz várias consultas,
> então a lentidão apareceria. Se a sua conta reclamar da região, troque em
> **Settings → Functions → Region** para a mais próxima disponível.

### 2. Configurar o Supabase (antes de testar)

Sem este passo o cadastro não completa. Painel:
https://supabase.com/dashboard/project/fcspyecxcukhwgzcyqog

Em **Authentication → URL Configuration**:

- **Site URL**: a URL da Vercel que acabou de sair
- **Redirect URLs**: `https://<sua-url>.vercel.app/auth/callback`

Em **Authentication → Providers → Email**, decida sobre a confirmação de e-mail:

- **Desligada** — entra na hora. É o que eu faria para este primeiro teste.
- **Ligada** — o app já trata (mostra "Confirme seu e-mail" e o link cai em
  `/auth/callback`), mas o envio padrão do Supabase é limitado a poucos e-mails
  por hora. Para uso real, configure SMTP próprio.

### 3. Testar na URL da Vercel

Passe o checklist do fim deste arquivo **antes** de encostar no domínio. Se
alguma coisa quebrar, você sabe que é o app — não DNS.

### 4. Só então apontar o subdomínio

Na Vercel, **Settings → Domains**, adicione
`funilmilionario.voltaregestao.com.br`.

No hPanel da Hostinger, em **Domínios → `voltaregestao.com.br` → Zona DNS**, crie:

| Tipo | Nome | Aponta para | TTL |
|---|---|---|---|
| `CNAME` | `funilmilionario` | `cname.vercel-dns.com` | padrão |

No campo "Nome" vai só `funilmilionario`, não o endereço inteiro — a Hostinger
completa o resto. Por ser subdomínio é CNAME, não registro `A`: o domínio
principal `voltaregestao.com.br` continua apontando para onde já aponta,
intocado.

Propaga em minutos, às vezes horas. O HTTPS a Vercel emite sozinha.

**Depois que o domínio funcionar, volte no Supabase** e troque a Site URL e a
Redirect URL para o endereço definitivo — senão o link de confirmação continua
mandando para a URL provisória.

---

## Caminho B — VPS da Hostinger (tudo num lugar só)

Use este se você tem VPS. Aí não entra serviço nenhum de fora: app e domínio na
Hostinger. Em troca, atualização de sistema, renovação de certificado e reinício em caso
de queda passam a ser seus.

O `Dockerfile` do repositório já está pronto.

```bash
# no VPS
git clone <repo> && cd Funilmilionario
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://fcspyecxcukhwgzcyqog.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key> \
  -t gd-funnel .
docker run -d --restart unless-stopped -p 3000:3000 \
  -e ANTHROPIC_API_KEY=<sua-chave> \
  --name gd-funnel gd-funnel
```

Falta um nginx na frente fazendo proxy para a porta 3000 e o certificado via certbot,
mais o apontamento do subdomínio como registro `A` para o IP do VPS. **Se for por aqui,
me avise que eu escrevo essa parte** — não deixei pronto porque depende do IP e do
sistema do seu VPS.

> As `NEXT_PUBLIC_*` são embutidas no bundle do navegador **em tempo de build**.
> Passar só no `docker run` não funciona — por isso elas são `--build-arg`.

---

## Configuração do Supabase antes do primeiro acesso real

Essa parte vale para os dois caminhos e **sem ela o cadastro não funciona direito**.

Painel: https://supabase.com/dashboard/project/fcspyecxcukhwgzcyqog

### Authentication → URL Configuration

- **Site URL**: `https://funilmilionario.voltaregestao.com.br`
  (enquanto estiver testando na URL da Vercel, use a URL da Vercel aqui)
- **Redirect URLs**: adicione
  - `https://funilmilionario.voltaregestao.com.br/auth/callback`
  - a URL de teste, se houver: `https://algo.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (para desenvolvimento)

Sem isso, o link de confirmação do e-mail leva pro lugar errado e a conta fica
confirmada mas sem login.

### Authentication → Providers → Email

Decida se quer **confirmação de e-mail**:

- **Ligada** (padrão): mais seguro, e o app já trata — mostra "Confirme seu e-mail"
  e o link cai em `/auth/callback`. O envio padrão do Supabase é limitado a poucos
  e-mails por hora; para uso real, configure SMTP próprio.
- **Desligada**: entra na hora. Bom para testar rápido com você mesmo.

---

## Checklist de fumaça depois do deploy

1. Abrir a URL → cai no login.
2. Criar conta → entra (ou pede confirmação, conforme a configuração).
3. Criar um funil.
4. Arrastar **Landing Page** pro canvas → aparece o aviso de tarefa criada.
5. Ir em **Tarefas** → "Conferir dados da Landing Page" está lá, vencendo em 3 dias.
6. Arrastar **WhatsApp**, ligar uma na outra.
7. Lançar números na LP (1240 visitantes, 228 leads) → o card mostra 18,4%.
8. Lançar 180 conversas no WhatsApp → a linha entre as duas mostra **79%**.
9. Adicionar **Oferta** com preço 29,90, ligar no WhatsApp.
10. Clicar em **Simular** → a barra de baixo mostra vendas, receita, CAC e ROAS.
11. Recarregar a página → tudo continua lá.
12. Só se tiver `ANTHROPIC_API_KEY`: jogar um print do Instagram numa etapa e
    conferir se os números chegam preenchidos.

Se o passo 5 falhar, o problema é a tarefa automática. Se o 8 falhar, é a taxa de
passagem. Se o 11 falhar, é salvamento — os três têm código separado, então a
falha já diz onde olhar.
