# Chapter 4 — Sprint 2

## I. Introduction

After laying the authentication and profile foundations in Sprint 1, Sprint 2 opens a new phase in OmniLearn's development. Each increment enriches the product by adding essential features while improving those already in place.

## II. Sprint Objectives

This sprint builds the **core learning loop** of OmniLearn so users can actually start learning. Students enter their goals and interests to get a personalized roadmap, then follow it as a visual graph until they earn a certificate. They can also browse problems matching their plan and solve them in the browser with a code editor that runs and grades their solutions. Super admins, on their side, manage the full problem catalogue and control which problems are free or pro.

## III. Sprint 2 Backlog

### Table 6 — Sprint 2 Backlog

| PBI | Main functionality | US Code | User story | Task ID | Tasks |
|---|---|---|---|---|---|
| **Student — Roadmap** | | | | | |
| 9 | Onboarding (career goal, interests, languages) | US9.1 | As a student, I want to fill in my career goal, interests and languages. | 9.1 | Build `OnboardingForm` in `Client/src/Roadmap/OnboardingForm.jsx`. |
| | | | | 9.2 | `POST /api/roadmap/onboarding` updates the `User` record. |
| | | US9.2 | As a student, I want my roadmap to be generated from those inputs. | 9.3 | Implement `RoadmapService.js` in `Server/src/ai/RoadmapService.js`. |
| | | | | 9.4 | Save the generated roadmap as a `SavedRoadmap` linked to the user. |
| | | US9.3 | As a student, I want to view my roadmap as a graph. | 9.5 | Build `RoadmapPage` with `@xyflow/react` and custom node types (`RoadmapNode`, `LevelLabelNode`, `InheritanceEdge`). |
| | | | | 9.6 | Open a side panel (`NodeDetailPanel`) when a node is clicked. |
| | | US9.4 | As a student, I want to track my progress. | 9.7 | `PATCH /api/roadmap/progress` updates `roadmapProgress`. |
| | | US9.5 | As a student, I want a certificate when the roadmap is complete. | 9.8 | `CertificateButton` opens the `Certificate` component with `jspdf` + `html2canvas`. |
| **Student — Problems & Code Editor** | | | | | |
| 10 | Problem catalogue | US10.1 | As a student, I want to browse the list of problems. | 10.1 | Build `ProblemsPage` with cards / filters. |
| | | | | 10.2 | `GET /api/problems` returns problems scoped by plan and institution. |
| | | US10.2 | As a student, I want to search and filter. | 10.3 | Add tags / difficulty filter on the frontend. |
| 11 | Solve a problem | US11.1 | As a student, I want to read the problem statement. | 11.1 | Build `ProblemPage` with a Markdown-rendered statement. |
| | | US11.2 | As a student, I want to write code in the editor. | 11.2 | Integrate CodeMirror with `LanguageSelector` (Java / Python / PHP / JS). |
| | | US11.3 | As a student, I want to run my code. | 11.3 | `POST /api/code/run` returns stdout / stderr / runtime. |
| | | | | 11.4 | Build `OutputPanel` to display the run result. |
| | | US11.4 | As a student, I want to submit my solution. | 11.5 | `POST /api/submissions` creates a `CodeSubmission` row. |
| | | | | 11.6 | Server compares the output to the expected one and returns the verdict. |
| 12 | Coding dashboard | US12.1 | As a student, I want to see my coding progress. | 12.1 | Build `CodingDashboard` with charts (`recharts`). |
| | | | | 12.2 | `GET /api/submissions/me` lists my submissions. |
| **Free-tier / Pro-tier enforcement** | | | | | |
| 44 | Free user — limited catalogue | US44.1 | As a Free user, I see only free-tier problems. | 44.1 | Filter problems by `isFreeTier=true` when `user.plan === "free"`. |
| | | | | 44.2 | Seed first 10 problems with `isFreeTier=true` on boot (done in `server.js`). |
| 46 | Pro user — full catalogue | US46.1 | As a Pro user, I see all pro-tier problems. | 46.1 | Filter problems by `isProTier=true` when `user.plan === "pro"`. |
| | | | | 46.2 | Seed all problems with `isProTier=true` on first boot (done in `server.js`). |
| **Super Admin — catalogue management** | | | | | |
| 30 | Manage problems | US30.1 | As a super admin, I want to CRUD problems. | 30.1 | Build `AdminDashboard` (`Client/src/Admin/AdminDashboard.jsx`). |
| | | | | 30.2 | `POST/PATCH/DELETE /api/admin/problems`. |
| | | US30.2 | As a super admin, I want to toggle Free-tier. | 30.3 | Build `FreeTierTab` (`Client/src/Admin/FreeTierTab.jsx`). |
| | | US30.3 | As a super admin, I want to toggle Pro-tier. | 30.4 | Build `ProTierTab` (`Client/src/Admin/ProTierTab.jsx`). |
| 39 | Manage problem dataset | US39.1 | As a super admin, I want to import / export problems. | 39.1 | `GET /api/admin/problems/export`. |
| | | | | 39.2 | `POST /api/admin/problems/import` with JSON file upload. |

