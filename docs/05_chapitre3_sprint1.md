# Chapter 3 — Sprint 1

## I. Introduction

In this chapter we explore the key steps for the realization of the **first increment** of OmniLearn. After identifying user needs and reviewing the global use cases, this first sprint focuses on the **essential foundations** needed to launch the platform.

## II. Sprint Objectives

The main objective of Sprint 1 is to deliver the building blocks that all later sprints depend on:

- A public **landing page** (`/`) that introduces OmniLearn and its three plans.
- A complete **authentication system**: signup, login, email verification, password reset, and optional **2FA** (TOTP via Speakeasy + QR code).
- The **user profile** page (avatar, bio, GitHub URL, LinkedIn URL) — and the profile-completion check enforced by the `Guard` component in `App.jsx`.
- A first cut of the **plan system**: Free / Pro / Institution recorded on the user record (`plan` enum + `planJoinedAt`).
- A first **Stripe Checkout** integration that lets a Free user upgrade to Pro.
- A first version of the **role-based sidebar** that branches between Free / Pro / Institution navigation.

## III. Sprint 1 Backlog

The table below lists all user stories and tasks planned for Sprint 1, grouped by actor (Visitor, Student, Cross-cutting). It is the work the team commits to deliver in this sprint.

### Table 5 — Sprint 1 Backlog

| PBI | Main functionality | US Code | User story | Task ID | Tasks |
|:---:|:---|:---:|:---|:---:|:---|
| **Visitor** | | | | | |
| 1 | Landing page | US1.1 | As a visitor, I want to browse the public landing page. | 1.1 | Build the `Home` page in `Client/src/Home/Home.jsx`. |
|   |   |   |   | 1.2 | Display the three plans (Free / Pro / Institution) with CTAs. |
| 2 | Sign up | US2.1 | As a visitor, I want to create an account. | 2.1 | Create the `Auth` page (`Client/src/Auth/Auth.jsx`) with sign-up tab. |
|   |   |   |   | 2.2 | Add input validation (email, password strength). |
|   |   |   |   | 2.3 | Implement the `User` Sequelize model in `Server/src/models/User.js`. |
|   |   |   |   | 2.4 | Implement the `POST /api/auth/register` route in `authRoutes.js`. |
|   |   |   |   | 2.5 | Hash passwords with bcryptjs (`BCRYPT_ROUNDS` from config). |
|   |   |   |   | 2.6 | Send a verification email (Nodemailer) with `emailVerificationToken`. |
| 3 | Verify email | US3.1 | As a visitor, I want to verify my email. | 3.1 | Build the `VerifyEmail` page (`Client/src/Auth/VerifyEmail.jsx`). |
|   |   |   |   | 3.2 | Implement `GET /api/auth/verify-email?token=...` and clear the expiry. |
| 4 | Choose a plan | US4.1 | As a visitor, I want to choose between Free, Pro and Institution. | 4.1 | Plan selector on the sign-up form; default = `free`. |
|   |   |   |   | 4.2 | Pro and Institution route to Stripe Checkout after signup. |
| **Student / Authenticated user** | | | | | |
| 5 | Sign in | US5.1 | As a student, I want to sign in. | 5.1 | Sign-in tab in the `Auth` page. |
|   |   |   |   | 5.2 | `POST /api/auth/login` returning a JWT and the user object. |
|   |   |   |   | 5.3 | Store `token` and `user` in cookies via `js-cookie`. |
| 6 | Profile management | US6.1 | As a student, I want to view my profile. | 6.1 | Build `Profile` page (`Client/src/components/Profile.jsx`). |
|   |   |   |   | 6.2 | `GET /api/profile/:id` returns the current user. |
|   |   | US6.2 | As a student, I want to update my profile. | 6.3 | Avatar upload (Cloudinary), bio, GitHub URL, LinkedIn URL. |
|   |   |   |   | 6.4 | `PATCH /api/profile/:id` validates and updates the user. |
|   |   |   |   | 6.5 | Emit a `profile-updated` event so `Guard` re-checks profile completeness. |
|   |   | US6.3 | As a student, I want to delete my account. | 6.6 | Add a destructive action in the profile page. |
|   |   |   |   | 6.7 | `DELETE /api/profile/:id`. |
| 7 | Password reset | US7.1 | As a student, I want to reset my password. | 7.1 | Forgot-password link in the sign-in tab. |
|   |   |   |   | 7.2 | `POST /api/auth/forgot-password` generates `passwordResetToken`. |
|   |   |   |   | 7.3 | Send the reset email via Nodemailer. |
|   |   |   |   | 7.4 | `POST /api/auth/reset-password` validates the token and rehashes. |
| 8 | Two-factor authentication | US8.1 | As a student, I want to enable 2FA. | 8.1 | Toggle in the profile page. |
|   |   |   |   | 8.2 | `POST /api/auth/2fa/setup` generates the Speakeasy secret + QR. |
|   |   |   |   | 8.3 | `POST /api/auth/2fa/verify` confirms the TOTP and sets `is2FAEnabled`. |
| **Cross-cutting** | | | | | |
| 33 (partial) | Stripe checkout — Pro upgrade | US33.1 | As a Free user, I want to upgrade to Pro. | 33.1 | Add `stripeRoutes.js` and a `/api/stripe/checkout-pro` endpoint. |
|   |   |   |   | 33.2 | Build the `PlanSection` component (`Client/src/components/PlanSection.jsx`). |
|   |   |   |   | 33.3 | Update `users.plan` to `pro` on a successful Stripe webhook. |

