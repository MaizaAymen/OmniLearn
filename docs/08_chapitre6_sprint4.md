# Chapter 6 — Sprint 4

## I. Introduction

In this chapter — after the elaboration of Sprint 3 features — we precisely expose all the phases needed to realize the **final sprint** of OmniLearn.

## II. Sprint Objectives

Sprint 4 wraps the platform with the **AI tutor** and the full **multi-tenant administration** layer:

- The **PDF assistant** (`PdfAssistant.jsx`, `ClassroomPdf.jsx`) — upload a course PDF, ingest it into a Chroma vector store, and chat with an LLM grounded in the PDF (RAG). Built on `@langchain/community`, `@langchain/openai`, `chromadb`, `pdf-parse`, with optional `groq-sdk` / `@huggingface/inference` providers.
- The **AI Mentor** sidebar (`AIMentor.jsx`) — a general-purpose AI tutor that can reference the student's roadmap, problems and recent submissions.
- The **Institution onboarding** flow (`OnboardInstitution.jsx`) — name, slug, logo, and the first super-user becoming `institution_admin`.
- **Invite links** (`InviteLink` model) used by an institution admin to enroll teachers / students at a specific role (`JoinInstitution.jsx`).
- The **Institution Admin console** — directory of members, role management, per-institution curriculum management (Grades / Specialities / Levels) through `institutionCurriculumRoutes.js`.
- The **Super Admin console** (`AdminDashboard.jsx`) — manage all institutions, manage problems globally, manage Free-tier / Pro-tier flags (`FreeTierTab`, `ProTierTab`), and view "users by plan" overview (`UsersByPlanTab`, `UsersByPlanOverview`).
- The **Stripe** end-to-end flow for both the Pro plan and the Institution plan (`stripeRoutes.js`, `PlanSection.jsx`).

## III. Sprint 4 Backlog

### Table 8 — Sprint 4 Backlog