## IV. Design

### 1. Use-Case Diagram

#### Student side

This diagram shows everything a student can do in Sprint 2, grouped in seven cohesive blocks:
(A) onboarding and profile, (B) AI roadmap generation with per-plan quota, (C) personal roadmap management,
(D) following the roadmap (node details, quizzes, progress, certificate), (E) browsing the problem catalogue
with plan-aware filtering, (F) solving a problem in the editor with AI mentor and auto-correction, and
(G) the coding dashboard. Secondary actors (Groq LLM, Stack Overflow, YouTube, Judge0 sandbox) are shown
on the right; `«include»` is solid blue, `«extend»` is dashed pink.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  classDef actor fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#7c2d12
  classDef ext   fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
  classDef uc    fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef inc   fill:#dbeafe,stroke:#1d4ed8,stroke-width:1.5px,color:#1e3a8a
  classDef ex    fill:#fce7f3,stroke:#be185d,stroke-width:1.5px,color:#831843
  classDef gate  fill:#fee2e2,stroke:#b91c1c,stroke-width:1.5px,color:#7f1d1d
  classDef sys   fill:#f8fafc,stroke:#475569,stroke-width:1.5px,stroke-dasharray:6 4,color:#0f172a

  %% ── Primary & secondary actors ──────────────────────────────
  Student((Student)):::actor
  Groq(("Groq LLM")):::ext
  SO(("Stack Overflow API")):::ext
  YT(("YouTube API")):::ext
  J0(("Judge0 sandbox")):::ext

  subgraph S["OmniLearn — Sprint 2 · Student scope"]
    direction TB

    %% ── (A) Onboarding & profile ──────────────────────────────
    subgraph A["A · Onboarding & profile"]
      direction TB
      Onb(["Fill onboarding<br/>(goal · interests · languages · weaknesses)"]):::uc
      Prof(["Edit learning profile"]):::uc
    end

    %% ── (B) AI roadmap generation ─────────────────────────────
    subgraph B["B · Generate personalized roadmap"]
      direction TB
      Gen(["Generate roadmap"]):::uc
      Build(["Build 5-level / 15-node pyramid prompt"]):::inc
      Norm(["Normalize + validate JSON"]):::inc
      Enrich(["Enrich nodes with resources<br/>(SO · YouTube · Docs · Quiz)"]):::inc
      Quota{{"Enforce per-plan quota<br/>Free=2 · Pro=20 · Inst=∞"}}:::gate
    end

    %% ── (C) Manage my roadmaps ────────────────────────────────
    subgraph C["C · My roadmaps"]
      direction TB
      ListR(["List my roadmaps"]):::uc
      Switch(["Switch active roadmap"]):::ex
      Rename(["Rename roadmap"]):::ex
      DelR(["Delete roadmap"]):::ex
    end

    %% ── (D) Follow the roadmap ────────────────────────────────
    subgraph D["D · Follow roadmap"]
      direction TB
      ViewG(["View roadmap graph<br/>(React Flow pyramid)"]):::uc
      OpenN(["Open node detail panel"]):::uc
      Docs(["Read Docs tab"]):::ex
      YTtab(["Watch YouTube tab"]):::ex
      SOtab(["Read Stack Overflow tab"]):::ex
      Quiz(["Take node quiz (5 MCQ)"]):::ex
      Status(["Update node status<br/>(pending · in-progress · completed)"]):::uc
      Prog(["Track overall progress %"]):::uc
      Cert(["Earn & download PDF certificate"]):::ex
      Elig{{"Eligibility check<br/>(100 % completed · quizzed · avg ≥ 80)"}}:::gate
    end

    %% ── (E) Problem catalogue ─────────────────────────────────
    subgraph E["E · Problem catalogue"]
      direction TB
      Browse(["Browse problem catalogue"]):::uc
      Filter(["Filter by difficulty / status"]):::ex
      Search(["Search by title / tag"]):::ex
      Open(["Open a problem"]):::uc
      Tier{{"Plan filter<br/>Free → free-tier only · Pro → full"}}:::gate
    end

    %% ── (F) Solve a problem ───────────────────────────────────
    subgraph F["F · Solve & code"]
      direction TB
      Read(["Read statement (Description tab)"]):::uc
      Hints(["Read hints (Hints tab)"]):::ex
      Paint(["Sketch on tldraw canvas (Paint tab)"]):::ex
      RoadT(["View solution roadmap (Roadmap tab)"]):::ex
      Lang(["Pick language"]):::uc
      LGate{{"Free plan locked to JavaScript"}}:::gate
      Write(["Write code in CodeMirror editor"]):::uc
      Reset(["Reset to starter code"]):::ex
      Run(["Run code"]):::uc
      Out(["View stdout / stderr / runtime"]):::inc
      Submit(["Submit solution"]):::uc
      Verdict(["Compare output → verdict<br/>(accepted · wrong · runtime error)"]):::inc
      Save(["Persist CodeSubmission + StudentProblemSet"]):::inc
      Mentor(["Ask AI Mentor (hint without solution)"]):::ex
      Fix(["AI auto-correct code (retry ≤ 2× until match)"]):::ex
    end

    %% ── (G) Coding dashboard ──────────────────────────────────
    subgraph G["G · Coding dashboard"]
      direction TB
      Dash(["Open coding dashboard"]):::uc
      Subs(["List my latest 50 submissions"]):::uc
      Cal(["View year activity calendar"]):::uc
      Stats(["View language & difficulty breakdown"]):::uc
      Streak(["View current & longest streak"]):::uc
    end
  end
  class S sys

  %% ── Actor associations ────────────────────────────────────
  Student --- Onb
  Student --- Prof
  Student --- Gen
  Student --- ListR
  Student --- ViewG
  Student --- OpenN
  Student --- Status
  Student --- Prog
  Student --- Browse
  Student --- Open
  Student --- Read
  Student --- Lang
  Student --- Write
  Student --- Run
  Student --- Submit
  Student --- Dash
  Student --- Subs
  Student --- Cal
  Student --- Stats
  Student --- Streak

  %% ── «include» (solid arrows) ──────────────────────────────
  Gen    -- "«include»" --> Build
  Gen    -- "«include»" --> Norm
  Gen    -- "«include»" --> Enrich
  Run    -- "«include»" --> Out
  Submit -- "«include»" --> Run
  Submit -- "«include»" --> Verdict
  Submit -- "«include»" --> Save
  Cert   -- "«include»" --> Elig

  %% ── «extend» (dashed arrows) ──────────────────────────────
  Onb    -. "«extend»" .-> Prof
  Gen    -. "«extend»" .-> Quota
  ListR  -. "«extend»" .-> Switch
  ListR  -. "«extend»" .-> Rename
  ListR  -. "«extend»" .-> DelR
  OpenN  -. "«extend»" .-> Docs
  OpenN  -. "«extend»" .-> YTtab
  OpenN  -. "«extend»" .-> SOtab
  OpenN  -. "«extend»" .-> Quiz
  Quiz   -. "auto-sets" .-> Status
  Prog   -. "«extend»" .-> Cert
  Browse -. "«extend»" .-> Filter
  Browse -. "«extend»" .-> Search
  Browse -. "«extend»" .-> Tier
  Open   -. "«extend»" .-> Read
  Read   -. "«extend»" .-> Hints
  Read   -. "«extend»" .-> Paint
  Read   -. "«extend»" .-> RoadT
  Lang   -. "«extend»" .-> LGate
  Write  -. "«extend»" .-> Reset
  Write  -. "«extend»" .-> Mentor
  Write  -. "«extend»" .-> Fix

  %% ── Calls to external actors ──────────────────────────────
  Build  -. uses .-> Groq
  Enrich -. uses .-> Groq
  Enrich -. uses .-> SO
  Enrich -. uses .-> YT
  Quiz   -. uses .-> Groq
  Mentor -. uses .-> Groq
  Fix    -. uses .-> Groq
  Run    -. uses .-> J0