## IV. Design

In this section we elaborate the use-case diagram, the sequence diagrams, the activity diagrams, the class diagram and the C4 component view for Sprint 1.

### 1. Use-Case Diagram

#### Visitor side

A visitor (not logged in) can browse the landing page, sign up, verify their email, choose a plan and sign in.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  classDef actor fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#7c2d12
  classDef uc    fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef sys   fill:#f8fafc,stroke:#475569,stroke-width:1.5px,stroke-dasharray:6 4,color:#0f172a

  Visitor((Visitor)):::actor

  subgraph S["OmniLearn — Sprint 1 (Visitor scope)"]
    direction TB
    UC1(["Browse landing page"]):::uc
    UC2(["Sign up"]):::uc
    UC3(["Verify email"]):::uc
    UC4(["Choose a plan"]):::uc
    UC5(["Sign in"]):::uc
    UC6(["Pay via Stripe Checkout"]):::uc
  end
  class S sys

  Visitor --- UC1
  Visitor --- UC2
  Visitor --- UC3
  Visitor --- UC4
  Visitor --- UC5
  UC2 -. "«include»" .-> UC4
  UC2 -. "«include»" .-> UC3
  UC4 -. "«extend»"  .-> UC6
```

> *Figure 6 — Use-case diagram of Sprint 1 — Visitor side.*

#### Student / authenticated user side

The Student manages profile, 2FA, Google account and subscription; all *Manage X* parents share the same *Authenticate* check. Standalone actions (sign in, sign out, reset password, resend verification) sit outside, with secondary actors Google OAuth, Stripe, Cloudinary and Mailer.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  classDef actor   fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#7c2d12
  classDef ext     fill:#fef9c3,stroke:#a16207,stroke-width:2px,color:#713f12
  classDef parent  fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
  classDef uc      fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef shared  fill:#f1f5f9,stroke:#475569,stroke-width:1.5px,stroke-dasharray:4 2,color:#0f172a
  classDef sys     fill:#f8fafc,stroke:#475569,stroke-width:1.5px,stroke-dasharray:6 4,color:#0f172a

  Student((Student)):::actor

  subgraph S["OmniLearn — Authenticated user scope (Sprint 1)"]
    direction TB

    %% Parent (manage) use cases
    GP(["Manage profile"]):::parent
    G2(["Manage 2FA"]):::parent
    GG(["Manage Google account"]):::parent
    GS(["Manage subscription"]):::parent

    %% Profile specialisations
    VP(["Consult profile"]):::uc
    CP(["Complete profile"]):::uc
    UP(["Update profile"]):::uc
    DP(["Delete account"]):::uc

    %% 2FA specialisations
    E2(["Enable 2FA (TOTP + QR)"]):::uc
    D2(["Disable 2FA"]):::uc

    %% Google specialisations
    GL(["Link Google account"]):::uc
    GU(["Unlink Google account"]):::uc

    %% Plan specialisations
    VPL(["View current plan"]):::uc
    UPL(["Upgrade plan (Pro / Institution)"]):::uc

    %% Standalone use cases
    L(["Sign in"]):::uc
    LG(["Sign in with Google"]):::uc
    SO(["Sign out"]):::uc
    RP(["Reset password"]):::uc
    SV(["Resend verification email"]):::uc

    %% Shared / sub use cases
    AUTH(["Authenticate"]):::shared
    CT(["Verify TOTP code"]):::shared
    UA(["Upload avatar"]):::shared
    PAY(["Pay via Stripe Checkout"]):::shared
  end
  class S sys

  %% Secondary actors
  Google((Google OAuth)):::ext
  Stripe((Stripe)):::ext
  Cloud((Cloudinary)):::ext
  Mail((Mailer)):::ext

  %% Student → top-level use cases
  Student --- GP
  Student --- G2
  Student --- GG
  Student --- GS
  Student --- L
  Student --- LG
  Student --- SO
  Student --- RP
  Student --- SV

  %% Generalisation (specialise — solid arrow toward the parent)
  VP  --> GP
  CP  --> GP
  UP  --> GP
  DP  --> GP
  E2  --> G2
  D2  --> G2
  GL  --> GG
  GU  --> GG
  VPL --> GS
  UPL --> GS

  %% «include» — always happens
  GP  -. "«include»" .-> AUTH
  G2  -. "«include»" .-> AUTH
  GG  -. "«include»" .-> AUTH
  GS  -. "«include»" .-> AUTH
  SO  -. "«include»" .-> AUTH
  SV  -. "«include»" .-> AUTH
  E2  -. "«include»" .-> CT
  D2  -. "«include»" .-> CT
  UPL -. "«include»" .-> PAY

  %% «extend» — conditional / optional branch
  L  -. "«extend»" .-> CT
  UP -. "«extend»" .-> UA
  LG -. "«extend»" .-> CP

  %% Secondary actors → use cases they collaborate on
  LG  --- Google
  GL  --- Google
  PAY --- Stripe
  UA  --- Cloud
  RP  --- Mail
  SV  --- Mail
```

