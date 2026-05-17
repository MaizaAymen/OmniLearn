# OmniLearn

OmniLearn is a multi-tenant learning platform for coding education. Students
solve algorithmic problems in a code editor, get AI tutoring without being
handed the answer, follow a personalised learning roadmap, chat with their
teachers in real time, and study from their own PDFs with an AI assistant
that grounds every answer in the document (RAG). Teachers can fork the
global problem catalogue into their classroom, run live coding sessions
(with exam mode and identity masking), and assign problems with deadlines.
Institutions and the platform super-admin manage their world from dedicated
dashboards.

## Tech stack

- **Frontend** — React 19 + Vite, React Router 7, CodeMirror 6 (editor),
  React Flow (roadmap graphs), socket.io-client (live messaging /
  sessions), Tailwind + DaisyUI, Ant Design components.
- **Backend** — Node.js + Express 5, Sequelize over PostgreSQL,
  Socket.IO 4, Multer for uploads, JWT + bcrypt + Speakeasy (TOTP 2FA),
  Stripe for billing.
- **AI plane** — Groq SDK (`llama-3.3-70b-versatile`) for all completions,
  HuggingFace Inference (`sentence-transformers/all-MiniLM-L6-v2`) for
  embeddings, Chroma DB for the persistent vector store, LangChain
  (`@langchain/community` + `@langchain/core`) as the glue.

## Major features

| Surface | What it does | Key files |
|---|---|---|
| Auth | Sign-up / sign-in with email verification, password reset, optional TOTP 2FA. | [authRoutes.js](Server/src/routes/authRoutes.js), [Auth.jsx](Client/src/Auth/Auth.jsx) |
| Problems | Browse / filter the global catalogue; staff can fork into a `global`, `institution`, `module` or `class` scope. | [Ai.js](Server/src/ai/Ai.js), [ProblemsPage.jsx](Client/src/Problems/ProblemsPage.jsx) |
| Code editor | CodeMirror 6 editor with sandboxed code execution and submission verdict. | [Codeeditor.jsx](Client/src/Codeeditor/Codeeditor.jsx) |
| Live coding sessions | Real-time co-editing with role-based permissions, problem playlists, mid-session mode transitions, identity masking, post-session snapshots. | [sessionHub.js](Server/src/realtime/sessionHub.js), [ProblemPage.jsx](Client/src/Problems/ProblemPage.jsx) |
| Classrooms | Teachers create classes with invite codes, post announcements, attach assignments to modules. | [ClassroomView.jsx](Client/src/Classroom/ClassroomView.jsx) |
| Messaging | Socket.IO-backed conversations with slash commands (`/ai`, `/stackoverflow`, `/video`). | [Messages.jsx](Client/src/Messaging/Messages.jsx) |
| **PDF Assistant (RAG)** | Upload a PDF and ask questions grounded in its content; also summarize, quiz, smart-search, highlight, bookmark. | [pdfRoutes.js](Server/src/routes/pdfRoutes.js), [PdfAssistant.jsx](Client/src/components/PdfAssistant.jsx) |
| **AI Mentor** | Socratic streaming tutor that refuses to hand over the full solution. | [AIMentor.jsx](Client/src/components/AIMentor.jsx) |
| **AI code correction** | Pro-only — returns a JSON diff plus a corrected file matching the problem's `expectedOutput`. | [Ai.js](Server/src/ai/Ai.js) |
| **AI problem generation** | Staff can ask the LLM for 1 / 3 / 5 fully-formed problems with per-problem learning roadmaps. | [Ai.js](Server/src/ai/Ai.js), [ProblemCreatePage.jsx](Client/src/Problems/ProblemCreatePage.jsx) |
| **Personalised roadmap** | 15-node 5-level pyramid auto-enriched with Stack Overflow questions, YouTube videos, official docs, and per-node quiz. | [RoadmapService.js](Server/src/ai/RoadmapService.js) |
| **Workspace code AI** | Per-user file workspace + analyze / summarize / quiz endpoints. | [workspaceRoutes.js](Server/src/routes/workspaceRoutes.js) |
| Plans & billing | Stripe Checkout for Pro / Institution, webhook updates `users.plan`, post-payment institution onboarding. | [stripeRoutes.js](Server/src/routes/stripeRoutes.js), [PlanSection.jsx](Client/src/components/PlanSection.jsx) |
| Institution admin | Per-institution curriculum (Grades / Specialities / Levels), invite links, member directory. | [institutionCurriculumRoutes.js](Server/src/routes/institutionCurriculumRoutes.js) |
| Super-admin | Manage institutions, global problem catalogue, Free-tier / Pro-tier flags, ban-list, usage stats. | [AdminDashboard.jsx](Client/src/Admin/AdminDashboard.jsx) |

