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

Once logged in, a student can manage their profile (view, update, delete), reset their password and enable 2FA for extra security.

```mermaid
%%{init: {"theme":"neutral"} }%%
flowchart LR
  classDef actor fill:#fff7ed,stroke:#c2410c,stroke-width:2px,color:#7c2d12
  classDef uc    fill:#eef2ff,stroke:#4338ca,stroke-width:1.5px,color:#1e1b4b
  classDef sys   fill:#f8fafc,stroke:#475569,stroke-width:1.5px,stroke-dasharray:6 4,color:#0f172a

  Student((Student)):::actor

  subgraph S["OmniLearn — Sprint 1 (Authenticated user scope)"]
    direction TB
    L(["Sign in"]):::uc
    VP(["View profile"]):::uc
    UP(["Update profile"]):::uc
    DP(["Delete account"]):::uc
    R(["Reset password"]):::uc
    T(["Enable 2FA (TOTP + QR)"]):::uc
    U(["Upload avatar (Cloudinary)"]):::uc
    CT(["Verify TOTP code"]):::uc
  end
  class S sys

  Student --- L
  Student --- VP
  Student --- UP
  Student --- DP
  Student --- R
  Student --- T
  UP -. "«include»" .-> U
  L  -. "«extend»"  .-> CT
  T  -. "«include»" .-> CT
```

> *Figure 7 — Use-case diagram of Sprint 1 — Student side.*

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

The user edits their avatar, bio and social links and submits; the server validates, saves the changes and signals `Guard` to re-check that the profile is complete.

```mermaid
flowchart TD
  A([Start]) --> B[Open profile page]
  B --> C{Change avatar?}
  C -- Yes --> D[Upload new avatar]
  C -- No --> E[Edit bio and social links]
  D --> E
  E --> F[Click Save]
  F --> G{Inputs valid?}
  G -- No --> H[Show errors] --> E
  G -- Yes --> I[Save changes]
  I --> J([End])
```

> *Figure 11 — Activity diagram "Update profile".*

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

An abstract `User` holds the auth, profile and plan fields, with four role subclasses (Student, Teacher, Admin, InstitutionAdmin). `AuthToken` is the JWT returned by `login()` — it lives only in memory and is never saved in the database.

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
  }
  class Teacher {
  }
  class Admin {
  }
  class InstitutionAdmin {
  }

  class AuthToken {
    <<transient>>
    +string jwt
    +Date issuedAt
    +Date expiresAt
  }

  Student          --|> User
  Teacher          --|> User
  Admin            --|> User
  InstitutionAdmin --|> User

  User ..> AuthToken : «returns»

  note for User "Single-table inheritance:\nrole discriminator on `users` table"
  note for Student "Role-specific methods\narrive in Sprint 2+"
```

> *Figure 13 — Class diagram of Sprint 1.*

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

### 7. Plan upgrade (Stripe Checkout)

A Free user clicks the Pro button, which opens Stripe Checkout in a new tab to pay. After a successful payment, a Stripe webhook updates the user's plan to `pro`.

> *Figure 21 — Pricing / plan-upgrade section.*

## VI. Conclusion

In this chapter we detailed the first sprint, which delivered the authentication, profile, password-reset, 2FA and initial plan-upgrade flows. The next chapter presents the work of Sprint 2 — roadmap personalization, problem catalogue and the code editor.

---