> *Figure 7 — Use-case diagram of Sprint 1 — Student side.*

Solid arrows are generalisations (child → parent), `«include»` marks always-on steps (Authenticate, Verify TOTP, Stripe Checkout) and `«extend»` marks conditional ones (TOTP only if 2FA on, avatar only if picked, Complete profile only on first Google sign-in).

#### Admin side

The Admin manages users, the global curriculum, classrooms and announcements, and reads platform statistics. All actions go through the shared *Authenticate (admin role)* check.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  classDef actor   fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#7c2d12
  classDef ext     fill:#fef9c3,stroke:#a16207,stroke-width:2px,color:#713f12
  classDef parent  fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
  classDef uc      fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef shared  fill:#f1f5f9,stroke:#475569,stroke-width:1.5px,stroke-dasharray:4 2,color:#0f172a
  classDef sys     fill:#f8fafc,stroke:#475569,stroke-width:1.5px,stroke-dasharray:6 4,color:#0f172a

  Admin((Admin)):::actor

  subgraph S["OmniLearn — Admin scope"]
    direction TB

    %% Parent (manage) use cases
    MU(["Manage users"]):::parent
    MC(["Manage global curriculum"]):::parent
    MK(["Manage classrooms"]):::parent
    MA(["Manage announcements"]):::parent

    %% Users specialisations
    LU(["List all users"]):::uc
    CU(["Create user"]):::uc
    UU(["Update user"]):::uc
    DU(["Delete user"]):::uc

    %% Curriculum specialisations
    MG(["Manage grades"]):::uc
    MSP(["Manage specialities"]):::uc
    ML(["Manage levels"]):::uc
    MCO(["Manage courses"]):::uc
    MM(["Manage modules"]):::uc
    MLS(["Manage lessons"]):::uc

    %% Classrooms specialisations
    CK(["Create classroom"]):::uc
    UK(["Update classroom"]):::uc
    DK(["Delete classroom"]):::uc
    AKS(["Add student to classroom"]):::uc
    RKS(["Remove student from classroom"]):::uc

    %% Announcements specialisations
    CAN(["Publish announcement"]):::uc
    EAN(["Edit announcement"]):::uc
    DAN(["Delete announcement"]):::uc

    %% Standalone
    VS(["View platform statistics"]):::uc

    %% Shared
    AUTH(["Authenticate (admin role)"]):::shared
    UPF(["Upload lesson file"]):::shared
  end
  class S sys

  %% Secondary actors
  Cloud((Cloudinary)):::ext
  DB((Database)):::ext

  %% Admin → top-level use cases
  Admin --- MU
  Admin --- MC
  Admin --- MK
  Admin --- MA
  Admin --- VS

  %% Generalisation (specialise — solid arrow toward the parent)
  LU --> MU
  CU --> MU
  UU --> MU
  DU --> MU

  MG  --> MC
  MSP --> MC
  ML  --> MC
  MCO --> MC
  MM  --> MC
  MLS --> MC

  CK  --> MK
  UK  --> MK
  DK  --> MK
  AKS --> MK
  RKS --> MK

  CAN --> MA
  EAN --> MA
  DAN --> MA

  %% «include» — always happens
  MU -. "«include»" .-> AUTH
  MC -. "«include»" .-> AUTH
  MK -. "«include»" .-> AUTH
  MA -. "«include»" .-> AUTH
  VS -. "«include»" .-> AUTH

  %% «extend» — conditional
  MLS -. "«extend»" .-> UPF

  %% Secondary actors → use cases they collaborate on
  UPF --- Cloud
  VS  --- DB