```

> *Figure 22 — Use-case diagram of Sprint 2 — Student side.*

#### Super admin side

This diagram shows the super admin's Sprint 2 scope: the problem catalogue. The admin lists problems
(filtered by lifecycle status), creates them manually **or** asks the LLM to draft them, edits and
deletes them, drives the publish lifecycle (`draft → review → published → archived`), and toggles
each problem's Free-tier / Pro-tier visibility. Solid blue = `«include»`, dashed pink = `«extend»`.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  classDef actor fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#7c2d12
  classDef ext   fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
  classDef uc    fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef inc   fill:#dbeafe,stroke:#1d4ed8,stroke-width:1.5px,color:#1e3a8a
  classDef ex    fill:#fce7f3,stroke:#be185d,stroke-width:1.5px,color:#831843
  classDef sys   fill:#f8fafc,stroke:#475569,stroke-width:1.5px,stroke-dasharray:6 4,color:#0f172a

  Admin((Super Admin)):::actor
  Groq(("Groq LLM")):::ext
  YT(("YouTube API")):::ext

  subgraph S["OmniLearn — Sprint 2 · Catalogue management"]
    direction TB

    Browse(["List problems"]):::uc
    Filter(["Filter by status<br/>(all · draft · review · published · archived)"]):::ex
    Dup(["Check duplicate title"]):::ex

    Create(["Create problem manually"]):::uc
    AIGen(["AI-generate problem(s)<br/>from a topic"]):::uc
    LLM(["Call Groq LLM<br/>(schema-constrained JSON)"]):::inc
    Vids(["Enrich roadmap nodes with videos<br/>(3 per node)"]):::inc

    Update(["Update problem"]):::uc
    Delete(["Delete problem"]):::uc

    Pub(["Change publish status"]):::uc
    Notify(["Notify all users on publish"]):::inc

    Free(["Toggle Free-tier"]):::uc
    Pro(["Toggle Pro-tier"]):::uc
  end
  class S sys

  %% ── Actor associations ─────────────────────
  Admin --- Browse
  Admin --- Create
  Admin --- AIGen
  Admin --- Update
  Admin --- Delete
  Admin --- Pub
  Admin --- Free
  Admin --- Pro

  %% ── «include» ──────────────────────────────
  AIGen -- "«include»" --> LLM
  AIGen -- "«include»" --> Vids
  Pub   -- "«include»" --> Notify

  %% ── «extend» ───────────────────────────────
  Browse -. "«extend»" .-> Filter
  Create -. "«extend»" .-> Dup
  AIGen  -. "«extend»" .-> Dup

  %% ── External actors ───────────────────────
  LLM    -. uses .-> Groq
  Vids   -. uses .-> YT
```

