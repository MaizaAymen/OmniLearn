# Flows and Diagrams

This file gathers — in one place — the **flowcharts**, **sequence diagrams**, **activity diagrams**, **use-case diagrams** and **class diagrams** that describe OmniLearn end-to-end. The diagrams below are written in **Mermaid** so they can be rendered directly in any Markdown viewer that supports Mermaid (GitHub, VS Code, Obsidian, etc.).

---

## 1. High-level system architecture

```mermaid
flowchart LR
  subgraph Client["Client — React 19 + Vite"]
    UI["UI Components"]
    Router["React Router 7"]
    Socket["socket.io-client"]
    Editor["CodeMirror 6"]
    Flow["React Flow (Roadmap)"]
    Stream["Stream Video SDK"]
  end

  subgraph Server["Server — Node.js + Express 5"]
    Auth["Auth routes (JWT + bcryptjs + 2FA)"]
    UserAPI["User / Profile routes"]
    AdminAPI["Admin routes"]
    Problems["Problems / Submissions"]
    Classroom["Classrooms / Assignments / Announcements"]
    Messaging["Conversations / Messages / Socket.IO Hub"]
    PDFAI["PDF assistant (LangChain + Chroma)"]
    RoadmapAI["RoadmapService"]
    Plan["Plan / Institution / Invite-link routes"]
    StripeAPI["Stripe routes (Checkout + webhook)"]
    Notif["Notification routes"]
  end

  subgraph Data["Data layer"]
    PG[("PostgreSQL via Sequelize")]
    Chroma[("Chroma DB — vector store")]
    Cloud[("Cloudinary — uploads")]
  end

  subgraph Third["Third-party"]
    StripeSvc["Stripe"]
    StreamSvc["Stream Video"]
    LLM["LLM providers (Groq / OpenAI / HF)"]
    SMTP["SMTP — Nodemailer"]
  end

  UI --> Router
  Router --> UI
  UI <-->|REST| Auth
  UI <-->|REST| UserAPI
  UI <-->|REST| AdminAPI
  UI <-->|REST| Problems
  UI <-->|REST| Classroom
  UI <-->|REST| PDFAI
  UI <-->|REST| RoadmapAI
  UI <-->|REST| Plan
  UI <-->|REST| StripeAPI
  Socket <-->|WebSocket| Messaging
  Stream <-->|RTC| StreamSvc

  Auth --> PG
  UserAPI --> PG
  AdminAPI --> PG
  Problems --> PG
  Classroom --> PG
  Messaging --> PG
  Plan --> PG
  Notif --> PG
  PDFAI --> Chroma
  PDFAI --> LLM
  RoadmapAI --> LLM
  UserAPI --> Cloud
  StripeAPI <-->|Webhook| StripeSvc
  Auth --> SMTP
```

---

## 2. Global use-case diagram

```mermaid
flowchart LR
  Visitor((Visitor))
  Student((Student))
  Teacher((Teacher))
  InstAdmin((Institution Admin))
  SuperAdmin((Super Admin))

  Visitor --> SignUp["Sign up"]
  Visitor --> Verify["Verify email"]
  Visitor --> Login["Sign in"]

  Student --> Profile["Manage profile + 2FA"]
  Student --> Onboard["Roadmap onboarding"]
  Student --> Roadmap["View / progress roadmap"]
  Student --> Cert["Download certificate"]
  Student --> Problems["Browse problems"]
  Student --> Solve["Solve a problem (Editor + Submit)"]
  Student --> Dashboard["Coding dashboard"]
  Student --> JoinClass["Join classroom (code or invite)"]
  Student --> Class["View classroom + announcements + assignments"]
  Student --> SubmitAssn["Submit assignment"]
  Student --> Msg["Real-time messaging"]
  Student --> PDF["Ask PDF assistant"]
  Student --> Mentor["Ask AI Mentor"]

  Teacher --> CreateClass["Create class + invite code"]
  Teacher --> CreateCourse["Create course / module / lesson"]
  Teacher --> CreateAssn["Create assignment + attach problems"]
  Teacher --> Grade["Review + grade submissions"]
  Teacher --> Announce["Post announcement"]
  Teacher --> PDFUpload["Upload lesson PDF"]
  Teacher --> Msg

  InstAdmin --> OnboardInst["Onboard institution"]
  InstAdmin --> Invites["Generate / revoke invite links"]
  InstAdmin --> Curriculum["Manage Grades / Specialities / Levels"]
  InstAdmin --> Directory["Manage member directory"]
  InstAdmin --> Assign["Assign teachers to classes"]

  SuperAdmin --> Insts["Manage institutions"]
  SuperAdmin --> ProbsAdmin["Manage problem catalogue"]
  SuperAdmin --> FreeTier["Toggle Free-tier"]
  SuperAdmin --> ProTier["Toggle Pro-tier"]
  SuperAdmin --> Ban["Ban / unban users"]
  SuperAdmin --> Stats["View global statistics"]
```