| PBI | Main functionality | US Code | User story | Task ID | Tasks |
|---|---|---|---|---|---|
| **PDF Assistant — RAG** | | | | | |
| 15 | Upload & ingest a PDF | US15.1 | As a student, I want to upload a course PDF. | 15.1 | Build `PdfAssistant.jsx` with drag-and-drop. |
| | | | | 15.2 | `POST /api/pdf/upload` stores the file (Multer + Cloudinary). |
| | | | | 15.3 | Server extracts text (`pdf-parse`) and splits into chunks. |
| | | | | 15.4 | Embeddings indexed in Chroma DB via `Server/src/ai/vectorStore.js`. |
| | US15.2 | As a student, I want to chat with the AI grounded in that PDF. | 15.5 | `POST /api/pdf/ask` runs a RAG chain with LangChain. |
| | | | | 15.6 | Stream the answer back to the chat UI. |
| **AI Mentor** | | | | | |
| — | Cross-feature AI tutor | — | As a student, I want an AI mentor that knows my roadmap and submissions. | M.1 | Build `AIMentor.jsx`. |
| | | | | M.2 | `POST /api/ai/mentor` injects user context into the LLM prompt. |
| **Institution Onboarding** | | | | | |
| 24 | Onboard an institution | US24.1 | As a new Institution buyer, I want to onboard my institution. | 24.1 | Build `OnboardInstitution.jsx`. |
| | | | | 24.2 | `POST /api/plan/institution` creates `Institution` + assigns the user as `institution_admin`. |
| | | | | 24.3 | Update `Guard` in `App.jsx` to redirect to onboarding if `plan==='institution' && !institutionId`. |
| **Invite Links** | | | | | |
| 25 | Generate invite links | US25.1 | As an institution admin, I want to generate invite links. | 25.1 | Implement `InviteLink` model with `role`, `expiresAt`, `maxUses`. |
| | | | | 25.2 | `POST /api/plan/invite-links`. |
| | US25.2 | As an institution admin, I want to revoke a link. | 25.3 | `DELETE /api/plan/invite-links/:id`. |
| 26 | Join via invite link | US26.1 | As a visitor, I want to join via the invite link. | 26.1 | Build `JoinInstitution.jsx` at `/join-institution/:token`. |
| | | | | 26.2 | `POST /api/plan/join-institution` validates the token, links the user to the institution and sets the role. |
| **Institution Curriculum** | | | | | |
| 27 | Per-institution curriculum | US27.1 | As an institution admin, I want to manage Grades / Specialities / Levels for my institution. | 27.1 | CRUD endpoints in `institutionCurriculumRoutes.js`. |
| | | | | 27.2 | Build `InstitutionTab.jsx` and its forms. |
| **Institution Member Directory** | | | | | |
| 35 | List members | US35.1 | As an institution admin, I want to see all members of my institution. | 35.1 | `GET /api/admin/institution/members` filters by `institutionId`. |
| | | | | 35.2 | Display the directory in `InstitutionTab.jsx`. |
| **Super Admin** | | | | | |
| 28 | Super Admin sign-in | US28.1 | As a super admin, I want to access the super admin dashboard. | 28.1 | Add a guard for `role === "admin"` on `/education`. |
| 29 | Manage institutions | US29.1 | As a super admin, I want to list / suspend institutions. | 29.1 | `GET /api/admin/institutions` and suspend / delete actions. |
| 31 | Ban / unban users | US31.1 | As a super admin, I want to ban or unban users. | 31.1 | `PATCH /api/admin/users/:id { isActive }`. |
| 32 | Statistics | US32.1 | As a super admin, I want global statistics. | 32.1 | Build `UsersByPlanOverview.jsx` and `UsersByPlanTab.jsx` (charts with `@ant-design/plots`). |
| **Plans (Stripe)** | | | | | |
| 33 | Stripe checkout — Pro / Institution | US33.1 | As a Free user, I want to upgrade to Pro. | 33.1 | `POST /api/stripe/checkout-pro`. |
| | US33.2 | As an organization, I want to upgrade to Institution. | 33.2 | `POST /api/stripe/checkout-institution`. |
| | | | | 33.3 | Stripe webhook updates `users.plan` and triggers institution onboarding. |
| **Notifications** | | | | | |
| 22 | In-app notifications | US22.1 | As a user, I want notifications for messages, assignments and grades. | 22.1 | `Notification` model + `notificationRoutes.js`. |
| | | | | 22.2 | Real-time push via Socket.IO. |

## IV. Design

### 1. Use-Case Diagrams

#### Super Admin side

> *Figure 53 — Use-case diagram of Sprint 4 — Super Admin side.*

#### Institution Admin side

> *Figure 54 — Use-case diagram of Sprint 4 — Institution Admin side.*

#### Student side — AI features

> *Figure 55 — Use-case diagram of Sprint 4 — Student (AI features).*

### 2. Sequence Diagrams

#### 2.1. Sequence diagram — "Ask a question to the PDF assistant"

The student opens `PdfAssistant.jsx`, uploads a PDF and types a question. The frontend calls `POST /api/pdf/ask`. The backend retrieves the top-k relevant chunks from Chroma DB (`vectorStore.js`), builds a RAG prompt with the chunks as context, calls the LLM provider (Groq / OpenAI), streams the answer back. The frontend renders the streamed tokens in the chat.

> *Figure 56 — Sequence diagram "Ask the PDF assistant".*

#### 2.2. Sequence diagram — "Join an institution via invite link"

A visitor opens the invite URL `/join-institution/:token`. `JoinInstitution.jsx` calls `GET /api/plan/invite-links/:token` to display the institution and the assigned role. After signup or login, the user calls `POST /api/plan/join-institution`. The backend validates the token, checks `expiresAt` and `maxUses`, and updates the user with `institutionId` + the role from the token (`teacher` or `student`). The frontend redirects to the dashboard.