> *Figure 23 — Use-case diagram of Sprint 2 — Super Admin side.*

### 2. Sequence Diagrams

#### 2.1. Sequence diagram — "Generate personalized roadmap"

This diagram shows how a roadmap is built after the student submits the onboarding form.
The backend asks the AI for a roadmap, saves it, and the page displays it as a graph.

```mermaid
sequenceDiagram
    actor Student
    participant FE as Frontend
    participant API as Backend
    participant Svc as RoadmapService
    participant LLM as Groq LLM
    participant SO as StackExchange
    participant YT as YouTube API
    participant DB as Database

    Note over Student,DB: ref: Authenticate

    Student->>+FE: Fill onboarding form
    FE->>+API: POST /roadmap/onboarding
    API->>+DB: Save profile fields
    DB-->>-API: Saved
    API->>+Svc: generateRoadmap(profile)
    Svc->>+LLM: Prompt (15 nodes / 5 levels)
    LLM-->>-Svc: Roadmap JSON
    Svc->>Svc: Normalize + validate

    loop Batches of 5 nodes
        Svc->>+SO: Search top answers
        SO-->>-Svc: Threads
        Svc->>+YT: Search top videos
        YT-->>-Svc: Videos
        Svc->>+LLM: Generate docs + MCQs
        LLM-->>-Svc: Resources
    end

    Svc->>+DB: Insert SavedRoadmap
    DB-->>-Svc: Saved
    Svc-->>-API: Roadmap
    API-->>-FE: 201 roadmap
    FE-->>-Student: Render React Flow graph
```

> *Figure 24 — Sequence diagram "Generate personalized roadmap".*

#### 2.2. Sequence diagram — "Submit a code solution"

This diagram shows what happens when the student submits code.
The backend runs the code, compares the output and returns a verdict shown in the output panel.

```mermaid
sequenceDiagram
    actor Student
    participant FE as Frontend
    participant API as Backend
    participant Sandbox as CodeRunner
    participant DB as Database

    Note over Student,DB: ref: Authenticate

    Student->>+FE: Write code, click "Submit"
    FE->>+API: POST /submissions
    API->>+DB: Insert submission (pending)
    DB-->>-API: Row created
    API->>+Sandbox: Run code
    Sandbox-->>-API: stdout, stderr, runtimeMs
    API->>API: Compare expected output

    alt Output matches
        API->>+DB: Update verdict = accepted
        DB-->>-API: Updated
    else Output differs
        API->>+DB: Update verdict = wrong_answer
        DB-->>-API: Updated
    else Runtime error
        API->>+DB: Update verdict = runtime_error
        DB-->>-API: Updated
    end

    API-->>-FE: 201 verdict + output
    FE-->>-Student: Update OutputPanel + dashboard
```