## AI features at a glance

OmniLearn has **seven** AI surfaces. They share one LLM (Groq /
`llama-3.3-70b-versatile`) but each one has its own prompt, plan gate, and
output contract:

1. **PDF Assistant (RAG)** — embeddings + Chroma + similarity search +
   grounded completion. Pro / Institution only. Falls back to keyword
   search if Chroma is unreachable.
2. **AI Mentor** — Socratic streaming tutor over SSE.
3. **AI Code Correction** — JSON diff + corrected file. Pro only.
4. **AI Problem Generation** — full problems with starter code, examples,
   constraints, hints, and a per-problem roadmap.
5. **Personalized Roadmap** — 15-node pyramid + Stack Overflow / YouTube
   / docs / quiz enrichment.
6. **Workspace Code AI** — analyze / summarize / quiz over saved code.
7. **Messenger Slash Commands** — `/ai`, `/stackoverflow`, `/video`.

The complete deep-dive (with a four-level **C4 model** of the RAG
pipeline, the numerical defaults and the failure modes) lives in
[docs/08_chapitre6_sprint4.md §V](docs/08_chapitre6_sprint4.md).

A high-level system map plus use-case / class / sequence / activity
diagrams for the whole platform is in
[docs/11_flows_and_diagrams.md](docs/11_flows_and_diagrams.md).

## Running locally

```bash
# Backend
cd Server
npm install
# .env must define DATABASE_URL, JWT_SECRET, GROQ_API_KEY, HF_API_KEY, CHROMA_URL, …
npm run dev            # nodemon → http://localhost:5000

# Chroma DB (for the PDF assistant)
docker run -d --name omnilearn-chroma -p 8000:8000 \
  -v $(pwd)/Server/src/chroma_db:/chroma/chroma chromadb/chroma

# Frontend
cd ../Client
npm install
npm run dev            # Vite → http://localhost:5173
```

Without Chroma running, the PDF assistant still works — the chat and
smart-search routes silently degrade to a keyword fallback. See
[ai_features_and_rag.md §11](docs/ai_features_and_rag.md#11-running-rag-locally)
for the details.

## Repository layout

```
Client/        React 19 SPA (Vite)
  src/
    Admin/        Super-admin dashboards
    Auth/         Sign-in, sign-up, verify-email, password reset, institution onboarding
    Classroom/    My classrooms, classroom view, join, problems / assignments tabs
    ClassroomPdf/ Classroom-scoped PDF assistant
    Codeeditor/   CodeMirror 6 editor + output panel
    Dashbord/     Coding & learning dashboards
    Home/         Public landing page
    Messaging/    Real-time messaging + slash commands
    Problems/     Problems list, problem page, problem create
    Roadmap/      React Flow roadmap graph + node panel
    components/   Shared components — AIMentor, Profile, PdfAssistant, …
Server/        Node.js + Express API
  src/
    ai/         AI services (Ai.js, RoadmapService.js)
    chroma_db/  Persistent Chroma collections (gitignored in prod)
    config/     DB config + bootstrap
    middleware/ JWT auth, plan gates
    models/     Sequelize models + associations
    realtime/   Socket.IO hubs (messages + live sessions)
    routes/     Express routers (auth, users, admin, plan, …)
    uploads/    Multer destination for PDFs, code, index.json
docs/          Project documentation (this file + Sprint reports)
```

## License

See [LICENSE](LICENSE).
