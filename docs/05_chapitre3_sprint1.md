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

### Table 5 — Sprint 1 Backlog

#### A. Visitor

| PBI | Main functionality | US Code | User story | Task ID | Task |
|:---:|---|:---:|---|:---:|---|
| 1 | Landing page | US1.1 | As a visitor, I want to browse the public landing page. | 1.1 | Build the `Home` page in `Client/src/Home/Home.jsx`. |
| 1 | Landing page | US1.1 | As a visitor, I want to browse the public landing page. | 1.2 | Display the three plans (Free / Pro / Institution) with CTAs. |
| 2 | Sign up | US2.1 | As a visitor, I want to create an account. | 2.1 | Create the `Auth` page (`Client/src/Auth/Auth.jsx`) with sign-up tab. |
| 2 | Sign up | US2.1 | As a visitor, I want to create an account. | 2.2 | Add input validation (email, password strength). |
| 2 | Sign up | US2.1 | As a visitor, I want to create an account. | 2.3 | Implement the `User` Sequelize model in `Server/src/models/User.js`. |
| 2 | Sign up | US2.1 | As a visitor, I want to create an account. | 2.4 | Implement the `POST /api/auth/register` route in `authRoutes.js`. |
| 2 | Sign up | US2.1 | As a visitor, I want to create an account. | 2.5 | Hash passwords with bcryptjs (`BCRYPT_ROUNDS` from config). |
| 2 | Sign up | US2.1 | As a visitor, I want to create an account. | 2.6 | Send a verification email (Nodemailer) with `emailVerificationToken`. |
| 3 | Verify email | US3.1 | As a visitor, I want to verify my email. | 3.1 | Build the `VerifyEmail` page (`Client/src/Auth/VerifyEmail.jsx`). |
| 3 | Verify email | US3.1 | As a visitor, I want to verify my email. | 3.2 | Implement `GET /api/auth/verify-email?token=...` and clear the expiry. |
| 4 | Choose a plan | US4.1 | As a visitor, I want to choose between Free, Pro and Institution. | 4.1 | Plan selector on the sign-up form; default = `free`. |
| 4 | Choose a plan | US4.1 | As a visitor, I want to choose between Free, Pro and Institution. | 4.2 | Pro and Institution route to Stripe Checkout after signup. |

#### B. Student / Authenticated user

| PBI | Main functionality | US Code | User story | Task ID | Task |
|:---:|---|:---:|---|:---:|---|
| 5 | Sign in | US5.1 | As a student, I want to sign in. | 5.1 | Sign-in tab in the `Auth` page. |
| 5 | Sign in | US5.1 | As a student, I want to sign in. | 5.2 | `POST /api/auth/login` returning a JWT and the user object. |
| 5 | Sign in | US5.1 | As a student, I want to sign in. | 5.3 | Store `token` and `user` in cookies via `js-cookie`. |
| 6 | Profile management | US6.1 | As a student, I want to view my profile. | 6.1 | Build `Profile` page (`Client/src/components/Profile.jsx`). |
| 6 | Profile management | US6.1 | As a student, I want to view my profile. | 6.2 | `GET /api/profile/:id` returns the current user. |
| 6 | Profile management | US6.2 | As a student, I want to update my profile. | 6.3 | Avatar upload (Cloudinary), bio, GitHub URL, LinkedIn URL. |
| 6 | Profile management | US6.2 | As a student, I want to update my profile. | 6.4 | `PATCH /api/profile/:id` validates and updates the user. |
| 6 | Profile management | US6.2 | As a student, I want to update my profile. | 6.5 | Emit a `profile-updated` event so `Guard` re-checks profile completeness. |
| 6 | Profile management | US6.3 | As a student, I want to delete my account. | 6.6 | Add a destructive action in the profile page. |
| 6 | Profile management | US6.3 | As a student, I want to delete my account. | 6.7 | `DELETE /api/profile/:id`. |
| 7 | Password reset | US7.1 | As a student, I want to reset my password. | 7.1 | Forgot-password link in the sign-in tab. |
| 7 | Password reset | US7.1 | As a student, I want to reset my password. | 7.2 | `POST /api/auth/forgot-password` generates `passwordResetToken`. |
| 7 | Password reset | US7.1 | As a student, I want to reset my password. | 7.3 | Send the reset email via Nodemailer. |
| 7 | Password reset | US7.1 | As a student, I want to reset my password. | 7.4 | `POST /api/auth/reset-password` validates the token and rehashes. |
| 8 | Two-factor authentication | US8.1 | As a student, I want to enable 2FA. | 8.1 | Toggle in the profile page. |
| 8 | Two-factor authentication | US8.1 | As a student, I want to enable 2FA. | 8.2 | `POST /api/auth/2fa/setup` generates the Speakeasy secret + QR. |
| 8 | Two-factor authentication | US8.1 | As a student, I want to enable 2FA. | 8.3 | `POST /api/auth/2fa/verify` confirms the TOTP and sets `is2FAEnabled`. |

#### C. Cross-cutting

