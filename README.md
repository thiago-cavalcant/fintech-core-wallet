# 🏦 Fintech Core Wallet & Ledger API

Plataforma financeira de carteira digital desenvolvida com **NestJS**, **Next.js**, **PostgreSQL**, **Prisma ORM** e **Redis**. O sistema segue princípios contábeis rigorosos com **Double-Entry Ledger (Partidas Dobradas)**, controle de concorrência com **Locks Distribuídos** e garantia de **Idempotência**.

---

## 🛠️ Tecnologias Utilizadas

* **Back-end:** NestJS, TypeScript, Prisma ORM, Redis (ioredis), Helmet, Throttler / Rate Limiting, Swagger / OpenAPI, Bcrypt, JWT.
* **Front-end:** Next.js (App Router), React, Tailwind CSS, Lucide Icons, Axios.
* **Infraestrutura & Banco de Dados:** PostgreSQL 16 e Redis Alpine orquestrados via Docker Compose.

---

## 🏛️ Decisões de Arquitetura & Engenharia

* **Double-Entry Ledger (Partidas Dobradas):** O saldo do usuário não é um campo mutável direto no banco. Ele é derivado matematicamente da soma histórica de lançamentos de `CREDIT` e `DEBIT`, garantindo auditabilidade contábil estrita.
* **Transações Atômicas (ACID):** Todas as transferências são executadas via `$transaction` do Prisma. Em caso de falha no débito ou crédito, toda a operação sofre rollback imediato.
* **Idempotência com Redis:** Evita execução duplicada de transferências através do cabeçalho `x-idempotency-key`. Requisições repetidas retornam a resposta cacheada (TTL de 24h) sem novos débitos.
* **Locks Distribuídos:** Bloqueio temporário via Redis na carteira do remetente durante a transferência para mitigar condições de corrida (*race conditions*).
* **Segurança Reforçada:**
  * Proteção de cabeçalhos HTTP com **Helmet**.
  * **Rate Limiting** global e proteção estrita contra força bruta na autenticação.
  * Validação de DTOs com **Class-Validator** (bloqueio de payload pollution).
  * **Global Exception Filter** para sanitização de erros internos e stack traces.

---

## 🚀 Como Executar o Projeto

### 1. Clonar o repositório
```bash
git clone [https://github.com/thiago-cavalcant/fintech-core-wallet.git](https://github.com/thiago-cavalcant/fintech-core-wallet.git)
cd fintech-core-wallet