> *Figure 57 — Sequence diagram "Join an institution via invite link".*

### 3. Activity Diagrams

#### 3.1. Activity diagram — "Ban a user"

The super admin opens the users-by-plan tab, picks a user and clicks "Ban". A confirmation modal appears. On confirm, the frontend sends `PATCH /api/admin/users/:id { isActive: false }`. All active sessions for that user are revoked at the next request via middleware.

> *Figure 58 — Activity diagram "Ban a user".*

#### 3.2. Activity diagram — "Onboard a new institution"

When the Stripe webhook detects a successful Institution checkout, it flips the user's `plan` to `institution`. The next time the user reaches a guarded route, `Guard` detects `plan === "institution" && !institutionId` and redirects to `/onboarding/institution`. The user fills the form, the backend creates the `Institution` and sets the user's `institutionId` and `role = institution_admin`.

> *Figure 59 — Activity diagram "Onboard a new institution".*

### 4. Class Diagram

Sprint 4 adds:

- `Institution` — `id`, `name`, `slug`, `logoUrl?`, `plan`, `createdAt`.
- `InviteLink` — `id`, `institutionId`, `token`, `role`, `expiresAt`, `maxUses`, `usedCount`.
- Per-institution `Grade` / `Speciality` / `Level` — same schema as Sprint 3, but with `institutionId` nullable (null = global template owned by the super admin).
- `Notification` (already defined) used across PDF assistant, classrooms and messaging.

> *Figure 60 — Class diagram of Sprint 4.*

## V. Implementation

### 1. PDF Assistant

The PDF assistant page lets the student drag a PDF, ingest it and ask questions grounded in its content. The answer references the page numbers it came from.

> *Figure 61 — PDF assistant — upload and chat view.*
> *Figure 62 — PDF assistant — answer with grounded citations.*

### 2. Classroom PDF

`ClassroomPdf.jsx` is a variant of the PDF assistant scoped to a classroom's lesson PDF, so all students of the same class share a common knowledge base.

> *Figure 63 — Classroom PDF assistant.*

### 3. AI Mentor

`AIMentor.jsx` is a sidebar that follows the student across pages — it can answer general questions, explain a problem, suggest the next roadmap step, etc.

> *Figure 64 — AI Mentor side panel.*

### 4. Institution onboarding

After upgrading to the Institution plan, the user is redirected to `/onboarding/institution` to register the institution.

> *Figure 66 — Institution onboarding form.*

### 5. Invite links

The institution admin generates invite links scoped to a target role (teacher or student), with an expiration date and a maximum number of uses.

> *Figure 67 — Invite-link generation form.*
> *Figure 68 — Public "Join institution" page (`JoinInstitution.jsx`).*

### 6. Institution Admin console

The institution-admin tabs show the member directory, the per-institution curriculum (Grades / Specialities / Levels), the institution's classes, and basic statistics.

> *Figure 69 — Institution member directory (`InstitutionTab.jsx`).*
> *Figure 70 — Per-institution curriculum management.*

### 7. Super Admin console

The super admin dashboard centralizes the management of institutions, the global problem catalogue, the Free-tier / Pro-tier flags, the ban / unban actions and the platform statistics.

> *Figure 71 — Super admin dashboard.*
> *Figure 72 — Users-by-plan overview (charts).*
> *Figure 73 — Free-tier management tab.*
> *Figure 74 — Pro-tier management tab.*
> *Figure 75 — Module assignments management.*

### 8. Pricing / Plan section

The `PlanSection` component shows the three plans side-by-side with Stripe Checkout CTAs.

> *Figure 76 — Pricing / Plan section with Stripe upgrade buttons.*

## VI. Conclusion

In this last chapter we added several major features. The PDF assistant lets students ask questions grounded in their own course material; the AI Mentor follows them across the app; institution onboarding and invite links enable schools to bring their entire community under one roof; and the super-admin and institution-admin consoles round off the multi-tenant administration of the platform.

---