> *Figure 25 — Sequence diagram "Submit code".*

### 3. Activity Diagrams

#### 3.1. Activity diagram — "Toggle problem as Free-tier"

This swimlane diagram shows the full flow when the super admin flips the **Free-tier** switch on a problem.
The admin acts from the `FreeTierTab`, the platform validates the request and pushes the change, and the
database persists the new `isFreeTier` value so the Free users' catalogue updates instantly.

```mermaid
%%{init: {"theme":"neutral", "flowchart": {"htmlLabels": true}} }%%
flowchart TB
  Start([●]):::startNode

  subgraph LANES[" "]
    direction LR

    subgraph ADMIN["Administrateur"]
      direction TB
      A1["S'authentifier"]:::adminNode
      A2["Ouvrir l'onglet<br/>Free-tier"]:::adminNode
      A3["Choisir un problème<br/>dans la liste"]:::adminNode
      A4["Basculer le switch<br/>Free-tier (on / off)"]:::adminNode
      A5["Confirmer<br/>le changement"]:::adminNode
    end

    subgraph PLAT["Plateforme"]
      direction TB
      P1["Afficher le dashboard<br/>d'administrateur"]:::platNode
      P2["Récupérer la liste<br/>des problèmes"]:::platNode
      P3["Afficher la liste<br/>des problèmes"]:::platNode
      P4["Envoyer PATCH<br/>/api/admin/problems/:id<br/>{ isFreeTier }"]:::platNode
      P5{"Vérifier le rôle<br/>(super admin ?)"}:::decisionNode
      P6["Retourner 403<br/>Forbidden"]:::errorNode
      P7["Mettre à jour le cache<br/>du catalogue Free"]:::platNode
      P8["Afficher message<br/>de succès"]:::platNode
    end

    subgraph DB["Base de données"]
      direction TB
      D1["Préparer la liste<br/>des problèmes"]:::dbNode
      D2["UPDATE problems<br/>SET isFreeTier = :value<br/>WHERE id = :id"]:::dbNode
      D3["Retourner le problème<br/>mis à jour"]:::dbNode
    end
  end

  End([◉]):::endNode

  %% ── Flow across lanes ─────────────────────────
  Start --> A1
  A1 --> P1
  P1 --> A2
  A2 --> P2
  P2 --> D1
  D1 --> P3
  P3 --> A3
  A3 --> A4
  A4 --> A5
  A5 --> P4
  P4 --> P5
  P5 -- "Non" --> P6
  P6 --> End
  P5 -- "Oui" --> D2
  D2 --> D3
  D3 --> P7
  P7 --> P8
  P8 --> End

  %% ── Styles ────────────────────────────────────
  classDef adminNode    fill:#fff7ed,stroke:#c2410c,stroke-width:1.5px,color:#7c2d12
  classDef platNode     fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef dbNode       fill:#ecfdf5,stroke:#047857,stroke-width:1.5px,color:#064e3b
  classDef decisionNode fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#78350f
  classDef errorNode    fill:#fee2e2,stroke:#b91c1c,stroke-width:1.5px,color:#7f1d1d
  classDef startNode    fill:#111827,stroke:#111827,color:#fff
  classDef endNode      fill:#fff,stroke:#111827,stroke-width:3px,color:#111827

  style LANES fill:#ffffff,stroke:#94a3b8,stroke-width:1px
  style ADMIN fill:#fffaf4,stroke:#c2410c,stroke-width:1.5px
  style PLAT  fill:#f5f7ff,stroke:#4338ca,stroke-width:1.5px
  style DB    fill:#f3fbf6,stroke:#047857,stroke-width:1.5px
```

> *Figure 26 — Activity diagram "Toggle problem as Free-tier" (swimlane).*

#### 3.2. Activity diagram — "Generate certificate"

This diagram shows how the certificate is created when the roadmap reaches 100%.
The student clicks the button and the page is exported as a PDF.

```mermaid
flowchart TD
  A([Start]) --> B[Student marks last node as done]
  B --> C[PATCH /api/roadmap/progress]
  C --> D{progress == 100%?}
  D -- No --> E[Save progress] --> Z([End])
  D -- Yes --> F[Save progress, unlock certificate]
  F --> G[CertificateButton becomes active]
  G --> H[Click button]
  H --> I[Certificate.jsx renders HTML template (name, roadmap title, date)]
  I --> J[html2canvas snapshots the node]
  J --> K[jsPDF builds the PDF from the canvas]
  K --> L[Trigger browser download] --> Z
```

