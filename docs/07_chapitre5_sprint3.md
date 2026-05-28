# Chapter 5 — Sprint 3

## I. Introduction

In this chapter, following the work of Sprint 2 (roadmap + code editor + problems), we present in detail all the steps needed to implement the **third increment** of OmniLearn.

## II. Sprint Objectives

Sprint 3 of OmniLearn focuses on the **collaboration layer**. Where Sprint 2 turned OmniLearn into a powerful single-user learning tool, Sprint 3 turns it into a true multi-actor platform. Key objectives:
- Build the **classroom system**: teacher creates a class linked to Grade / Speciality / Level, students join via a class code (`JoinClassroom.jsx`), and members see their classroom (`ClassroomView.jsx`).
- Add **assignments** (`ClassAssignmentsPage.jsx`) linked to modules / classes, with submission and grading flows.
- Implement the **announcements** broadcast inside a class.
- Implement the **real-time messaging system** with `Conversation`, `Message`, Socket.IO, and the `Messages.jsx` page.
- Add the **notifications** panel with `Notification.js` model and `notificationRoutes.js`.

## III. Sprint 3 Backlog

### Table 7 — Sprint 3 Backlog

| PBI | Main functionality | US Code | User story | Task ID | Tasks |
|---|---|---|---|---|---|
| **Classroom — Teacher / Institution Admin** | | | | | |
| 20 | Class management | US20.1 | As a teacher, I want to create a class. | 20.1 | Implement `Class` model in `Server/src/models/Class.js`. |
| | | | | 20.2 | `POST /api/classes` linked to a Grade / Speciality / Level. |
| | | US20.2 | As a teacher, I want a class code to invite students. | 20.3 | Generate a unique short code per class on creation. |
| | | US20.3 | As a teacher, I want to see enrolled students. | 20.4 | `GET /api/classes/:id/members` via `Enrollment` model. |
| 21 | Courses / modules / lessons | US21.1 | As a teacher, I want to create courses. | 21.1 | Implement `Course`, `Module`, `Lesson` models. |
| | | US21.2 | As a teacher, I want to create modules and lessons inside a course. | 21.2 | CRUD endpoints for `/api/courses`, `/api/modules`, `/api/lessons`. |
| **Classroom — Student** | | | | | |
| 14 | Join a classroom | US14.1 | As a student, I want to join with a code. | 14.1 | Build `JoinClassroom.jsx` at `/join/:code`. |
| | | | | 14.2 | `POST /api/classes/join` creates an `Enrollment`. |
| | | US14.2 | As a student, I want to see my classrooms. | 14.3 | Build `MyClassrooms.jsx` listing my enrollments. |
| | | US14.3 | As a student, I want to view a class's content. | 14.4 | Build `ClassroomView.jsx` showing modules, lessons, announcements, assignments. |
| **Assignments** | | | | | |
| 22 | Create assignment | US22.1 | As a teacher, I want to create an assignment linked to a module / class. | 22.1 | Implement `ClassAssignment` model. |
| | | | | 22.2 | `POST /api/assignments` creates the assignment. |
| | | US22.2 | As a teacher, I want to attach problems to an assignment. | 22.3 | Build `ModuleProblemsTab.jsx` and `ModuleAssignmentsTab.jsx`. |
| | | US22.3 | As a teacher, I want to grade submissions. | 22.4 | `Grade` model + `POST /api/grades`. |
| | | US22.4 | As a student, I want to see and submit assignments. | 22.5 | Build `ClassAssignmentsPage.jsx`. |
| **Announcements** | | | | | |
| 23 | Class announcements | US23.1 | As a teacher, I want to post an announcement to a class. | 23.1 | Implement `Announcement` model and CRUD routes. |
| | | | | 23.2 | Display announcements in `ClassroomView.jsx`. |
| **Messaging — Real-time** | | | | | |
| 16 | Conversations | US16.1 | As a user, I want to see my conversations. | 16.1 | Implement `Conversation` and `Message` models. |
| | | | | 16.2 | `GET /api/conversations` returns my conversations with last message. |
| | | US16.2 | As a user, I want to send a message in real time. | 16.3 | Build `Messages.jsx` page with thread view. |
| | | | | 16.4 | `POST /api/messages` persists the message. |
| | | | | 16.5 | Implement `Server/src/realtime/messageHub.js` (Socket.IO) for broadcast. |
| | | | | 16.6 | Use `socket.io-client` on the frontend to receive new messages live. |
| | | US16.3 | As a user, I want to be notified of new messages. | 16.7 | Push a `Notification` row + Socket.IO event when a message is received. |
| | | | | 16.8 | Build a notifications dropdown in the sidebar. |