```

> *Figure 7.1 — Use-case diagram of Sprint 1 — Admin side.*

The Admin inherits every Student capability; only Admin-only powers are drawn. *Manage lessons* extends to *Upload lesson file* (optional, stored on Cloudinary).

#### Institution Admin side

The Institution Admin manages the academic catalogue (grades, specialities, levels) of a single institution. Every action is scoped to their own institution through the shared *Authenticate (institution-admin role + scope)* check.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  classDef actor   fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#7c2d12
  classDef ext     fill:#fef9c3,stroke:#a16207,stroke-width:2px,color:#713f12
  classDef parent  fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
  classDef uc      fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef shared  fill:#f1f5f9,stroke:#475569,stroke-width:1.5px,stroke-dasharray:4 2,color:#0f172a
  classDef sys     fill:#f8fafc,stroke:#475569,stroke-width:1.5px,stroke-dasharray:6 4,color:#0f172a

  IA((Institution Admin)):::actor

  subgraph S["OmniLearn — Institution Admin scope"]
    direction TB

    %% Parent
    MIC(["Manage institution curriculum"]):::parent

    %% Curriculum specialisations
    IG(["Manage institution grades"]):::uc
    ISP(["Manage institution specialities"]):::uc
    IL(["Manage institution levels"]):::uc

    %% Standalone use cases
    SD(["Seed curriculum from defaults"]):::uc
    VIM(["Consult institution members"]):::uc

    %% Shared
    AUTH(["Authenticate (institution-admin role + scope)"]):::shared
  end
  class S sys

  %% Secondary actors
  Inst((Institution)):::ext
  DB((Database)):::ext

  %% IA → top-level use cases
  IA --- MIC
  IA --- SD
  IA --- VIM

  %% Generalisation
  IG  --> MIC
  ISP --> MIC
  IL  --> MIC

  %% «include»
  MIC -. "«include»" .-> AUTH
  SD  -. "«include»" .-> AUTH
  VIM -. "«include»" .-> AUTH

  %% Secondary actors
  MIC --- Inst
  SD  --- DB
  VIM --- Inst
```

> *Figure 7.2 — Use-case diagram of Sprint 1 — Institution Admin side.*

The Institution Admin inherits every Student capability; only institution-scoped powers are drawn. *Seed curriculum from defaults* is standalone because it copies a template instead of editing an entity.

### 2. Sequence Diagrams

#### 2.1. Sequence diagram — "Sign up"

The visitor fills the sign-up form; the backend hashes the password, creates the user and sends a verification email. The user is then redirected to a "check your inbox" screen.

```mermaid
sequenceDiagram
    actor Visitor
    participant FE as Frontend
    participant API as Backend
    participant DB as Database
    participant Mail as Mailer

    Visitor->>+FE: Fill sign-up form
    FE->>FE: Validate inputs
    FE->>+API: POST /auth/register

    alt Email already used
        API->>+DB: Find by email
        DB-->>-API: Existing user
        API-->>FE: 409 Conflict
    else Email free
        API->>API: bcrypt.hash + generate token
        API->>+DB: Insert user
        DB-->>-API: Created
        opt Welcome email
            API->>Mail: Send verification link
        end
        API-->>FE: 201 user
    end

    API-->>-FE: Response
    FE-->>-Visitor: "Check your inbox"
```