---

## 3. End-to-end class diagram (data model)

```mermaid
classDiagram
  class User {
    +UUID id
    +string firstname
    +string lastname
    +string email
    +string password
    +enum role  // admin | institution_admin | teacher | student
    +enum plan  // free | pro | institution
    +Date planJoinedAt
    +UUID institutionId
    +boolean isActive
    +boolean isEmailVerified
    +string emailVerificationToken
    +string passwordResetToken
    +string twoFactorSecret
    +boolean is2FAEnabled
    +string bio
    +string githubUrl
    +string linkedinUrl
    +string avatar
    +string careerGoal
    +json interests
    +json programmingLanguages
    +json roadmap
    +int roadmapProgress
  }

  class Institution {
    +UUID id
    +string name
    +string slug
    +string logoUrl
    +enum plan
  }

  class InviteLink {
    +UUID id
    +UUID institutionId
    +string token
    +enum role
    +Date expiresAt
    +int maxUses
    +int usedCount
  }

  class Grade {
    +UUID id
    +string name
    +UUID institutionId
  }
  class Speciality {
    +UUID id
    +string name
    +UUID gradeId
    +UUID institutionId
  }
  class Level {
    +UUID id
    +string name
    +UUID specialityId
    +UUID institutionId
  }

  class Class {
    +UUID id
    +string name
    +string code
    +UUID teacherId
    +UUID gradeId
    +UUID specialityId
    +UUID levelId
  }
  class Enrollment {
    +UUID id
    +UUID classId
    +UUID studentId
    +Date enrolledAt
  }
  class Course {
    +UUID id
    +string name
    +UUID teacherId
    +UUID classId
    +UUID levelId
  }
  class Module {
    +UUID id
    +string name
    +UUID courseId
  }
  class Lesson {
    +UUID id
    +string title
    +text content
    +string pdfUrl
    +UUID moduleId
    +UUID courseId
  }
  class ClassAssignment {
    +UUID id
    +string name
    +UUID moduleId
    +UUID classId
    +Date dueAt
  }
  class Announcement {
    +UUID id
    +string title
    +text body
    +UUID classId
    +UUID authorId
  }
  class Problem {
    +UUID id
    +string title
    +text statement
    +string difficulty
    +json tags
    +string language
    +text expectedOutput
    +boolean isFreeTier
    +boolean isProTier
    +UUID institutionId
  }
  class CodeSubmission {
    +UUID id
    +UUID userId
    +UUID problemId
    +text sourceCode
    +string language
    +string verdict
    +int runtimeMs
  }
  class StudentProblemSet {
    +UUID id
    +UUID studentId
    +json problemIds
  }
  class Conversation {
    +UUID id
    +string name
    +json participantIds
  }
  class Message {
    +UUID id
    +UUID conversationId
    +UUID senderId
    +text body
  }
  class Notification {
    +UUID id
    +UUID userId
    +string type
    +json payload
    +Date readAt
  }
  class SavedRoadmap {
    +UUID id
    +UUID userId
    +json graphJson
    +int progress
  }

  Institution "1" --> "*" User : members
  Institution "1" --> "*" InviteLink : inviteLinks
  Institution "1" --> "*" Grade : grades
  Institution "1" --> "*" Speciality : specialities
  Institution "1" --> "*" Level : levels

  Grade "1" --> "*" Speciality
  Speciality "1" --> "*" Level
  Level "1" --> "*" Course

  User "1" --> "*" Class : taughtClasses
  Class "1" --> "*" Enrollment
  User "1" --> "*" Enrollment : enrollments
  Class "1" --> "*" Course
  Course "1" --> "*" Module
  Module "1" --> "*" Lesson
  Course "1" --> "*" Lesson : directLessons
  Module "1" --> "*" ClassAssignment
  Class "1" --> "*" ClassAssignment
  Class "1" --> "*" Announcement
  User "1" --> "*" Announcement : authoredAnnouncements
  User "1" --> "*" CodeSubmission
  Problem "1" --> "*" CodeSubmission
  Course "1" --> "*" CodeSubmission
  Module "1" --> "*" CodeSubmission
  User "1" --> "*" StudentProblemSet
  Conversation "1" --> "*" Message
  User "1" --> "*" Message : sentMessages
  User "1" --> "*" Notification
  User "1" --> "1" SavedRoadmap
```