## IV. Design

### 1. Use-Case Diagrams

The use-case diagrams below were re-derived directly from the Sprint 3 routes
(`adminRoutes.js`, `UserRoutes.js`, `assignmentRoutes.js`, `messageRoutes.js`,
`conversationRoutes.js`, `notificationRoutes.js`) and the Sprint 3 React pages
(`JoinClassroom.jsx`, `MyClassrooms.jsx`, `ClassroomView.jsx`,
`ClassAssignmentsPage.jsx`, `ClassroomProblemsTab.jsx`, `Messages.jsx`).
Every API endpoint and every UI action has been mapped to a use case so the
diagrams reflect the real surface of the increment — not a simplified subset.

The arrows follow the UML 2.5 convention:

- **«include»** — *base* → *included* (the base always triggers the included behavior).
- **«extend»** — *extension* → *base* (the extension is optional and attaches at an extension point).
- **Generalization** — *child actor* ▷ *parent actor* (the child inherits the parent's use cases).

The two diagrams share an `Authenticated User` actor: messaging and
notifications belong to every signed-in user, so both `Student` and `Teacher`
inherit them through generalization. The `Realtime Hub` (Socket.IO) is a
secondary system actor because it pushes events to the user without the user
requesting them.

#### Student side

This diagram covers everything a student can do in Sprint 3 — joining a class
(by code or by accepting an invitation notification), browsing the classroom
content (courses → modules → lessons with PDF, announcements, classmates),
working on assignments (open → solve attached problems → submit, with optional
AI Mentor / AI correction when the teacher has not locked them), messaging
(private chats with the free-tier contact cap, group conversations with
invites, attachments and the `/stackoverflow` slash command), and the
notifications panel with real-time push.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  classDef actor    fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#7c2d12
  classDef sysactor fill:#ecfeff,stroke:#0891b2,stroke-width:2px,color:#083344
  classDef uc       fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef sys      fill:#f8fafc,stroke:#475569,stroke-width:1.5px,stroke-dasharray:6 4,color:#0f172a

  AuthUser((Authenticated<br/>User)):::actor
  Student((Student)):::actor
  Hub((Realtime Hub<br/>Socket.IO)):::sysactor

  Student -- "generalization" --> AuthUser

  subgraph S["OmniLearn — Sprint 3 — Student scope"]
    direction TB

    %% ── Enrollment ───────────────────────────────────────────────
    subgraph SEnr["Classroom enrollment"]
      direction TB
      JoinCode(["Join classroom<br/>(by code)"]):::uc
      RecvInvite(["Receive classroom<br/>invitation"]):::uc
      AcceptInvite(["Accept invitation"]):::uc
      DeclineInvite(["Decline invitation"]):::uc
      PlanGate(["Check Institution<br/>plan gate"]):::uc
    end

    %% ── Classroom consumption ────────────────────────────────────
    subgraph SCls["Classroom consumption"]
      direction TB
      ListMine(["View my<br/>classrooms"]):::uc
      OpenClass(["Open a classroom"]):::uc
      ViewMembers(["View teacher<br/>& classmates"]):::uc
      ReadAnn(["Read class<br/>announcements"]):::uc
      BrowseCourses(["Browse courses<br/>& modules"]):::uc
      OpenLesson(["Open a lesson"]):::uc
      ViewLessonPdf(["View lesson PDF"]):::uc
      ViewClassBank(["View classroom<br/>problem bank"]):::uc
    end

    %% ── Assignments ──────────────────────────────────────────────
    subgraph SAss["Assignments"]
      direction TB
      ListAss(["See assignments<br/>(progress + due)"]):::uc
      OpenAss(["Open an<br/>assignment"]):::uc
      SolveProblem(["Solve an<br/>attached problem"]):::uc
      SubmitCode(["Submit code"]):::uc
      UseMentor(["Use AI Mentor"]):::uc
      UseCorrect(["Use AI code<br/>correction"]):::uc
    end

    %% ── Messaging ────────────────────────────────────────────────
    subgraph SMsg["Real-time messaging"]
      direction TB
      ListConv(["View conversation<br/>list"]):::uc
      SearchUsers(["Search users"]):::uc
      StartPrivate(["Start private chat"]):::uc
      FreeContactCap(["Free-tier contact<br/>limit warning"]):::uc
      OpenConv(["Open a<br/>conversation"]):::uc
      ReadHistory(["Read message<br/>history"]):::uc
      SendMsg(["Send a message"]):::uc
      Attach(["Upload attachment<br/>(image / file)"]):::uc
      SlashSO(["/stackoverflow<br/>slash command"]):::uc
      RecvMsg(["Receive real-time<br/>message"]):::uc
      CreateGroup(["Create group<br/>conversation"]):::uc
      InviteMember(["Invite members<br/>to group"]):::uc
      FreeGroupCap(["Free-tier group<br/>limit warning"]):::uc
      AcceptGroup(["Accept group<br/>invite"]):::uc
      RejectGroup(["Reject group<br/>invite"]):::uc
      LeaveGroup(["Leave a group"]):::uc
      ConvPhoto(["Change conversation<br/>photo"]):::uc
    end

    %% ── Notifications ────────────────────────────────────────────
    subgraph SNot["Notifications"]
      direction TB
      ListNot(["View notifications<br/>panel"]):::uc
      ReadNot(["Mark notification<br/>as read"]):::uc
      RecvNot(["Receive real-time<br/>notification"]):::uc
    end
  end
  class S sys

  %% ── Direct associations (student) ──────────────────────────────
  Student --- JoinCode
  Student --- RecvInvite
  Student --- ListMine
  Student --- OpenClass

  %% ── Direct associations (any authenticated user) ───────────────
  AuthUser --- ListConv
  AuthUser --- SearchUsers
  AuthUser --- StartPrivate
  AuthUser --- OpenConv
  AuthUser --- CreateGroup
  AuthUser --- LeaveGroup
  AuthUser --- ConvPhoto
  AuthUser --- ListNot
  AuthUser --- ReadNot

  %% ── System actor pushes (initiated by the hub) ─────────────────
  Hub --- RecvMsg
  Hub --- RecvNot

  %% ── Enrollment relations ───────────────────────────────────────
  JoinCode      -. "«include»" .-> PlanGate
  RecvInvite    -. "«include»" .-> ListNot
  AcceptInvite  -. "«extend»"  .-> RecvInvite
  DeclineInvite -. "«extend»"  .-> RecvInvite

  %% ── Classroom relations ───────────────────────────────────────
  OpenClass     -. "«include»" .-> ViewMembers
  OpenClass     -. "«include»" .-> ReadAnn
  OpenClass     -. "«include»" .-> BrowseCourses
  OpenClass     -. "«include»" .-> ListAss
  OpenClass     -. "«include»" .-> ViewClassBank
  BrowseCourses -. "«include»" .-> OpenLesson
  ViewLessonPdf -. "«extend»"  .-> OpenLesson

  %% ── Assignments relations ────────────────────────────────────
  ListAss     -. "«extend»"  .-> OpenAss
  OpenAss     -. "«include»" .-> SolveProblem
  SolveProblem -. "«include»".-> SubmitCode
  UseMentor   -. "«extend»"  .-> SolveProblem
  UseCorrect  -. "«extend»"  .-> SolveProblem

  %% ── Messaging relations ──────────────────────────────────────
  StartPrivate   -. "«include»" .-> SearchUsers
  FreeContactCap -. "«extend»"  .-> StartPrivate
  OpenConv       -. "«include»" .-> ReadHistory
  OpenConv       -. "«include»" .-> SendMsg
  Attach         -. "«extend»"  .-> SendMsg
  SlashSO        -. "«extend»"  .-> SendMsg
  CreateGroup    -. "«include»" .-> InviteMember
  FreeGroupCap   -. "«extend»"  .-> CreateGroup
  AcceptGroup    -. "«extend»"  .-> RecvInvite
  RejectGroup    -. "«extend»"  .-> RecvInvite
```

> *Figure 38 — Use-case diagram of Sprint 3 — Student side.*

#### Teacher side

This diagram covers the teacher surface of Sprint 3 — classroom CRUD with an
auto-generated invite code bound to Grade / Speciality / Level, student
roster (invite + remove), the Course → Module → Lesson catalog with PDF
upload, the per-classroom problem bank, the assignment workflow
(draft → publish → notify → track) and the announcements feed. Messaging and
notifications are inherited from `Authenticated User` exactly as on the
student side. To keep the diagram compact, the relations are restricted to
direct associations and `«include»` only.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  classDef actor    fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#7c2d12
  classDef sysactor fill:#ecfeff,stroke:#0891b2,stroke-width:2px,color:#083344
  classDef uc       fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef sys      fill:#f8fafc,stroke:#475569,stroke-width:1.5px,stroke-dasharray:6 4,color:#0f172a

  AuthUser((Authenticated<br/>User)):::actor
  Teacher((Teacher)):::actor
  Student2((Student)):::actor
  Hub((Realtime Hub<br/>Socket.IO)):::sysactor

  Teacher -- "generalization" --> AuthUser

  subgraph T["OmniLearn — Sprint 3 — Teacher scope"]
    direction TB

    %% ── Classroom management ────────────────────────────────────
    subgraph TCls["Classroom management"]
      direction TB
      ManageClass(["Manage my classrooms<br/>(create / rename /<br/>archive / delete / list)"]):::uc
      GenCode(["Generate unique<br/>invite code"]):::uc
      BindCurriculum(["Bind Grade /<br/>Speciality / Level"]):::uc
      OpenCls(["Open classroom<br/>workspace"]):::uc
    end

    %% ── Roster management ───────────────────────────────────────
    subgraph TRos["Student roster"]
      direction TB
      ManageRoster(["Manage student roster<br/>(list / remove)"]):::uc
      InviteSelected(["Invite students<br/>(picker)"]):::uc
      NotifyInvited(["Notify invited<br/>students"]):::uc
    end

    %% ── Catalog (courses / modules / lessons) ──────────────────
    subgraph TCat["Course catalog"]
      direction TB
      ManageCatalog(["Manage course catalog"]):::uc
      CRUDModule(["Manage modules"]):::uc
      CRUDLesson(["Manage lessons"]):::uc
      UploadPdf(["Upload lesson PDF"]):::uc
    end

    %% ── Class problem bank ─────────────────────────────────────
    ManageBank(["Manage classroom<br/>problem bank<br/>(manual / AI / fork / delete)"]):::uc

    %% ── Assignments ────────────────────────────────────────────
    subgraph TAss["Assignment workflow"]
      direction TB
      CreateAss(["Create assignment<br/>(draft)"]):::uc
      PickProblems(["Pick problems<br/>(global + inst + class)"]):::uc
      ConfigAss(["Set due date,<br/>max attempts &<br/>AI / language locks"]):::uc
      ManageAss(["Edit / delete<br/>assignment"]):::uc
      PublishAss(["Publish /<br/>unpublish"]):::uc
      NotifyAss(["Notify enrolled<br/>students"]):::uc
      ViewRoster(["View completion<br/>roster"]):::uc
      ViewSubs(["View a student's<br/>submissions"]):::uc
      ViewStats(["View assignment<br/>statistics"]):::uc
    end

    %% ── Announcements ──────────────────────────────────────────
    ManageAnn(["Manage class<br/>announcements<br/>(post / edit / delete)"]):::uc

    %% ── Messaging / notifications (inherited) ─────────────────
    subgraph TMsg["Messaging & notifications<br/>(inherited from Authenticated User)"]
      direction TB
      TConv(["Use conversations<br/>(private + groups)"]):::uc
      TGroupAdmin(["Administer owned groups<br/>(rename / ban /<br/>invite / delete)"]):::uc
      TNot(["Use notifications<br/>panel"]):::uc
      TRecvMsg(["Receive real-time<br/>message"]):::uc
      TRecvNot(["Receive real-time<br/>notification"]):::uc
    end
  end
  class T sys

  %% ── Teacher direct associations ────────────────────────────
  Teacher --- ManageClass
  Teacher --- OpenCls
  Teacher --- ManageRoster
  Teacher --- InviteSelected
  Teacher --- ManageCatalog
  Teacher --- ManageBank
  Teacher --- CreateAss
  Teacher --- ManageAss
  Teacher --- PublishAss
  Teacher --- ViewRoster
  Teacher --- ViewStats
  Teacher --- ManageAnn

  %% ── AuthUser-inherited associations ────────────────────────
  AuthUser --- TConv
  AuthUser --- TGroupAdmin
  AuthUser --- TNot

  %% ── Realtime push (system actor) ───────────────────────────
  Hub --- TRecvMsg
  Hub --- TRecvNot

  %% ── Cross-actor: students receive teacher-emitted events ───
  NotifyInvited --- Student2
  NotifyAss     --- Student2

  %% ── «include» relations ────────────────────────────────────
  ManageClass    -. "«include»" .-> GenCode
  ManageClass    -. "«include»" .-> BindCurriculum
  InviteSelected -. "«include»" .-> NotifyInvited
  ManageCatalog  -. "«include»" .-> CRUDModule
  CRUDModule     -. "«include»" .-> CRUDLesson
  CRUDLesson     -. "«include»" .-> UploadPdf
  CreateAss      -. "«include»" .-> PickProblems
  CreateAss      -. "«include»" .-> ConfigAss
  PublishAss     -. "«include»" .-> NotifyAss
  ViewRoster     -. "«include»" .-> ViewSubs
```

> *Figure 39 — Use-case diagram of Sprint 3 — Teacher side.*

#### What changed vs. the previous version

The earlier diagrams listed about a third of the real Sprint-3 surface and mis-used the `«include»` / `«extend»` notation (for example "Send extends See notifications", which inverts cause and effect). The revised diagrams:

- map **every** Sprint-3 endpoint and UI action one-to-one to a use case (classroom CRUD with rename / archive / delete; notification-based invitations with accept / decline; lesson PDF viewer; classroom problem bank with manual + AI + fork + delete; full assignment workflow including draft / publish / unpublish / edit / delete / roster / per-student submissions / aggregate stats; AI Mentor and AI correction locks; group conversations with invites, attachments, slash commands, photo, ban and leave; mark-as-read; real-time receive paths);
- introduce a generalized `Authenticated User` actor so messaging and notifications appear once and are inherited by both Student and Teacher;
- introduce a `Realtime Hub` (Socket.IO) system actor for events that are pushed to the user rather than requested;
- enforce UML 2.5 directions — `«include»` from *base* to *included*, `«extend»` from *extension* to *base*;
- replace the misleading `Send «extend» Notif` shortcut with a `Publish «include» Notify enrolled students` flow on the teacher side and a `Receive notification` use case driven by the `Realtime Hub` on the student side, which matches the actual `emitNotification(...)` calls in `messageHub.js`.

### 2. Sequence Diagrams

#### 2.1. Sequence diagram — "Join a classroom"

The student opens the join link with the class code.
The server checks the code, adds the student to the class, and sends them to their classroom list.

```mermaid
sequenceDiagram
    actor Student
    participant FE as Frontend
    participant API as Backend
    participant DB as Database

    Note over Student,DB: ref: Authenticate

    Student->>+FE: Open /join/:code
    FE->>+API: POST /classes/join { code }
    API->>+DB: Find class by code
    DB-->>-API: Class or null

    alt Class not found
        API-->>FE: 404 Not found
    else Institution mismatch
        API-->>FE: 403 Forbidden
    else OK
        API->>+DB: Insert Enrollment
        DB-->>-API: Enrolled
        API-->>FE: 201 class
    end

    API-->>-FE: Response
    FE-->>-Student: Redirect or show error
```

> *Figure 40 — Sequence diagram "Join a classroom".*

#### 2.2. Sequence diagram — "Send a real-time message"

A user sends a message, and the server saves it then pushes it live to the other user.
If the other user is offline, a notification is stored for them to see later.

```mermaid
sequenceDiagram
    actor A as UserA
    actor B as UserB
    participant FE as Frontend
    participant API as Backend
    participant Hub as Socket.IO
    participant DB as DB

    Note over A,DB: ref: Authenticate

    A->>FE: Type message
    FE->>API: POST /messages
    API->>DB: Insert Message
    API->>Hub: Emit message:new

    par Fan-out
        Hub-->>FE: echo to A
        FE-->>A: Append
    and
        Hub-->>B: message:new
    end

    opt B offline
        API->>DB: Insert Notification
    end

    API-->>FE: 201 message
    FE-->>A: Sent
```

> *Figure 41 — Sequence diagram "Send a real-time message".*

### 3. Activity Diagrams

#### 3.1. Activity diagram — "Create an assignment"

This diagram shows the steps the teacher follows to create an assignment.
The teacher fills the form, picks problems, the server checks the rights, saves the assignment, and notifies the students.

```mermaid
flowchart TD
  A([Start]) --> B[Fill assignment form]
  B --> C[Pick problems]
  C --> D{Teacher of the class?}
  D -- No --> E[Refused] --> Z([End])
  D -- Yes --> F[Save assignment]
  F --> G[Notify students]
  G --> Z
```

> *Figure 43 — Activity diagram "Create an assignment".*

### 4. Class Diagram

This diagram shows the main data tables added in Sprint 3 (classes, courses, assignments, messages, notifications) and how they are linked.
It explains how a teacher, a class, and its students share content and chat together.

```mermaid
classDiagram
  class User {
    +UUID id
    +enum role
    +UUID institutionId
  }
  class Class {
    +UUID id
    +string name
    +string code
    +UUID gradeId
    +UUID specialityId
    +UUID levelId
    +UUID teacherId
    +UUID institutionId
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
    +UUID[] problemIds
  }
  class Announcement {
    +UUID id
    +string title
    +text body
    +UUID classId
    +UUID authorId
    +Date createdAt
  }
  class Conversation {
    +UUID id
    +string name
    +UUID[] participantIds
    +Date createdAt
  }
  class Message {
    +UUID id
    +UUID conversationId
    +UUID senderId
    +text body
    +Date createdAt
  }
  class Notification {
    +UUID id
    +UUID userId
    +string type
    +JSON payload
    +Date readAt
  }

  User "1"  --> "*" Class       : teaches
  User "1"  --> "*" Enrollment  : enrolls
  Class "1" --> "*" Enrollment  : has
  Class "1" --> "*" Course      : contains
  Course "1" --> "*" Module     : contains
  Module "1" --> "*" Lesson     : contains
  Module "1" --> "*" ClassAssignment : produces
  Class "1" --> "*" Announcement     : has
  User  "1" --> "*" Conversation     : participates
  Conversation "1" --> "*" Message   : holds
  User  "1" --> "*" Notification     : receives
```

> *Figure 44 — Class diagram of Sprint 3.*

### 5. C4 Container view

This view shows the main parts of the app: the web frontend, the API, the real-time message hub, and the database.
The frontend talks to the API for normal requests and to the hub for live messages.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  SPA["React SPA<br/>+ socket.io-client"]
  API["Web API<br/>Express 5"]
  Hub["Socket.IO Hub<br/>(messageHub.js)"]
  DB[("PostgreSQL")]
  Cloud[(Cloudinary)]

  SPA  -- "HTTPS / JSON · JWT"                   --> API
  SPA  <-- "WebSocket · JWT handshake"           --> Hub
  API  -- "Sequelize"                            --> DB
  API  -- "lesson PDFs"                          --> Cloud
  API  -. "message:new · notification:new"       .-> Hub
  Hub  -- "Sequelize"                            --> DB
```

> *Figure 44.1 — Sprint 3 — C4 Container view.*

### 6. C4 Component view

This view zooms inside the API to show the routes for classes, courses, assignments, messages, and notifications.
It also shows the inside of the message hub that handles live chat and notifications.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart TB
  subgraph WebAPI["Container — Web API + Realtime"]
    direction TB

    subgraph ClassC["classRoutes.js"]
      CCre["POST /classes"]
      CList["GET  /classes/mine"]
      CJoin["POST /classes/join"]
      CMem["GET  /classes/:id/members"]
    end

    subgraph CurC["course / module / lesson routes"]
      CrCRUD["CRUD /courses"]
      MoCRUD["CRUD /modules"]
      LeCRUD["CRUD /lessons"]
    end

    subgraph AssC["assignmentRoutes.js"]
      ACre["POST /assignments"]
      ASub["POST /assignments/:id/submissions"]
      AGr["POST /grades"]
    end

    subgraph AnnC["announcementRoutes.js"]
      AnCRUD["CRUD /announcements"]
    end

    subgraph ConvC["conversation + message routes"]
      CvList["GET  /conversations"]
      MsPost["POST /messages"]
    end

    subgraph NotC["notificationRoutes.js"]
      NList["GET   /notifications"]
      NRead["PATCH /notifications/:id/read"]
    end

    subgraph Hub["messageHub.js (Socket.IO)"]
      Hand["JWT handshake"]
      Rooms["Room manager — one room per conversation"]
      Pres["Presence tracker (userId → sockets)"]
      Bcast["Broadcaster — message:new"]
      Fan["Notification fan-out (offline)"]
      DC["Disconnect cleanup"]
    end

    MW["authenticate + role gate"]
    CM["Class model"]
    EM["Enrollment model"]
    CrM["Course / Module / Lesson models"]
    AM["ClassAssignment / Grade models"]
    NM["Announcement model"]
    CvM["Conversation / Message models"]
    NotM["Notification model"]
  end

  PG[(PostgreSQL)]
  CloudExt[(Cloudinary — lesson PDFs)]
  Client[/"socket.io-client (browser)"/]

  CCre  --> MW --> CM
  CList --> EM
  CJoin --> EM
  CMem  --> EM

  CrCRUD --> MW --> CrM
  MoCRUD --> MW --> CrM
  LeCRUD --> MW --> CrM
  LeCRUD --> CloudExt

  ACre --> MW --> AM
  ASub --> MW --> AM
  AGr  --> MW --> AM

  AnCRUD --> MW --> NM

  CvList --> CvM
  MsPost --> MW --> CvM
  MsPost --> Bcast

  Hand --> Rooms
  Hand --> Pres
  Bcast --> Rooms
  Bcast --> Fan --> Pres
  Fan --> NotM
  DC --> Rooms
  DC --> Pres

  Bcast -. "WS push" .-> Client
  Fan   -. "notification:new" .-> Client

  NList --> NotM
  NRead --> NotM

  CM   --> PG
  EM   --> PG
  CrM  --> PG
  AM   --> PG
  NM   --> PG
  CvM  --> PG
  NotM --> PG
```

> *Figure 44.2 — Sprint 3 — C4 Component view.*

## V. Implementation

### 1. My classrooms (student)

This page shows all the classes the student has joined, as a grid of cards.
The student can also join a new class here by entering an invitation code.

> *Figure 48 — `MyClassrooms` listing of the student's enrolled classes.*

### 2. Classroom view

This page gathers everything in one class: modules, lessons, announcements, and assignments, split into tabs.
A side panel shows the teacher and the other students of the class.

> *Figure 49 — Classroom view (modules, lessons, announcements).*

### 3. Join a classroom

This page shows a short summary of the class (name, teacher, subject) found from the invitation code.
The student clicks one button to join and is sent directly into the classroom.

> *Figure 50 — Join a classroom page.*

### 4. Assignments page

This page lists all the assignments given by the teacher, with the due date and the status of each one.
The student can open an assignment, do the exercises, and submit the work from the same page.

> *Figure 51 — Class assignments page.*

### 5. Create a classroom (teacher)

The teacher fills a short form to start a new class and shares it with students through an auto-generated invite link and class code.

#### 5.1. Create-classroom form

The teacher names the class and links it to a Grade, Speciality and Level.

> *Figure 50.1 — Teacher's create-classroom form.*

#### 5.2. Invite link and class code

Once saved, the system shows a shareable invite link and a short code students use to join the class.

> *Figure 50.2 — Created classroom showing the invite link and class code.*

### 6. Classroom problem bank (teacher)

This tab holds all the problems that belong only to the teacher's class.
The teacher can add problems manually or generate them with AI, and later use them in assignments.

> *Figure 51.1 — Classroom problem bank used by the teacher.*

### 7. Creating an assignment (teacher)

This form lets the teacher set a title, a due date, and pick problems from the class bank to build an assignment.
Once saved, the assignment shows up for all students, and the teacher can check their progress with a Stats button.

> *Figure 51.2 — Teacher's assignment editor with the problem picker driven by the class bank.*

### 8. Real-time messaging (`Messages.jsx`)

This page has two panels: the list of conversations on the left and the chosen chat on the right.
Messages are sent and received instantly, like in a normal messaging app.

> *Figure 53 — Real-time messaging page.*

## VI. Conclusion

Sprint 3 transformed OmniLearn into a real collaborative platform — classrooms, assignments, announcements, real-time messaging and notifications all came online. The next chapter — Sprint 4 — focuses on the AI-grounded PDF assistant and the full Institution / Super Admin management consoles.

---