> *Figure 8 — Sequence diagram "Sign up".*

#### 2.2. Sequence diagram — "Sign in"

The student submits email and password; the backend checks them and — if 2FA is on — asks for a TOTP code. On success, a JWT is returned and stored in cookies, then the user is redirected to their dashboard.

```mermaid
sequenceDiagram
    actor Student
    participant FE as Frontend
    participant API as Backend
    participant DB as Database

    Student->>FE: Enter email and password
    FE->>API: Send login request
    API->>DB: Look up user
    DB-->>API: User found
    API->>API: Check password

    alt Wrong password
        API-->>FE: Login failed
        FE-->>Student: Show error
    else 2FA is off
        API-->>FE: Token + user
        FE-->>Student: Open dashboard
    else 2FA is on
        API-->>FE: Ask for 6-digit code
        Student->>FE: Enter code
        FE->>API: Send code
        API-->>FE: Token + user
        FE-->>Student: Open dashboard
    end
```

> *Figure 9 — Sequence diagram "Sign in".*

#### 2.3. Sequence diagram — "Reset password"

The user submits their email and receives a one-hour reset link; clicking it opens a form to set a new password. The API always returns the same generic message to avoid revealing whether the email exists.

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as Backend
    participant DB as Database
    participant Mail as Mailer

    User->>+FE: Submit email
    FE->>+API: POST /auth/forgot-password
    API->>+DB: Save resetToken (1h)
    DB-->>-API: Saved
    API->>Mail: Send reset link
    API-->>-FE: 200 generic message
    FE-->>-User: "Check your inbox"

    User->>+FE: Click link, submit new password
    FE->>+API: POST /auth/reset-password
    API->>+DB: Verify token + update password
    DB-->>-API: Result

    alt Token valid
        API-->>FE: 200 OK
    else Invalid / expired
        API-->>FE: 400 Error
    end

    API-->>-FE: Response
    FE-->>-User: Done
```

> *Figure 9.1 — Sequence diagram "Reset password".*

#### 2.4. Sequence diagram — "Delete my account"

The student confirms deletion in a modal; the backend checks the JWT, removes the user and returns 204. The frontend then clears cookies and redirects to `/auth`.

```mermaid
sequenceDiagram
    actor Student
    participant FE as Frontend
    participant API as Backend
    participant DB as Database

    Note over Student,DB: ref: Authenticate

    Student->>+FE: Click "Delete my account"
    FE-->>Student: Show confirmation
    Student->>FE: Confirm
    FE->>+API: DELETE /profile/:id (Bearer JWT)
    API->>API: Verify JWT + check owner/admin

    alt Not owner / not admin
        API-->>FE: 401 / 403
    else Authorized
        API->>+DB: Delete user
        DB-->>-API: Deleted
        API-->>FE: 204 No Content
    end

    API-->>-FE: Response
    FE->>FE: Clear cookies
    FE-->>-Student: Redirect to /auth