---

## 4. Sequence diagrams

### 4.1. Sign up + email verification

```mermaid
sequenceDiagram
  participant V as Visitor
  participant FE as Frontend (React)
  participant API as Express API
  participant DB as PostgreSQL
  participant SMTP as Nodemailer

  V->>FE: Open /auth, fill signup form
  FE->>FE: client-side validation
  FE->>API: POST /api/auth/register
  API->>API: bcrypt.hash(password)
  API->>API: generate emailVerificationToken
  API->>DB: INSERT INTO users(...)
  API->>SMTP: send verification email
  API-->>FE: 201 + user
  V->>FE: click verification link
  FE->>API: GET /api/auth/verify-email?token=...
  API->>DB: SELECT user WHERE token=...
  API->>DB: UPDATE users SET isEmailVerified=true
  API-->>FE: 200
  FE->>V: redirect to dashboard
```

### 4.2. Sign in (with optional 2FA)

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as Express API
  participant DB as PostgreSQL

  U->>FE: Submit credentials
  FE->>API: POST /api/auth/login
  API->>DB: SELECT user WHERE email=?
  API->>API: bcrypt.compare(password)
  alt is2FAEnabled
    API-->>FE: { challenge: "totp" }
    U->>FE: enter TOTP code
    FE->>API: POST /api/auth/login/2fa { code }
    API->>API: speakeasy.totp.verify(secret, code)
  end
  API-->>FE: { token, user }
  FE->>FE: js-cookie.set("token") / set("user")
  FE->>U: redirect to role-based dashboard
```

### 4.3. Generate personalized roadmap

```mermaid
sequenceDiagram
  participant S as Student
  participant FE as Frontend
  participant API as Express API
  participant DB as PostgreSQL
  participant SVC as RoadmapService
  participant LLM as LLM provider

  S->>FE: Fill OnboardingForm
  FE->>API: POST /api/roadmap/onboarding
  API->>DB: UPDATE users SET careerGoal, interests, programmingLanguages
  API->>SVC: generateRoadmap(user)
  SVC->>LLM: prompt(career goal, interests, languages)
  LLM-->>SVC: JSON { nodes, edges, levels }
  SVC->>SVC: validate + sanitize
  SVC->>DB: INSERT SavedRoadmap
  SVC-->>API: roadmap
  API-->>FE: 200 + roadmap
  FE->>S: render React Flow graph
```

### 4.4. Solve a problem (run + submit)

```mermaid
sequenceDiagram
  participant S as Student
  participant FE as Frontend
  participant API as Express API
  participant DB as PostgreSQL
  participant SBX as Code sandbox

  S->>FE: write code in CodeMirror, click Run
  FE->>API: POST /api/code/run { code, language }
  API->>SBX: spawn(language, code)
  SBX-->>API: { stdout, stderr, runtimeMs }
  API-->>FE: result
  FE->>S: show in OutputPanel
  S->>FE: click Submit
  FE->>API: POST /api/submissions { problemId, code, language }
  API->>SBX: run + compare with expectedOutput
  API->>DB: INSERT CodeSubmission(verdict)
  API-->>FE: verdict
  FE->>S: update OutputPanel + CodingDashboard
