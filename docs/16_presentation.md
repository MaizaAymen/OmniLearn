# Defense Presentation — OmniLearn

This file holds the full slide-by-slide text of the OmniLearn defense presentation
(built in Canva from the academic "Code Cooperation" template, 29 slides).

- **Canva (edit):** https://www.canva.com/design/DAHLMOfDsuQ/edit
- **Title:** Intelligent Education Platform — OmniLearn
- **Author:** Aymen MAIZA · **Academic Year:** 2025 / 2026

> For the **Problematic** and **Solution** slides, two versions are kept:
> the **hard (technical) text — before editing**, and the **simple text — final (in the deck)**.

---

## Slide 1 — Title

- Ministry of Higher Education and Scientific Research
- General Directorate of Technological Studies
- Higher Institute of Technological Studies
- Department of Computer Technology
- **End of Studies Project**
- In order to obtain a Bachelor's Degree in Information Technologies — Speciality: Information Systems Development
- **INTELLIGENT EDUCATION PLATFORM**
- Realized by: **Aymen MAIZA**
- Supervised by: *[Academic Supervisor]* — Academic Supervisor · *[Company Supervisor]* — Professional Supervisor
- Academic Year: **2025 / 2026**

## Slide 2 — Plan

1. General Context
2. Problematic
3. Solution
4. Conceptual Specification
5. Implementation
6. Conclusion

## Slide 3 — Section divider: General Context

## Slide 4 — Introduction · Host Organization

- Custom Web Development
- Mobile App Development (iOS & Android)
- AI / LLM Integrations
- Custom Information Systems

## Slide 5 — Section divider: Problematic

## Slide 6 — Problematic

### Hard text — before editing (technical)

- Fragmented tools: judge, LMS, chat, video, AI
- No AI tutor grounded in course material
- Generic AI hallucinates course content
- No multi-tenant model for institutions
- Rigid tracks, no goal-based roadmap
- High cognitive cost, scattered progress

### Simple text — final (in the deck)

- Too many separate apps to learn
- AI tutors don't know your course
- Generic AI often gives wrong answers
- Schools can't have their own space
- Same path for everyone, not personal
- Hard to follow your own progress

## Slide 7 — Section divider: Solution

## Slide 8 — Solution · OmniLearn

### Hard text — before editing (technical)

> Headline: **OmniLearn**
> Tagline: *Learning, coding and collaboration in one seamless, AI-powered platform.*

- In-browser multi-language code editor with run & submit
- Problem catalogue (Free & Pro) with automated evaluation
- Virtual classrooms, assignments, messaging & PDF assistant
- AI mentor and personalized AI-generated roadmaps

### Simple text — final (in the deck)

> Headline: **OmniLearn**
> Tagline: *Learn, code, and work together in one smart platform.*

- Write and run code in your browser
- Practice problems that are checked for you
- Online classes, chat, and a PDF helper
- An AI guide and a study plan made for you

## Slide 9 — Proposed Solution (feature ladder)

- Security & Authentication
- Code Practice & Problems
- Virtual Classrooms
- AI Help (PDF Helper & Guide)
- Personalized Roadmaps
- Real-time Communication

## Slide 10 — Section divider: Conceptual Specification

## Slide 11 — Actors

- **Super Admin:** Manage Profile · Manage Institutions · Global Problem Catalogue · Ban / Unban Users · View Statistics
- **Institution Admin:** Manage Profile · Onboard Institution · Invite Links · Define Curriculum · Member Directory
- **Teacher:** Manage Profile · Create Classes & Courses · Create Assignments · Grade Submissions · Announcements
- **Student:** Manage Profile · Solve Problems · Join Classrooms · PDF Assistant & AI Mentor · Follow Roadmap · Real-time Chat
- **Visitor:** Browse Landing Page · Sign Up · Verify Email · Choose a Plan

## Slide 12 — Use-Case Diagram

*(UML use-case diagram — image to be inserted; see [11_flows_and_diagrams.md](./11_flows_and_diagrams.md))*

## Slide 13 — Sequence Diagram · Authenticate (Sign in + 2FA)

## Slide 14 — Sequence Diagram · Ask PDF Assistant (RAG)

## Slide 15 — Sequence Diagram · Generate Roadmap

## Slide 16 — Class Diagram

*(UML class diagram — image to be inserted; see [11_flows_and_diagrams.md](./11_flows_and_diagrams.md))*

## Slide 17 — Section divider: Implementation

## Slide 18 — Technologies · AI Retrieval Approach

- **Keyword Search:** Plain keyword matching over PDF text missed semantically related passages and returned irrelevant chunks
- **Embeddings + Similarity:** Vector embeddings with similarity search improved relevance, but a cold vector store could block answers
- **RAG + Fallback (Final):** Chroma similarity search with a keyword-overlap fallback balances relevance, speed and reliability

## Slide 19 — Technologies (table)

| Category | Tools / Technologies | Purpose |
|---|---|---|
| OS & IDE | Windows 10, Visual Studio Code | Development Environment |
| Versioning | Git, GitHub | Version control |
| Frontend | React 19, Vite, Tailwind, CodeMirror | Web UI & code editor |
| Backend | Node.js, Express 5, Socket.IO | API & realtime |
| Database | PostgreSQL, Sequelize, Chroma DB | Relational + vector storage |
| Infrastructure | Cloudinary, Docker | Media hosting, containers |
| AI & NLP | Groq LLM, HuggingFace, LangChain | RAG, AI mentor, roadmap |
| Authentication | JWT, bcrypt, 2FA, Google OAuth | Secure user sessions |
| Payments | Stripe, Nodemailer | Plans & transactional email |
| Testing | Postman | API Testing |
| Modeling | StarUML | UML Diagrams |

## Slide 20 — Technologies (feature blocks)

- Authentication & Security
- Real-time Communication
- AI Plane (RAG + Mentor)
- Multi-Tenant Architecture

## Slide 21 — Technologies · AI-Powered Features & Integrations

- Intelligent PDF processing with RAG
- AI mentor guidance & code correction
- Personalized roadmap generation

## Slide 22 — Architecture

*(High-level architecture diagram — image to be inserted; see [11_flows_and_diagrams.md](./11_flows_and_diagrams.md))*

## Slide 23 — Database

*(PostgreSQL relational model + Chroma DB vector store)*

## Slide 24 — Demo

- Write and run code in your browser
- Practice problems that are checked for you
- Online classes, chat, and a PDF helper
- An AI guide and a study plan made for you
- URL: *(add your OmniLearn demo link)*

## Slide 25 — Section divider: Conclusion

## Slide 26 — Cloud & Credits

*(Startup cloud program / credits screenshot)*

## Slide 27 — Conclusion · Apports & Perspectives

- **Apports:** Full-stack delivery of a multi-tenant SaaS · Hands-on AI + RAG integration · Agile Scrum experience
- **Perspectives:** Mobile companion app & Redis-scaled realtime · Inline AI code review & multi-modal PDF · Institution analytics & hardened code sandbox

## Slide 28 — (blank)

## Slide 29 — Thank you!

---

> **Note on the title slide:** the supervisor names (`[Academic Supervisor]`, `[Company Supervisor]`), the
> university/ISET city, and the host-company name are still placeholders. The ISET Tozeur and
> "Code Cooperation" logos come from the original template and should be replaced with the correct ones.