```

> *Figure 10 — Sequence diagram "Delete my account".*

### 3. Activity Diagrams

#### 3.1. Activity diagram — "Update profile"

This swimlane diagram shows the full flow when the user updates their profile.
The user edits avatar, bio and social links from the profile page; the platform validates the inputs,
uploads the avatar to Cloudinary, persists the changes, and signals `Guard` to re-check that the
profile is complete so the user can be redirected to the main app.

```mermaid
%%{init: {"theme":"neutral", "flowchart": {"htmlLabels": true}} }%%
flowchart TB
  Start([●]):::startNode

  subgraph LANES[" "]
    direction LR

    subgraph USER["Utilisateur"]
      direction TB
      U1["S'authentifier"]:::userNode
      U2["Ouvrir la page<br/>de profil"]:::userNode
      U3["Modifier avatar,<br/>bio, liens sociaux"]:::userNode
      U4["Cliquer<br/>« Enregistrer »"]:::userNode
      U5["Corriger les erreurs<br/>de saisie"]:::userNode
    end

    subgraph PLAT["Plateforme"]
      direction TB
      P1["Afficher la page<br/>de profil"]:::platNode
      P2["Récupérer les<br/>données du profil"]:::platNode
      P3["Envoyer PATCH<br/>/api/users/me<br/>{ avatar, bio, links }"]:::platNode
      P4{"Valider les entrées<br/>(taille, format, URL) ?"}:::decisionNode
      P5["Afficher les<br/>messages d'erreur"]:::errorNode
      P6{"Nouvel avatar<br/>fourni ?"}:::decisionNode
      P7["Uploader l'avatar<br/>vers Cloudinary"]:::platNode
      P8["Émettre l'événement<br/>profile-updated → Guard"]:::platNode
      P9["Afficher message<br/>de succès"]:::platNode
    end

    subgraph DB["Base de données"]
      direction TB
      D1["Préparer le profil<br/>de l'utilisateur"]:::dbNode
      D2["UPDATE users<br/>SET avatar, bio, links<br/>WHERE id = :userId"]:::dbNode
      D3["Retourner le profil<br/>mis à jour"]:::dbNode
    end
  end

  End([◉]):::endNode

  %% ── Flow across lanes ─────────────────────────
  Start --> U1
  U1 --> P1
  P1 --> P2
  P2 --> D1
  D1 --> U2
  U2 --> U3
  U3 --> U4
  U4 --> P3
  P3 --> P4
  P4 -- "Non" --> P5
  P5 --> U5
  U5 --> U3
  P4 -- "Oui" --> P6
  P6 -- "Oui" --> P7
  P7 --> D2
  P6 -- "Non" --> D2
  D2 --> D3
  D3 --> P8
  P8 --> P9
  P9 --> End

  %% ── Styles ────────────────────────────────────
  classDef userNode     fill:#fff7ed,stroke:#c2410c,stroke-width:1.5px,color:#7c2d12
  classDef platNode     fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef dbNode       fill:#ecfdf5,stroke:#047857,stroke-width:1.5px,color:#064e3b
  classDef decisionNode fill:#fef3c7,stroke:#b45309,stroke-width:1.5px,color:#78350f
  classDef errorNode    fill:#fee2e2,stroke:#b91c1c,stroke-width:1.5px,color:#7f1d1d
  classDef startNode    fill:#111827,stroke:#111827,color:#fff
  classDef endNode      fill:#fff,stroke:#111827,stroke-width:3px,color:#111827

  style LANES fill:#ffffff,stroke:#94a3b8,stroke-width:1px
  style USER  fill:#fffaf4,stroke:#c2410c,stroke-width:1.5px
  style PLAT  fill:#f5f7ff,stroke:#4338ca,stroke-width:1.5px
  style DB    fill:#f3fbf6,stroke:#047857,stroke-width:1.5px
```

> *Figure 11 — Activity diagram "Update profile" (swimlane).*

#### 3.2. Activity diagram — "Reset password"

The user asks for a reset link, opens it from their inbox and sets a new password; the server checks the token is valid and not expired before updating.

```mermaid
flowchart TD
  A([Start]) --> B[Click &quot;Forgot password?&quot;]
  B --> C[Enter email]
  C --> D[Show &quot;Check your inbox&quot;]
  D --> E[Open link from email]
  E --> F[Enter new password]
  F --> G{Link still valid?}
  G -- No --> H[Show &quot;Link expired&quot;] --> Z([End])
  G -- Yes --> I[Update password]
  I --> J[Go to sign-in page]
  J --> Z
```

> *Figure 12 — Activity diagram "Reset password".*

### 4. Class Diagram

An abstract `User` holds the auth, profile and plan fields, with four role subclasses (Student, Teacher, Admin, InstitutionAdmin). `Student` is further specialised into `IndependentStudent` (free/pro plan, no institution) and `InstitutionStudent` (belongs to one `Institution`). `AuthToken` is the JWT returned by `login()` — it lives only in memory and is never saved in the database.

```mermaid
classDiagram
  direction TB

  class User {
    <<abstract>>
    +UUID id
    +string firstname
    +string lastname
    +string email
    -string password
    +enum plan  (free|pro|institution)
    +Date planJoinedAt
    +UUID institutionId
    +bool isActive
    +bool isEmailVerified
    +string emailVerificationToken
    +Date   emailVerificationExpires
    +string passwordResetToken
    +Date   passwordResetExpires
    +string twoFactorSecret
    +bool   is2FAEnabled
    +string bio
    +string githubUrl
    +string linkedinUrl
    +string avatar
    +register()
    +login() AuthToken
    +verifyEmail(token)
    +resetPassword(token, newPwd)
    +enable2FA()
    +updateProfile()
    +delete()
  }

  class Student {
    <<abstract>>
  }
  class IndependentStudent {
  }
  class InstitutionStudent {
  }
  class Teacher {
  }
  class Admin {
  }
  class InstitutionAdmin {
  }

  class Institution {
    +UUID id
    +string name
    +UUID adminUserId
    +int seatLimit
    +enum type  (school|university|training_center|company)
    +string logo
    +string description
    +string contactEmail
    +bool isActive
  }

  class AuthToken {
    <<transient>>
    +string jwt
    +Date issuedAt
    +Date expiresAt
  }

  Student            --|> User
  Teacher            --|> User
  Admin              --|> User
  InstitutionAdmin   --|> User
  IndependentStudent --|> Student
  InstitutionStudent --|> Student

  Institution "1" *-- "1..*" InstitutionStudent : enrols
  Institution "1" *-- "0..*" Teacher            : employs
  Institution "1" --  "1"    InstitutionAdmin   : owned by

  User ..> AuthToken : «returns»

  note for Student "Disjoint subtypes:\ndiscriminated by institutionId\n(null vs not-null)"
  note for IndependentStudent "institutionId = null\nplan in (free, pro)\nSelf-paced, pays own plan."
  note for InstitutionStudent "institutionId != null\nplan = institution\nEnrolled via an invite/seat."
