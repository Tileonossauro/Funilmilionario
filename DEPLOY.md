# DEPLOY.md — colocar no ar

## Antes de escolher onde hospedar: o que este app precisa

Não é um site estático. Ele precisa de **Node.js rodando no servidor**, porque usa:

- Server Components e Server Actions (todo o salvamento passa por aí);
- middleware de autenticação (renova a sessão a cada request);
- a rota `/api/extract`, que é onde a chave da Anthropic vive — ela **tem** que
  ficar no servidor.

Hospedagem compartilhada tradicional (a de PHP/WordPress, com cPanel ou hPanel)
**não roda isso**. Não é preferência: sem processo Node, o app simplesmente não sobe.

Então a pergunta não é "Hostinger ou não", é **onde roda o Node**. O domínio pode
continuar na Hostinger de qualquer jeito — é só apontar o DNS.

---

## Caminho A — plataforma gerenciada + domínio na Hostinger (recomendado)

O app roda na Vercel (de graça no plano Hobby, feita pelo time do Next.js), e o seu
domínio da Hostinger aponta pra lá. Você continua dono do domínio, comprando e
renovando onde já compra.

### 1. Subir o app

1. Em [vercel.com](https://vercel.com), **Add New → Project** e importe o
   repositório `Tileonossauro/Funilmilionario`.
2. Branch: `claude/gd-funnel-builder-agent-9jjw38` (ou mescle na `main` antes).
3. Variáveis de ambiente:

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://fcspyecxcukhwgzcyqog.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do painel do Supabase |
   | `ANTHROPIC_API_KEY` | sua chave (opcional — sem ela só a leitura de print desliga) |
   | `ANTHROPIC_MODEL` | `claude-sonnet-5` |

4. Deploy. Sai uma URL tipo `algo.vercel.app` — **já dá pra testar por aqui**,
   antes de mexer em domínio nenhum.

### 2. Apontar o domínio da Hostinger

Na Vercel, em **Settings → Domains**, adicione seu domínio. Ela mostra os
registros. No hPanel da Hostinger, em **Domínios → DNS / Nameservers**:

| Tipo | Nome | Valor |
|---|---|---|
| `A` | `@` | o IP que a Vercel mostrar |
| `CNAME` | `www` | `cname.vercel-dns.com` |

Propaga em minutos (às vezes algumas horas). O HTTPS a Vercel emite sozinha.

---

## Caminho B — VPS da Hostinger

Funciona, e o `Dockerfile` do repositório está pronto. Você passa a cuidar de
atualização de sistema, renovação de certificado e reinício em caso de queda.

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

Falta ainda um nginx na frente fazendo proxy para a porta 3000 e o certificado
via certbot. Se for por aqui, eu escrevo essa parte.

> As `NEXT_PUBLIC_*` são embutidas no bundle do navegador **em tempo de build**.
> Passar só no `docker run` não funciona — por isso elas são `--build-arg`.

---

## Configuração do Supabase antes do primeiro acesso real

Essa parte vale para os dois caminhos e **sem ela o cadastro não funciona direito**.

Painel: https://supabase.com/dashboard/project/fcspyecxcukhwgzcyqog

### Authentication → URL Configuration

- **Site URL**: a URL de produção (ex.: `https://seudominio.com.br`)
- **Redirect URLs**: adicione
  - `https://seudominio.com.br/auth/callback`
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