> *Figure 27 — Activity diagram "Generate certificate".*

### 4. Class Diagram

This diagram shows the data classes **and the role-specific operations** added in Sprint 2.
`User` is specialised into two roles — `Student` and `SuperAdmin` — each exposing the methods
they actually use this sprint. The `plan` attribute (`free` / `pro` / `institution`) drives
the catalogue filtering done by `FreeTier` / `ProTier` toggles on `Problem`.

```mermaid
classDiagram
  direction LR

  %% ── Base actor ────────────────────────────────
  class User {
    <<abstract>>
    +UUID id
    +string email
    +enum role (student | super_admin)
    +enum plan (free | pro | institution)
    +UUID institutionId
    +Date createdAt
    +authenticate() Token
  }

  %% ── Student role (Sprint 2 operations) ───────
  class Student {
    <<role>>
    +string careerGoal
    +string[] interests
    +string[] languages
    +string[] weaknesses
    +int roadmapProgress
    +submitOnboarding(profile) void
    +generateRoadmap() SavedRoadmap
    +viewRoadmapGraph() Graph
    +updateNodeStatus(nodeId, status) void
    +trackProgress() int
    +earnCertificate() PDF
    +browseProblems() Problem[]
    +openProblem(id) Problem
    +runCode(src, lang) RunResult
    +submitSolution(src, lang) CodeSubmission
    +viewCodingDashboard() Stats
  }

  %% ── Super Admin role (Sprint 2 operations) ───
  class SuperAdmin {
    <<role>>
    +listProblems(filter) Problem[]
    +createProblem(data) Problem
    +aiGenerateProblem(topic) Problem
    +updateProblem(id, data) Problem
    +deleteProblem(id) void
    +toggleFreeTier(id, value) Problem
    +toggleProTier(id, value) Problem
    +importProblems(file) int
    +exportProblems() JSON
    +publishProblem(id, status) Problem
  }

  %% ── Domain entities ──────────────────────────
  class Problem {
    +UUID id
    +string title
    +text statement
    +enum difficulty (easy | medium | hard)
    +string[] tags
    +string language
    +text expectedOutput
    +bool isFreeTier
    +bool isProTier
    +enum status (draft | review | published | archived)
    +UUID institutionId
    +UUID createdBy
  }

  class CodeSubmission {
    +UUID id
    +UUID userId
    +UUID problemId
    +text sourceCode
    +string language
    +enum verdict (pending | accepted | wrong_answer | runtime_error)
    +int runtimeMs
    +text stdout
    +text stderr
    +Date createdAt
  }

  class SavedRoadmap {
    +UUID id
    +UUID userId
    +string title
    +JSON graphJson
    +int progress
    +bool isActive
    +Date completedAt
  }

  class RoadmapNode {
    +UUID id
    +UUID roadmapId
    +string topic
    +int level
    +enum status (pending | in_progress | completed)
    +JSON resources
    +JSON quiz
    +int quizScore
  }

  class StudentProblemSet {
    +UUID id
    +UUID studentId
    +UUID[] problemIds
    +string generatedFromGoal
  }

  class Certificate {
    +UUID id
    +UUID userId
    +UUID roadmapId
    +string studentName
    +string roadmapTitle
    +Date issuedAt
    +string pdfUrl
  }

  %% ── Inheritance (roles) ──────────────────────
  User <|-- Student
  User <|-- SuperAdmin

  %% ── Associations (Sprint 2 behaviour) ────────
  Student      "1" --> "0..*" SavedRoadmap       : owns
  SavedRoadmap "1" --> "1..*" RoadmapNode        : contains
  Student      "1" --> "0..1" Certificate        : earns
  SavedRoadmap "1" --> "0..1" Certificate        : produces
  Student      "1" --> "0..*" CodeSubmission     : submits
  Student      "1" --> "0..*" StudentProblemSet  : owns
  Problem      "1" --> "0..*" CodeSubmission     : receives
  SuperAdmin   "1" --> "0..*" Problem            : manages / createdBy
  StudentProblemSet "*" --> "*" Problem          : references
```

> *Figure 28 — Class diagram of Sprint 2 (roles + behaviour).*

### 5. C4 Container view

This diagram shows the main containers of the app in Sprint 2.
The API now talks to an AI service and a code sandbox to run user code.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  SPA["React SPA<br/>(graph + Monaco editor)"]
  API["Web API · Express 5<br/>+ RoadmapService"]
  Sand["Code sandbox<br/>runner"]
  DB[("PostgreSQL")]
  Groq[(Groq · LLM)]
  SO[(StackExchange)]
  YT[(YouTube)]

  SPA -- "HTTPS / JSON · JWT" --> API
  API -- "Sequelize"          --> DB
  API -- "execute / verdict"  --> Sand
  API -- "completions"        --> Groq
  API -- "enrichment"         --> SO
  API -- "enrichment"         --> YT
