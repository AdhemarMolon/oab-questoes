# Minha OAB

MVP de uma plataforma de estudos para a 1ª fase da OAB, construído para evoluir para um produto real sem acoplar autenticação, autorização, conteúdo e pagamentos.

## O que já está implementado

- Login obrigatório com Google OAuth via Better Auth.
- PostgreSQL no Neon com schema e migrations Drizzle.
- Acesso gratuito com exatamente um simulado e estatísticas básicas.
- Acesso completo preparado para mensal, anual, vitalício e presente.
- Simulados com lista/ordem imutáveis e respostas persistidas no servidor.
- Progresso e resultados sincronizados por conta.
- Banco de questões completo protegido pelo acesso pago.
- Área administrativa com:
  - indicadores gerais;
  - usuários paginados de 10 em 10;
  - busca e filtros por função, status, acesso e pagamento;
  - promoção, rebaixamento, suspensão e reativação;
  - concessão e revogação de acessos presente;
  - comunicados globais e segmentados;
  - CRUD de questões com exclusão lógica;
  - trilha de auditoria.
- Estrutura de billing e webhooks preparada para a futura integração AbacatePay.

## Stack

- Next.js 16 e React 19
- TypeScript
- Better Auth 1.6 com Google e plugin administrativo
- Neon Serverless + Drizzle ORM/Kit
- Zod
- Vitest

Use Node.js 22.

## Configuração local

Instale as dependências:

```bash
npm install
```

Crie o arquivo de ambiente a partir do modelo:

```powershell
Copy-Item .env.example .env
```

Preencha:

```env
DATABASE_URL=
DATABASE_URL_UNPOOLED=
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

`BETTER_AUTH_SECRET` deve ter pelo menos 32 caracteres de alta entropia. Nenhuma variável secreta deve usar o prefixo `NEXT_PUBLIC_`.

No Google Cloud, cadastre este redirect para desenvolvimento:

```text
http://localhost:3000/api/auth/callback/google
```

Em produção, cadastre também o domínio definitivo. O Google exige a URL exata e não aceita wildcard nesse redirect.

## Banco de dados

Gere uma nova migration após alterar o schema:

```bash
npm run db:generate
```

Aplique as migrations:

```bash
npm run db:migrate
```

Importe matérias, exames, as 400 questões atuais e os cinco simulados iniciais:

```bash
npm run db:seed
```

As questões do arquivo legado são importadas com `verificationStatus = UNVERIFIED`. Elas podem ser publicadas para uso inicial, mas não devem ser apresentadas como conteúdo oficialmente conferido até que cada fonte seja validada no painel.

O seed é idempotente: uma execução posterior não sobrescreve edições feitas pelo administrador.

## Primeiro administrador

1. Inicie a aplicação e faça login uma vez com o Google.
2. Promova explicitamente a conta pelo e-mail:

```bash
npm run admin:promote -- seu-email@exemplo.com
```

3. Faça login novamente.

Nenhum cadastro se torna administrador automaticamente.

## Desenvolvimento

```bash
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`.

Comandos de validação:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Regras centrais do domínio

- `role` (`user` ou `admin`) controla administração; nunca libera conteúdo pago.
- `access_grants` é a fonte da autorização de produto.
- `SUBSCRIPTION` e `PURCHASE` contam como pagantes; `GIFT` e `ADMIN` não contam.
- O benefício gratuito é protegido por índice único parcial no banco, evitando duas liberações simultâneas.
- Uma tentativa captura o texto, opções, gabarito e ordem das questões no momento da criação.
- Exclusão de questão é lógica; tentativas antigas mantêm seus snapshots.
- Mudanças sensíveis revogam sessões e geram registros de auditoria.
- O frontend nunca decide função, entitlement, gabarito ou pontuação.

## Pagamentos

O checkout real ainda não está ativo porque preços e regras comerciais serão definidos depois. O schema já separa:

- pedidos;
- assinaturas;
- eventos de webhook idempotentes;
- grants de assinatura/compra;
- grants de presente/administração.

Quando a AbacatePay for conectada, o webhook validado deve atualizar billing e grants no servidor. O navegador nunca poderá conceder acesso diretamente.

## Deploy futuro

- Aplicação: Vercel
- Banco: Neon
- Pagamentos: AbacatePay

Antes do deploy, configure as mesmas variáveis na Vercel, aplique a migration no Neon e use um domínio estável para o redirect do Google.
