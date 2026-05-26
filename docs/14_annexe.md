# Annexes

This appendix gathers a short technical reference that supports the body of the report.

- **Annex A** — Glossary and acronyms
- **Annex B** — Repository structure
- **Annex C** — Server environment variables
- **Annex D** — Main REST routes
- **Annex E** — How to run the project locally

---

## Annex A — Glossary and acronyms

| Term | Definition |
|------|------------|
| **API** | HTTP endpoints exposed by the Express backend. |
| **RAG** | Retrieval-Augmented Generation — pattern used by the PDF assistant. |
| **LLM** | Large Language Model (Groq, OpenAI, Hugging Face). |
| **JWT** | JSON Web Token — signs and authenticates API requests. |
| **TOTP** | Time-based One-Time Password — second factor (Speakeasy). |
| **ORM** | Sequelize maps JavaScript models to PostgreSQL tables. |
| **SPA** | Single-Page Application — the React 19 client. |
| **SaaS** | OmniLearn delivery model (Free / Pro / Institution). |

---

## Annex B — Repository structure

```
OmniLearn/
├── Client/      React 19 + Vite single-page application
├── Server/      Node.js + Express 5 REST + Socket.IO API
└── docs/        End-of-studies report (Markdown)
```

---

## Annex C — Server environment variables

| Group | Variable | Purpose |
|-------|----------|---------|
| Core | `PORT`, `NODE_ENV` | HTTP port and environment |
| Database | `DATABASE_URL` | PostgreSQL connection |
| Auth | `JWT_SECRET`, `BCRYPT_ROUNDS` | Token signing and password hashing |
| Mail | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Nodemailer transactional mail |
| Storage | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | File uploads |
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe Checkout |
| AI | `GROQ_API_KEY`, `OPENAI_API_KEY`, `CHROMA_URL` | LLM providers and vector store |

A template is available in `Server/.env.example`.

---

## Annex D — Main REST routes

| Mount point | Scope |
|-------------|-------|
| `/api/auth` | Sign-up, sign-in, password reset, Google OAuth, 2FA |
| `/api/users` | Profile and account |
| `/api/stripe` | Checkout sessions and webhook |
| `/api/messages` | Conversations and messages |
| `/api/submissions` | Code submissions and AI feedback |
| `/api/pdf` | PDF upload and RAG querying |
| `/api/roadmap` | AI roadmap generation |

All protected routes expect the header `Authorization: Bearer <jwt>`.

---

## Annex E — How to run the project locally

Prerequisites: Node.js >= 20, PostgreSQL >= 14, Chroma DB running on `http://127.0.0.1:8000`, and a filled `Server/.env`.

```bash
cd Server && npm install && npm run dev
cd Client && npm install && npm run dev
```

---
