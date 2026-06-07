# C4 Diagram - Problem Creation (Manual and AI)

This document describes how OmniLearn creates a coding problem through two supported paths:
manual authoring and AI-assisted generation. It focuses on the shared problem editor used by staff users and on the server-side AI pipeline that turns a topic into structured problem drafts.

## Scope

- Primary users: teacher, institution admin, and other staff users allowed to access the shared problem editor.
- Main entry point: the shared problem creation page.
- Manual path: form-based creation and editing.
- AI path: topic-driven draft generation, review, and save.
- Persistence: PostgreSQL through Sequelize.
- AI provider: Groq.

## 1. C4 Context View

```mermaid
C4Context
title OmniLearn - Problem creation context

Person(staff, "Staff user", "Teacher or institution admin creating a problem")
System(omnilearn, "OmniLearn", "Creates, reviews, publishes, and stores coding problems")
System_Ext(groq, "Groq", "Generates AI problem drafts in structured JSON")

Rel(staff, omnilearn, "Creates problems manually or with AI", "HTTPS")
Rel(omnilearn, groq, "Requests structured problem drafts", "HTTPS")
```

## 2. C4 Container View

```mermaid
C4Container
title OmniLearn - Problem creation containers

Person(staff, "Staff user", "Teacher or institution admin")

System_Boundary(omni, "OmniLearn") {
  Container(client, "Client", "React + Vite", "Shared problem editor, problem bank UI, preview and validation dialogs")
  Container(server, "Server", "Node.js + Express", "Validates problem data, handles AI generation, and writes records")
  ContainerDb(db, "PostgreSQL", "Sequelize", "Stores problem definitions, metadata, status, scope, and AI-generated drafts")
}

System_Ext(groq, "Groq", "LLM provider for AI-generated problem drafts")

Rel(staff, client, "Uses", "HTTPS")
Rel(client, server, "Submits manual create/edit requests", "REST/JSON")
Rel(client, server, "Requests AI-generated drafts", "REST/JSON")
Rel(server, db, "Reads and writes problem records", "SQL")
Rel(server, groq, "Builds drafts from the requested topic", "HTTPS")
```

## 3. C4 Component View

```mermaid
C4Component
title OmniLearn - Problem creation component view

Container(client, "Client", "React + Vite", "UI for manual and AI problem creation")
Container(server, "Server", "Node.js + Express", "API and persistence layer")
ContainerDb(db, "PostgreSQL", "Sequelize", "Problem storage")
System_Ext(groq, "Groq", "LLM provider")

Container_Boundary(client_boundary, "Client components") {
  Component(problem_create_page, "ProblemCreatePage", "React", "Shared editor with Manual and AI tabs")
  Component(problem_bank, "Problem Bank panel", "React", "Launches the shared editor and manages draft review")
}

Container_Boundary(server_boundary, "Server components") {
  Component(manual_problem_api, "POST /api/ai/ai/problems", "Express route", "Accepts manual problem payloads and persists them")
  Component(ai_problem_api, "POST /api/ai/ai/generate/problems", "Express route", "Calls Groq, repairs JSON, and inserts AI drafts")
  Component(problem_model, "Problem model", "Sequelize model", "Represents problem records and bulk inserts")
}

Rel(problem_bank, problem_create_page, "Opens the shared editor", "Navigation")
Rel(problem_create_page, manual_problem_api, "Saves manual create or edit", "REST/JSON")
Rel(problem_create_page, ai_problem_api, "Submits topic, difficulty, and count", "REST/JSON")
Rel(manual_problem_api, problem_model, "Validates and stores the problem", "Sequelize")
Rel(ai_problem_api, groq, "Generates structured drafts", "HTTPS")
Rel(ai_problem_api, problem_model, "Bulk inserts generated drafts", "Sequelize")
Rel(problem_model, db, "Reads and writes persisted data", "SQL")
```

## 4. Creation Flow Summary

- Manual flow: the staff user opens the shared editor, fills the form, previews the problem, validates examples and expected output, then submits it to the server for persistence.
- AI flow: the staff user chooses the AI tab, provides a topic and difficulty constraints, the server asks Groq for a strict JSON response, repairs invalid JSON when needed, stores the generated drafts, and returns them for review before publication.
- Both flows converge on the same persistence layer so the final problem lifecycle remains consistent: draft, review, published, or archived.