```

> *Figure 13 — Class diagram of Sprint 1.*

The split between `IndependentStudent` and `InstitutionStudent` is discriminated by `institutionId` (null vs not-null) and aligned with the `plan` enum: an independent student is on `free` or `pro`, an institution student is on the `institution` plan and consumes one seat from `Institution.seatLimit`.

### 5. C4 Container view

A React SPA talks to a single Express API, which connects to PostgreSQL and three external services: SMTP (emails), Cloudinary (avatars) and Stripe (payments). Stripe also sends webhooks back to the API.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  SPA["React 19 SPA<br/>(Vite)"]
  API["Web API<br/>Express 5"]
  DB[("PostgreSQL")]
  SMTP[(SMTP)]
  Cloud[(Cloudinary)]
  Stripe[(Stripe)]

  SPA  -- "HTTPS / JSON · JWT"     --> API
  API  -- "Sequelize"              --> DB
  API  -- "verification mails"     --> SMTP
  API  -- "avatar upload"          --> Cloud
  API  -- "checkout"               --> Stripe
  Stripe -. "webhook"              .-> API
```

> *Figure 13.1 — Sprint 1 — C4 Container view.*

### 6. C4 Component view

The backend has three route modules (`auth`, `profile`, `stripe`), one auth middleware and the `User` model. Each endpoint uses small helpers (bcrypt, JWT, Speakeasy, Nodemailer, Cloudinary, Stripe SDK) to reach the database or external services.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart TB
  subgraph WebAPI["Container — Web API (Express 5)"]
    direction TB

    subgraph AuthC["authRoutes.js"]
      Reg["POST /register"]
      Log["POST /login"]
      Ver["GET  /verify-email"]
      For["POST /forgot-password"]
      Rst["POST /reset-password"]
      Setup["POST /2fa/setup"]
      Vfy2["POST /2fa/verify"]
    end

    subgraph ProfC["profileRoutes.js"]
      Get["GET    /profile/:id"]
      Patch["PATCH  /profile/:id"]
      Del["DELETE /profile/:id"]
    end

    subgraph StrC["stripeRoutes.js"]
      Co["POST /stripe/checkout-pro"]
      Wh["POST /stripe/webhook"]
    end

    MW["authenticate (JWT + isActive)"]
    UserM["User (Sequelize)"]
    Hash["bcryptjs"]
    JWT["jsonwebtoken"]
    TOTP["Speakeasy"]
    QR["qrcode"]
    Mailer["Nodemailer"]
    CloudUp["Cloudinary uploader"]
    StripeC["stripe SDK"]
  end

  PG[(PostgreSQL)]
  SMTP[(SMTP)]
  CloudExt[(Cloudinary)]
  StripeExt[(Stripe)]

  Reg --> Hash --> UserM
  Reg --> Mailer
  Log --> Hash
  Log --> JWT
  Log --> TOTP
  Ver --> UserM
  For --> Mailer
  Rst --> Hash --> UserM
  Setup --> TOTP --> QR
  Vfy2 --> TOTP --> UserM

  Get   --> MW --> UserM
  Patch --> MW
  Patch --> CloudUp
  Del   --> MW --> UserM

  Co --> MW
  Co --> StripeC
  Wh --> StripeC
  Wh --> UserM

  UserM --> PG
  Mailer --> SMTP
  CloudUp --> CloudExt
  StripeC --> StripeExt