```

### 4.5. Ask the PDF assistant (RAG)

```mermaid
sequenceDiagram
  participant S as Student
  participant FE as Frontend
  participant API as Express API
  participant VS as Chroma DB
  participant LLM as LLM provider

  S->>FE: Upload PDF
  FE->>API: POST /api/pdf/upload
  API->>API: pdf-parse → chunks
  API->>VS: index embeddings
  API-->>FE: 200 (ready)
  S->>FE: Ask a question
  FE->>API: POST /api/pdf/ask { question, fileId }
  API->>VS: similarity search (top-k)
  VS-->>API: chunks
  API->>LLM: RAG prompt (chunks + question)
  LLM-->>API: stream tokens
  API-->>FE: stream answer
  FE->>S: render answer + page citations
```

### 4.6. Join a classroom

```mermaid
sequenceDiagram
  participant S as Student
  participant FE as Frontend
  participant API as Express API
  participant DB as PostgreSQL

  S->>FE: open /join/:code
  FE->>API: GET /api/classes/by-code/:code
  API->>DB: SELECT class WHERE code=?
  API-->>FE: class
  S->>FE: click Join
  FE->>API: POST /api/classes/join { code }
  API->>API: ensure same institution
  API->>DB: INSERT Enrollment
  API-->>FE: 200
  FE->>S: redirect to MyClassrooms
```

### 4.7. Real-time messaging

```mermaid
sequenceDiagram
  participant A as User A
  participant B as User B
  participant FE_A as Frontend A
  participant FE_B as Frontend B
  participant API as Express API
  participant DB as PostgreSQL
  participant IO as Socket.IO Hub

  FE_A->>IO: socket.connect()
  FE_B->>IO: socket.connect()
  FE_A->>IO: join room conversationId
  FE_B->>IO: join room conversationId
  A->>FE_A: type message
  FE_A->>API: POST /api/messages
  API->>DB: INSERT Message
  API->>IO: io.to(conversationId).emit("message:new", msg)
  IO-->>FE_A: message:new
  IO-->>FE_B: message:new
  FE_B->>B: append message in thread
  API->>DB: INSERT Notification for offline recipients
```

### 4.8. Onboard institution after Stripe checkout

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as Express API
  participant Stripe
  participant DB as PostgreSQL

  U->>FE: click "Upgrade to Institution"
  FE->>API: POST /api/stripe/checkout-institution
  API->>Stripe: create Checkout Session
  Stripe-->>FE: redirect URL
  FE->>U: Stripe Checkout page
  U->>Stripe: pay
  Stripe-->>API: webhook checkout.session.completed
  API->>DB: UPDATE users SET plan="institution"
  FE->>API: GET /api/auth/me (next request)
  API-->>FE: user has plan=institution, no institutionId
  FE->>FE: Guard sees needsInstitutionOnboarding()
  FE->>U: redirect to /onboarding/institution
  U->>FE: submit institution form
  FE->>API: POST /api/plan/institution { name, slug, logoUrl }
  API->>DB: INSERT Institution
  API->>DB: UPDATE users SET institutionId=?, role="institution_admin"
  API-->>FE: 200
  FE->>U: redirect to institution dashboard
```

---

## 5. Activity diagrams

### 5.1. Profile completeness gate (`Guard`)

```mermaid
flowchart TD
  A[Route requested] --> B{Token cookie present?}
  B -- no --> L[Redirect to /auth]
  B -- yes --> C{Role allowed for route?}
  C -- no --> L
  C -- yes --> D{Skip institution check?}
  D -- no --> E{Plan = institution & no institutionId?}
  E -- yes --> M[Redirect to /onboarding/institution]
  E -- no --> F{Allow incomplete profile?}
  D -- yes --> F
  F -- yes --> R[Render route]
  F -- no --> G{Profile complete?}
  G -- yes --> R
  G -- no --> N[Redirect to /profile]
```