```

> *Figure 28.1 — Sprint 2 — C4 Container view.*

### 6. C4 Component view

This diagram shows the internal components of the backend in Sprint 2.
It groups the API routes and the AI roadmap service that builds and enriches the roadmap.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart TB
  subgraph WebAPI["Container — Web API (Express 5)"]
    direction TB

    subgraph RoadC["roadmapRoutes.js"]
      Onb["POST /onboarding"]
      GetR["GET  /roadmap"]
      Prog["PATCH /progress"]
    end

    subgraph ProbC["problemRoutes.js"]
      List["GET    /problems (plan + inst scope)"]
      One["GET    /problems/:id"]
      Cre["POST   /problems (admin)"]
    end

    subgraph SubC["submissionRoutes.js"]
      Sub["POST /submissions"]
      Mine["GET  /submissions/me"]
    end

    subgraph RunC["code execution"]
      Run["POST /code/run"]
      Cmp["expectedOutput comparator"]
    end

    subgraph AdmC["admin/problemsRoutes.js"]
      Free["PATCH isFreeTier"]
      Pro["PATCH isProTier"]
      Imp["POST /import"]
      Exp["GET  /export"]
    end

    subgraph Svc["RoadmapService.js — AI orchestrator"]
      Build["buildPrompt(profile)\n15-node / 5-level pyramid"]
      LLM["groq.chat.completions"]
      Parse["JSON parse + repair (T=0.1)"]
      Norm["normalizeRoadmap()"]
      Bat["Enrichment batcher (5 / batch)"]
      SOf["fetchStackOverflow(q, 5)"]
      YTf["fetchYouTube(q, 3)"]
      Docsf["fetchDocs (LLM, real URLs)"]
      QuizG["generateQuiz (5 MCQs)"]
    end

    MW["authenticate + plan gate"]
    PM["Problem model"]
    CSM["CodeSubmission model"]
    SRM["SavedRoadmap model"]
    SPSM["StudentProblemSet model"]
    Sand["Sandbox client"]
  end

  PG[(PostgreSQL)]
  Groq[(Groq)]
  SO[(StackExchange)]
  YT[(YouTube)]
  Sandbox[(Sandbox runner)]

  Onb  --> MW
  Onb  --> Svc
  GetR --> MW --> SRM
  Prog --> MW --> SRM

  List --> MW --> PM
  One  --> PM
  Cre  --> MW --> PM

  Sub  --> MW
  Sub  --> Sand
  Sub  --> Cmp --> CSM
  Mine --> CSM

  Run  --> MW --> Sand
  Sand --> Sandbox

  Free --> MW --> PM
  Pro  --> MW --> PM
  Imp  --> MW --> PM
  Exp  --> MW --> PM

  Build --> LLM --> Parse --> Norm --> Bat
  Bat --> SOf  --> SO
  Bat --> YTf  --> YT
  Bat --> Docsf --> Groq
  Bat --> QuizG --> Groq
  LLM --> Groq
  Bat --> SRM
  Svc --> SPSM

  PM   --> PG
  CSM  --> PG
  SRM  --> PG
  SPSM --> PG
```

> *Figure 28.2 — Sprint 2 — C4 Component view.*

## V. Implementation

### 1. Onboarding form

This screen lets the student set a career goal and pick interests and languages.
These answers are used by the AI to build the personalized roadmap.

> *Figure 29 — Onboarding form.*

### 2. Personalized roadmap graph

This screen shows the roadmap as an interactive graph.
Each node is a topic the student needs to learn to reach their goal.

> *Figure 30 — Personalized roadmap graph view.*

### 3. Roadmap node detail panel

This panel opens when the student clicks a node on the roadmap.
It shows the topic, its resources and a button to mark it as done.

> *Figure 31 — Roadmap node detail panel.*

#### 3.1. Docs tab

Lists official documentation and articles for the topic.
The student opens them to read the reference material.

> *Figure 31.1 — Node detail panel — Docs tab.*

#### 3.2. YouTube tab

Shows curated video tutorials with thumbnail and channel.
The student watches them to learn the topic visually.

> *Figure 31.2 — Node detail panel — YouTube tab.*

#### 3.3. Stack Overflow tab

Shows top Stack Overflow questions linked to the topic.
The student opens them to see real problems and answers.