| PBI | Main functionality | US Code | User story | Task ID | Task |
|:---:|---|:---:|---|:---:|---|
| 33 (partial) | Stripe checkout — Pro upgrade | US33.1 | As a Free user, I want to upgrade to Pro. | 33.1 | Add `stripeRoutes.js` and a `/api/stripe/checkout-pro` endpoint. |
| 33 (partial) | Stripe checkout — Pro upgrade | US33.1 | As a Free user, I want to upgrade to Pro. | 33.2 | Build the `PlanSection` component (`Client/src/components/PlanSection.jsx`). |
| 33 (partial) | Stripe checkout — Pro upgrade | US33.1 | As a Free user, I want to upgrade to Pro. | 33.3 | Update `users.plan` to `pro` on a successful Stripe webhook. |

## IV. Design

In this section we elaborate the use-case diagram, the sequence diagrams, the activity diagrams and the class diagram for Sprint 1.

### 1. Use-Case Diagram

#### Visitor side

The visitor can: browse the landing page, sign up, verify the email, choose a plan and sign in.

> *Figure 6 — Use-case diagram of Sprint 1 — Visitor side.*

#### Student / authenticated user side

The student can: sign in, manage profile (view / update / delete), reset password and enable 2FA.

> *Figure 7 — Use-case diagram of Sprint 1 — Student side.*

### 2. Sequence Diagrams

#### 2.1. Sequence diagram — "Sign up"

A visitor opens the landing page, navigates to `/auth`, enters first name, last name, email, password and chosen plan. The frontend validates the inputs, then sends `POST /api/auth/register`. The backend validates the payload, hashes the password (bcryptjs), creates the `User` row, generates an `emailVerificationToken` and triggers a Nodemailer email. The user is redirected to a "check your inbox" screen.

> *Figure 8 — Sequence diagram "Sign up".*

#### 2.2. Sequence diagram — "Sign in"

A student opens `/auth`, enters email and password. The frontend sends `POST /api/auth/login`. The backend looks up the user, compares the password with bcryptjs, optionally challenges for a TOTP code (if `is2FAEnabled`), signs a JWT and returns it. The frontend stores the token and the user in cookies, then redirects to the role-appropriate dashboard.

> *Figure 9 — Sequence diagram "Sign in".*

#### 2.3. Sequence diagram — "Delete my account"

The student opens the profile page, clicks "Delete my account". A confirmation modal is shown. On confirmation, the frontend sends `DELETE /api/profile/:id` with the JWT. The backend authorizes (own account or admin), removes the user and returns 204. The frontend clears the cookies and redirects to `/auth`.

> *Figure 10 — Sequence diagram "Delete my account".*

### 3. Activity Diagrams

#### 3.1. Activity diagram — "Update profile"

> *Figure 11 — Activity diagram "Update profile".*

#### 3.2. Activity diagram — "Reset password"

> *Figure 12 — Activity diagram "Reset password".*

### 4. Class Diagram

The Sprint-1 class diagram introduces the `User` aggregate with its authentication, profile and plan fields — `id`, `firstname`, `lastname`, `email`, `password`, `role`, `plan`, `planJoinedAt`, `institutionId`, `isActive`, `isEmailVerified`, `emailVerificationToken`, `passwordResetToken`, `twoFactorSecret`, `is2FAEnabled`, `bio`, `githubUrl`, `linkedinUrl`, `avatar`, plus the roadmap-related fields used by later sprints.

> *Figure 13 — Class diagram of Sprint 1.*

## V. Implementation

In this section we present the interfaces built during the first sprint.

### 1. Home page (`/`)

The landing page is the first view of OmniLearn. It introduces the three plans (Free, Pro, Institution), the key features (code editor, AI assistant, classrooms) and provides CTAs to `/auth` for sign-up.

> *Figure 14 — Home page.*

### 2. Sign-up page

The sign-up tab of the `Auth` page lets the visitor enter first name, last name, email, password and the chosen plan. Inputs are validated client-side and server-side.

> *Figure 15 — Sign-up page.*

### 3. Sign-in page

The sign-in tab provides a secure, simple form. If 2FA is enabled on the account, a second step prompts for the TOTP code.

> *Figure 16 — Sign-in page.*

### 4. Email verification page

After sign-up, the user receives an email with a link to `/verify-email?token=...`. The page calls the backend, then redirects to the dashboard.

> *Figure 17 — Email verification page.*

### 5. Password-reset pages

A two-step flow: enter the email, then receive a tokenized link that opens the "set new password" page.

> *Figure 18 — "Enter your email" page (forgot password).*
> *Figure 19 — "Set new password" page.*

### 6. Profile management page

The profile page lets the user update avatar (Cloudinary upload), bio, GitHub URL, LinkedIn URL — and enable 2FA (QR code from Speakeasy).

> *Figure 20 — Profile management page.*

### 7. Plan upgrade (Stripe Checkout)

From the profile / pricing section, a Free user can upgrade to Pro. The Pro CTA opens Stripe Checkout in a new tab; on success, the Stripe webhook flips `users.plan` to `pro`.

> *Figure 21 — Pricing / plan-upgrade section.*

## VI. Conclusion

In this chapter we detailed the first sprint, which delivered the authentication, profile, password-reset, 2FA and initial plan-upgrade flows. The next chapter presents the work of Sprint 2 — roadmap personalization, problem catalogue and the code editor.

---
