# OmniLearn — Presentation Speech (Speaker Notes)

> Final-year project defense script, in English, customised to **OmniLearn**.
> One section per slide, in presentation order. Read these as what you say out
> loud while each slide is on screen.

---

## Slide 1 — Introduction

Good morning, ladies and gentlemen of the jury.

Before I begin, I would like to thank you for agreeing to evaluate this work, and I would also like to thank my supervisors, Mrs. Azza and Mr. Mohamed, for their help and support throughout this project.

First of all, let me introduce myself. I am Nour Elhouda Degachi, and I have the honor today of presenting my final-year project, titled: **OmniLearn — a multi-tenant learning platform for coding education with integrated AI tutoring**.

To do so, I will follow the outline below.

## Slide 2 — Outline

We will begin with the **project context** and the **problem statement**, followed by the **proposed solution**.

Next, I will move on to the **modeling and architecture** part.

Then I will present the **main interfaces and features** of the application — in particular its AI capabilities.

And, of course, this presentation will close with a **summary and future perspectives**.

## Slide 3 — Project Context

Let's start by presenting the context of the project.

Learning to program is one of the hardest paths a student can take. Today's options are split between two extremes: static problem catalogues like LeetCode that give you exercises but no real guidance, and AI assistants like ChatGPT that simply hand over the answer — which teaches the student nothing.

At the same time, schools and institutions lack a single platform where teachers can run their own coding classes, assign problems, monitor progress, and teach live, while keeping their content and their students isolated from other institutions.

OmniLearn was built to bring these worlds together in one place.

## Slide 4 — The Field / Domain

Our project sits at the intersection of three domains: **online code education**, **collaborative real-time learning**, and **applied artificial intelligence**.

A coding-education platform is more than a list of exercises. It needs a real code editor, sandboxed execution to run and grade submissions, a way for teachers to organize their classes, and — increasingly — an AI layer that can tutor, generate problems, and personalise the learning path for each student.

OmniLearn is a web platform that delivers all of this through a single browser experience.

## Slide 5 — Study of the Existing Solutions

After studying the existing solutions, we identified a number of gaps and limitations:

- **Problem catalogues** (LeetCode, HackerRank) offer exercises but no personalised guidance and no classroom management.
- **Generic AI assistants** give away the full solution, so the student never actually learns.
- **Learning Management Systems** (Moodle, Google Classroom) handle courses and grades but were never designed for live coding or auto-graded programming exercises.
- None of these tools combine **classroom management**, a **real code editor**, and **grounded AI tutoring** in a single multi-tenant product.

## Slide 6 — Problem Statement

This leaves us with a clear problem statement:

How can we build a single platform that lets students practise programming with **AI guidance that teaches instead of solving**, lets teachers **run and supervise their own classes**, and keeps every institution's data **isolated and secure** — all while remaining **affordable and scalable**?

That question is what OmniLearn answers.

## Slide 7 — Transition to the Solution

So, in order to properly address these limitations, we designed our solution.

## Slide 8 — Proposed Solution

**OmniLearn** is a multi-tenant learning platform for coding education.

Students solve algorithmic problems in a real code editor, get **AI tutoring that guides them without handing over the answer**, follow a **personalised learning roadmap**, chat with their teachers in real time, and study from their **own PDFs** with an AI assistant that grounds every answer in the document.

Teachers can fork the global problem catalogue into their own classroom, run **live coding sessions** — with exam mode and identity masking — and assign problems with deadlines.

Institutions and the platform super-admin manage their world from **dedicated dashboards**.

In short: one seamless platform that brings education and class management together.

## Slide 9 — Requirements

Our solution must meet the following needs:

- **Security and access control:** every user authenticates with email verification, password reset, and optional two-factor authentication (TOTP). Plan gates and role-based permissions control who can do what.
- **Multi-tenancy:** each institution gets its own isolated world — its own curriculum, members, and problem catalogue — while sharing one unified platform.
- **Coding and auto-grading:** a real code editor with sandboxed execution that runs submissions and returns a verdict.
- **AI assistance:** Socratic tutoring, AI code correction, AI problem generation, and a personalised roadmap.
- **Real-time collaboration:** live messaging and live co-editing coding sessions.
- **Billing and plans:** Free, Pro, and Institution tiers managed through Stripe.

## Slide 10 — Modeling and Architecture

In this part, we present the base architecture we followed during the implementation.

OmniLearn is a **three-tier web application**:

- a **React 19 single-page front end** built with Vite,
- a **Node.js / Express back end** with a PostgreSQL database accessed through Sequelize,
- and a dedicated **AI plane** that connects to the language model, the embeddings service, and the vector database.

Real-time features run over **Socket.IO** on top of this.

## Slide 11 — Technical Architecture Detail

Concretely, the stack is:

- **Frontend** — React 19 + Vite, React Router 7, CodeMirror 6 for the editor, React Flow for the roadmap graphs, Socket.IO client for live features, and Tailwind / DaisyUI / Ant Design for the interface.
- **Backend** — Node.js + Express 5, Sequelize over PostgreSQL, Socket.IO, JWT + bcrypt + Speakeasy for authentication and 2FA, and Stripe for billing.
- **AI plane** — the Groq SDK running `llama-3.3-70b-versatile` for completions, HuggingFace embeddings, a Chroma vector database for the PDF assistant, and LangChain as the glue.

## Slide 12 — Global Use Case Diagram

Let's start with the global use case diagram.

We have four main actors:

- A **student** browses and solves problems, uses the AI mentor and the PDF assistant, follows their roadmap, joins classes and live sessions, and chats with teachers.
- A **teacher** forks problems into their classroom, creates assignments with deadlines, runs live coding sessions, and supervises their students.
- An **institution admin** manages their curriculum — grades, specialities and levels — invites members, and oversees their institution.
- The **super-admin** manages all institutions, the global problem catalogue, the plan tiers, the ban-list, and usage statistics.

After authentication, each actor sees only the features their role allows.

## Slide 13 — Sequence Diagram: Authentication & AI Tutoring

This figure presents the sequence diagram for **AI-assisted problem solving**.

After authentication, the student opens a problem in the code editor. When they ask for help, the request goes to the AI Mentor, which streams back a **Socratic hint** — it guides the student toward the solution without revealing it. When the student submits, the code is executed in a sandbox and a verdict is returned.

## Slide 14 — Sequence Diagram: PDF Assistant (RAG)

This figure presents the sequence diagram for the **PDF Assistant**, our retrieval-augmented generation feature.

The student uploads a PDF. The document is split into chunks, each chunk is embedded, and the vectors are stored in Chroma. When the student asks a question, we embed the question, retrieve the most similar chunks, and feed them to the language model so that **every answer is grounded in the document** — not invented.

## Slide 15 — Sequence Diagram: Live Coding Session

This figure presents the sequence diagram for a **live coding session**.

The teacher starts a session and shares an invite. Students join over Socket.IO. The teacher drives a playlist of problems, and the editor state is synchronised in real time with role-based permissions. The session can switch into **exam mode** with identity masking, and a snapshot is saved when it ends.

## Slide 16 — Sequence Diagram: Classroom & Assignments

This figure presents the sequence diagram for **classroom management**.

A teacher creates a class with an invite code, posts announcements, and forks problems from the global catalogue into the class scope. They attach assignments with deadlines to modules, and students see and submit them from their classroom view.

## Slide 17 — Implementation

Now let's move on to the implementation phase.

## Slide 18 — AI Mentor & Code Correction

The heart of OmniLearn is its **AI layer**. All seven AI surfaces share a single language model — Groq's `llama-3.3-70b-versatile` — but each has its own prompt, plan gate, and output contract.

The **AI Mentor** is a Socratic tutor that streams its answers and deliberately refuses to hand over the full solution.