> *Figure 31.3 — Node detail panel — Stack Overflow tab.*

#### 3.4. Quiz tab

A short multiple-choice quiz to test the topic.
The student must pass it to mark the step as completed.

> *Figure 31.4 — Node detail panel — Quiz tab.*

### 4. Certificate

This is the certificate the student gets after finishing the roadmap.
It can be downloaded as a PDF with the student's name.

> *Figure 32 — Roadmap completion certificate.*

#### 4.1. Roadmaps & Certifications (Profile tab)

This profile tab gathers all the learning paths the student started and the certificates they earned.
From here the student can resume a roadmap or download a certificate again.

> *Figure 32.1 — Profile — Roadmaps & Certifications tab.*

### 5. Problems page

This page lists all coding problems available to the student.
The student can search and filter by difficulty or tag.

> *Figure 33 — Problems catalogue page.*

### 6. Problem page (statement + code editor)

This page shows the problem statement next to a code editor.
The student writes, runs and submits the code, then sees the result.

> *Figure 34 — Problem page with code editor and output panel.*

The left panel has four tabs that help the student understand and plan the solution.

#### 6.1. Description tab

Shows the problem statement, examples and the expected output.
The student reads it first to understand what the code must do.

> *Figure 34.1 — Problem page — Description tab.*

#### 6.2. Hints tab

Lists short hints the student can read when stuck.
Each hint gives one small clue without revealing the full solution.

> *Figure 34.2 — Problem page — Hints tab.*

#### 6.3. Paint tab

A free drawing area to sketch ideas, diagrams or pseudo-code.
The student uses it to plan the approach before writing the code.

> *Figure 34.3 — Problem page — Paint tab.*

#### 6.4. Roadmap tab

A visual graph of the steps to follow to solve the problem.
Clicking a node shows the step title, an example and a hint.

> *Figure 34.4 — Problem page — Roadmap tab.*

### 7. Coding dashboard

This page shows the student's coding stats with charts.
It displays the success rate, last submissions and progress by difficulty.

> *Figure 35 — Coding dashboard.*

### 8. Super-admin problems tabs (Free-tier / Pro-tier)

These two tabs let the admin choose which problems are Free or Pro.
A simple switch turns the flag on or off for each problem.

> *Figure 36 — `FreeTierTab` — toggle problems as free-tier.*
> *Figure 37 — `ProTierTab` — toggle problems as pro-tier.*

## VI. Testing

To validate the Sprint 2 backend, we tested two endpoints that drive the core student loop — generating a roadmap and submitting code.

#### 1. `POST /api/roadmaps/generate` — generate a personalized roadmap

**Type:** Endpoint test (Postman).
**Goal:** Verify that a roadmap is created from the student's profile (grade / speciality / level) and saved against the user.
**Request:** authenticated `POST` with `Authorization: Bearer <jwt>` and body:

```json
{ "specialityId": 3, "levelId": 2, "targetGoal": "Become a backend developer" }
```

**Expected:**
- **Valid profile** → `200 OK` with a roadmap object containing nodes and edges.
- **Missing token** → `401 Unauthorized`.

> *Figure 37.1 — Postman — `POST /api/roadmaps/generate` returns the generated roadmap graph.*
> *Figure 37.2 — Postman — `POST /api/roadmaps/generate` returns 401 when the JWT is missing.*

#### 2. `POST /api/submissions` — save a code submission

**Type:** Endpoint test (Postman).
**Goal:** Verify that a submission is persisted, the attempt counter is incremented, and the `StudentProblemSet` record is upserted.
**Request body:**

```json
{
  "userId": 42,
  "problemId": "two-sum",
  "userCode": "def two_sum(nums, target): ...",
  "language": "python",
  "status": "passed",
  "score": 100,
  "isCorrect": true
}
```

**Expected:**
- **Valid payload** → `200 OK` with `{ submission, problemRecord }` where `problemRecord.status === "solved"`.
- **Missing required field** (e.g. no `userCode`) → `400 Bad Request` with `{ error: "userId, userCode, and language are required" }`.

> *Figure 37.3 — Postman — `POST /api/submissions` persists a correct submission and marks the problem as solved.*
> *Figure 37.4 — Postman — `POST /api/submissions` returns 400 when `userCode` is missing.*

## VII. Conclusion

Sprint 2 delivered the personalized roadmap, the problem catalogue, the multi-language code editor, the coding dashboard and the super-admin catalogue management. With these features, the platform already provides a complete learning loop for individual learners on the Free and Pro plans. The next chapter — Sprint 3 — adds the multi-actor collaborative dimension: classrooms, assignments and real-time messaging.

---
