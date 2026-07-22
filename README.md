# OAB Questões

Aplicação em Next.js para estudar questões de exames anteriores da OAB.

## Desenvolvimento

```bash
npm install
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

## Comandos

- `npm run dev`: inicia o ambiente de desenvolvimento.
- `npm run build`: gera a versão de produção.
- `npm run start`: inicia a versão de produção já gerada.
- `npm run lint`: verifica a qualidade do código.
- `npm run typecheck`: verifica os tipos TypeScript.

## Estado atual

- O acervo de questões está em `app/questions-data.ts`.
- Respostas, favoritos e progresso ficam no `localStorage` do navegador.
- Nenhum banco de dados, autenticação, pagamento ou provedor de hospedagem está configurado.

Vercel, Neon e AbacatePay podem ser adicionados quando os requisitos dessas integrações estiverem definidos.