The **AI code correction** feature, available on the Pro plan, returns a structured JSON diff plus a corrected file that matches the problem's expected output.

## Slide 19 — AI Problem Generation & Personalised Roadmap

Two more AI surfaces support teaching and learning.

**AI problem generation** lets staff ask the model for one, three, or five fully-formed problems — each with starter code, examples, constraints, hints, and its own learning roadmap.

The **personalised roadmap** builds a 15-node, five-level pyramid for each topic, automatically enriched with relevant Stack Overflow questions, YouTube videos, official documentation, and a quiz per node — so every student gets a tailored path.

## Slide 20 — PDF Assistant (RAG Pipeline)

The **PDF Assistant** is our most advanced AI feature. It uses a full RAG pipeline: the document is chunked and embedded with HuggingFace, the vectors are stored in Chroma, and a similarity search feeds the relevant passages to the model before it answers.

Beyond chat, the assistant can summarise the document, generate quizzes, do smart search, highlight, and bookmark. And if Chroma is unreachable, it degrades gracefully to a keyword fallback so the feature keeps working.

## Slide 21 — Workspace AI & Messaging Slash Commands

The remaining AI surfaces round out the experience.

**Workspace Code AI** gives each user a personal file workspace with analyze, summarize, and quiz endpoints over their saved code.

And in **messaging**, slash commands let users pull in help inline — `/ai` for the assistant, `/stackoverflow` for relevant questions, and `/video` for tutorials — all inside a Socket.IO-backed real-time conversation.

## Slide 22 — Authentication & Security

On the security side, OmniLearn supports sign-up with email verification, password reset, and optional **TOTP two-factor authentication** using Speakeasy and QR codes.

Access is protected end to end with **JWT** tokens, passwords are hashed with **bcrypt**, and **plan gates and role middleware** enforce what each user and each tier is allowed to do.

## Slide 23 — Plans, Billing & Multi-Tenancy

OmniLearn offers three tiers — **Free, Pro, and Institution** — managed through **Stripe Checkout**. A webhook updates the user's plan, and institution onboarding runs automatically after payment.

Each institution defines its own curriculum — grades, specialities, and levels — invites its members, and keeps its data isolated, while the **super-admin** oversees all institutions, the global catalogue, the tier flags, the ban-list, and platform usage statistics.

## Slide 24 — Demonstration

At this point, I will show a short live demonstration of the platform: signing in, solving a problem with the AI mentor, uploading a PDF and asking a grounded question, and running a live coding session from the teacher's side.

## Slide 25 — Conclusion

To conclude, OmniLearn delivers what no existing tool offered in one place: a coding-education platform where **AI teaches instead of solving**, where **teachers run their own live classes**, and where **every institution stays isolated and secure** — all on an affordable, scalable, multi-tenant architecture.

## Slide 26 — Contributions

The main contributions of this project are:

- A **multi-tenant platform** where each institution customises its own instance while sharing a unified structure.
- A **real coding environment** — CodeMirror editor with sandboxed execution and auto-grading.
- **Seven distinct AI surfaces** built on one language model: Socratic mentor, code correction, problem generation, personalised roadmap, RAG PDF assistant, workspace AI, and messaging slash commands.
- **Real-time collaboration** — live messaging and live co-editing coding sessions with exam mode and identity masking.
- A complete **role and plan system** with secure authentication, 2FA, and Stripe billing.

## Slide 27 — Future Perspectives

For future work, we plan to:

- Add **machine-learning models** to analyse user behaviour and predict student performance trends.
- Expand **analytics and reporting** for teachers and institution administrators.
- Broaden language and runtime support for the code execution sandbox.
- Introduce a **mobile experience** for students on the go.

## Slide 28 — (Closing Visual)

*(Closing slide — no spoken notes; let the final visual stay on screen.)*

## Slide 29 — Thank You

Thank you for your attention.

I am now happy to answer any questions you may have.