```

> *Figure 13.2 — Sprint 1 — C4 Component view.*

## V. Implementation

In this section we present the interfaces built during the first sprint.

### 1. Home page (`/`)

The first page a visitor sees: it presents the three plans (Free, Pro, Institution) and the main features. A button leads to `/auth` to sign up.

> *Figure 14 — Home page.*

### 2. Sign-up page

The visitor fills name, email, password and chosen plan to create an account. Inputs are checked both in the browser and on the server.

> *Figure 15 — Sign-up page.*

### 3. Sign-in page

A simple email + password form. If 2FA is on, a second step asks for the 6-digit TOTP code.

> *Figure 16 — Sign-in page.*

### 4. Email verification page

The user clicks the link received by email; the page confirms the token with the backend and then sends them to the dashboard.

> *Figure 17 — Email verification page.*

### 5. Password-reset pages

Two simple steps: first the user types their email, then they open the link from their inbox to set a new password.

> *Figure 18 — "Enter your email" page (forgot password).*
> *Figure 19 — "Set new password" page.*

### 6. Profile management page

The user can change their avatar, bio, GitHub and LinkedIn links. From here they can also turn on 2FA by scanning a QR code.

> *Figure 20 — Profile management page.*

### 7. Security tab (account protection)

The Security tab keeps all account protection settings in one place.

It has a **Change password** form. To save a new password, the user must first type their current one, so nobody can change it from a stolen session.

It also lets the user turn on **2FA** (two-factor authentication). The app shows a QR code, the user scans it with an authenticator app (like Google Authenticator), then types the 6-digit code to confirm.

To turn 2FA off, the user must enter a fresh 6-digit code again — this way, a stolen session alone is not enough to disable it.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Profile (Security tab)
    participant Auth as authenticate middleware
    participant API as Auth API
    participant DB as Database
    participant App as Authenticator app

    Note over User,App: Setup (one time — user must be signed in)
    User->>FE: Click "Enable 2FA"
    FE->>Auth: POST /auth/2fa/setup (JWT in header)
    Auth->>Auth: Verify JWT → req.user.id
    Auth->>API: forward authenticated request
    API->>API: Speakeasy generates TOTP secret
    API->>DB: Save secret (is2FAEnabled = false)
    API-->>FE: Return QR code + secret
    FE-->>User: Show QR code
    User->>App: Scan QR with authenticator app
    User->>FE: Enter 6-digit code
    FE->>Auth: POST /auth/2fa/enable { otp } (JWT)
    Auth->>API: forward authenticated request
    API->>API: Verify TOTP with secret
    API->>DB: is2FAEnabled = true
    API-->>FE: 200 OK — 2FA active

    Note over User,App: Sign-in (every time — no JWT yet)
    User->>FE: Email + password
    FE->>API: POST /auth/signin
    API->>DB: Check credentials
    API-->>FE: 2FA required (userId returned)
    User->>App: Open authenticator app
    App-->>User: Current 6-digit code
    User->>FE: Enter code
    FE->>API: POST /auth/2fa/verify { userId, otp }
    API->>API: Verify TOTP (no JWT — unauthenticated route)
    API-->>FE: JWT token (signed in)
```

The screenshot below shows the Change password form with current / new / confirm fields.
> *Figure 20.1 — Security tab — Change password form.*

The screenshot below shows the 2FA panel with the QR code and the 6-digit verification input.
> *Figure 20.2 — Security tab — Enable 2FA (QR + TOTP).*

The screenshot below shows the 2FA setup and sign-in flow as a sequence diagram.
> *Figure 20.3 — 2FA setup and sign-in sequence (Speakeasy TOTP).*

### 8. Plan upgrade (Stripe Checkout)

A Free user clicks the Pro button, which opens Stripe Checkout in a new tab to pay. After a successful payment, a Stripe webhook updates the user's plan to `pro`.

> *Figure 21 — Pricing / plan-upgrade section.*

## VI. Conclusion

In this chapter we detailed the first sprint, which delivered the authentication, profile, password-reset, 2FA and initial plan-upgrade flows. The next chapter presents the work of Sprint 2 — roadmap personalization, problem catalogue and the code editor.

---