### 5.2. Toggle problem as Free-tier (Super Admin)

```mermaid
flowchart TD
  A[Open FreeTierTab] --> B[Fetch problems]
  B --> C[Render toggles]
  C --> D{Click toggle on problem X}
  D --> E[PATCH /api/admin/problems/:id]
  E --> F{Success?}
  F -- yes --> G[Update local state]
  F -- no --> H[Show error toast]
```

### 5.3. Ban a user

```mermaid
flowchart TD
  A[Open UsersByPlanTab] --> B[Pick a user]
  B --> C[Click Ban]
  C --> D{Confirm modal}
  D -- cancel --> E[Stop]
  D -- confirm --> F[PATCH /api/admin/users/:id isActive:false]
  F --> G{Success?}
  G -- yes --> H[Mark user as banned in UI]
  G -- no --> I[Show error]
```

### 5.4. Generate certificate at 100% roadmap progress

```mermaid
flowchart TD
  A[Mark roadmap node as done] --> B[PATCH roadmapProgress]
  B --> C{Progress = 100%?}
  C -- no --> D[Stop]
  C -- yes --> E[Enable CertificateButton]
  E --> F[Click button]
  F --> G[Render Certificate component]
  G --> H[html2canvas snapshot]
  H --> I[jsPDF export]
  I --> J[Download .pdf]
```

---

## 6. State machines

### 6.1. CodeSubmission lifecycle

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Running : submitted
  Running --> Accepted : output matches expected
  Running --> WrongAnswer : output differs
  Running --> RuntimeError : exception in sandbox
  Running --> TimeLimit : exceeds wall time
  Accepted --> [*]
  WrongAnswer --> [*]
  RuntimeError --> [*]
  TimeLimit --> [*]
```

### 6.2. User plan lifecycle

```mermaid
stateDiagram-v2
  [*] --> Free
  Free --> Pro : Stripe checkout-pro success
  Free --> InstitutionPending : Stripe checkout-institution success
  InstitutionPending --> InstitutionActive : onboarding complete
  Pro --> Free : subscription cancelled
  InstitutionActive --> Free : subscription cancelled
```

### 6.3. InviteLink lifecycle

```mermaid
stateDiagram-v2
  [*] --> Created
  Created --> Active : saved with token + expiry
  Active --> Used : a visitor joins
  Active --> Exhausted : usedCount = maxUses
  Active --> Expired : now > expiresAt
  Active --> Revoked : admin deletes
  Used --> [*]
  Exhausted --> [*]
  Expired --> [*]
  Revoked --> [*]
```

---

## 7. Component diagram — Client folder structure

```mermaid
flowchart TB
  subgraph App["App.jsx"]
    Guard["Guard"]
    Sidebar["Sidebar"]
    Routes["Routes"]
  end

  Home["Home"]
  Auth["Auth / VerifyEmail / JoinInstitution / OnboardInstitution"]
  Profile["Profile"]
  Roadmap["RoadmapPage + OnboardingForm + NodeDetailPanel + CertificateButton"]
  Problems["ProblemsPage + ProblemPage + ProblemCreatePage"]
  Editor["Codeeditor + LanguageSelector + OutputPanel"]
  Dashboard["LearningDashboard + CodingDashboard + User"]
  Classroom["MyClassrooms + ClassroomView + JoinClassroom + ClassAssignmentsPage"]
  Messages["Messages"]
  PDF["PdfAssistant + ClassroomPdf"]
  AI["AIMentor + PlanSection"]
  Admin["AdminDashboard + InstitutionTab + FreeTierTab + ProTierTab + UsersByPlanTab + ModuleProblemsTab + ModuleAssignmentsTab"]

  Routes --> Home
  Routes --> Auth
  Routes --> Profile
  Routes --> Roadmap
  Routes --> Problems
  Problems --> Editor
  Routes --> Dashboard
  Routes --> Classroom
  Routes --> Messages
  Routes --> PDF
  Routes --> AI
  Routes --> Admin
```

---
