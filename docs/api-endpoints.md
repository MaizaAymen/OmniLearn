# OmniLearn — Backend API Endpoints (Simple Guide)

This document explains **every endpoint** in the backend (`Server/src`) in plain language,
and shows **which frontend file calls it** (`Client/src`).

> **Base URL:** everything is served from `http://localhost:5000`.
> Most calls need a login token sent as a header: `Authorization: Bearer <token>`.

## How the backend is wired

The main file [Server/src/server.js](../Server/src/server.js) "mounts" each group of routes
under a prefix. So a route written as `POST /login` inside `authRoutes.js` is really
reachable at `POST /api/auth/login`.

| Prefix (in server.js) | Route file | What it handles |
|---|---|---|
| `/api/auth` | [authRoutes.js](../Server/src/routes/authRoutes.js) | Login, register, Google, 2FA, password reset, email verify |
| `/api/` | [UserRoutes.js](../Server/src/routes/UserRoutes.js) | Users, profiles, avatars, joining classrooms (student side) |
| `/api/admin` | [adminRoutes.js](../Server/src/routes/adminRoutes.js) | Curriculum (grades→specialities→levels→courses→modules→lessons), classrooms, announcements, stats |
| `/api/ai` | [ai/Ai.js](../Server/src/ai/Ai.js) | AI problems, AI chat, AI mentor, code correction, roadmaps |
| `/api/pdf` | [pdfRoutes.js](../Server/src/routes/pdfRoutes.js) | PDF upload + AI features (Pro only) |
| `/api/submissions` | [submissionRoutes.js](../Server/src/routes/submissionRoutes.js) | Saving code submissions + student stats |
| `/api/assignments` | [assignmentRoutes.js](../Server/src/routes/assignmentRoutes.js) | Teacher assignments inside a module/class |
| `/api/conversations` | [conversationRoutes.js](../Server/src/routes/conversationRoutes.js) | Chat groups & private conversations |
| `/api/messages` | [messageRoutes.js](../Server/src/routes/messageRoutes.js) | Sending messages + uploads |
| `/api/notifications` | [notificationRoutes.js](../Server/src/routes/notificationRoutes.js) | In-app notifications & invites |
| `/api/plan` | [planRoutes.js](../Server/src/routes/planRoutes.js) | Plans (free/pro/institution), institutions, invite links |
| `/api/workspace` | [workspaceRoutes.js](../Server/src/routes/workspaceRoutes.js) | Personal PDF/code workspace + AI analysis |
| `/api/stripe` | [stripeRoutes.js](../Server/src/routes/stripeRoutes.js) | Stripe checkout & payment verification |
| `/api/institution-curriculum` | [institutionCurriculumRoutes.js](../Server/src/routes/institutionCurriculumRoutes.js) | Each institution's own grades/specialities/levels |
| `/api/roadmap` | [roadmapRoutes.js](../Server/src/routes/roadmapRoutes.js) | Personal & classroom learning roadmaps |

**Note about `/api/ai`:** many routes inside `Ai.js` are themselves named starting with `/ai/...`,
so the real URL is doubled, e.g. `/api/ai/ai/getallproblems`. That is intentional in this codebase.

---

## 1. Auth — `/api/auth`
File: [authRoutes.js](../Server/src/routes/authRoutes.js)
Frontend: [Auth.jsx](../Client/src/Auth/Auth.jsx), [ForgotPassword.jsx](../Client/src/Auth/ForgotPassword.jsx), [ResetPassword.jsx](../Client/src/Auth/ResetPassword.jsx), [VerifyEmail.jsx](../Client/src/Auth/VerifyEmail.jsx), [Profile.jsx](../Client/src/components/Profile.jsx)

| Method & Path | What it does | Called from (frontend) |
|---|---|---|
| `POST /google` | Sign in / sign up with a Google account, returns our JWT | [Auth.jsx](../Client/src/Auth/Auth.jsx) (Google button) |
| `POST /register` | Create a new account + send welcome email | [Auth.jsx](../Client/src/Auth/Auth.jsx) (sign-up form) |
| `POST /login` | Email + password login (returns token, or asks for 2FA) | [Auth.jsx](../Client/src/Auth/Auth.jsx) (login form) |
| `POST /refresh-token` | Get a fresh token using the refresh token | [Auth.jsx](../Client/src/Auth/Auth.jsx) (`refreshToken()`) |
| `POST /forgot-password` | Email a password-reset link | [ForgotPassword.jsx](../Client/src/Auth/ForgotPassword.jsx) |
| `POST /reset-password` | Set a new password from the reset link | [ResetPassword.jsx](../Client/src/Auth/ResetPassword.jsx) |
| `POST /2fa/setup` | Start 2FA: returns a QR code to scan | [Profile.jsx](../Client/src/components/Profile.jsx) |
| `POST /2fa/enable` | Confirm 2FA with the first code | [Profile.jsx](../Client/src/components/Profile.jsx) |
| `POST /2fa/verify` | During login, check the 2FA code, return token | [Auth.jsx](../Client/src/Auth/Auth.jsx) (2FA step) |
| `POST /2fa/disable` | Turn off 2FA (needs a valid code) | [Profile.jsx](../Client/src/components/Profile.jsx) |
| `POST /google/link` | Link a Google account to the current user | [Profile.jsx](../Client/src/components/Profile.jsx) |
| `POST /google/unlink` | Remove the linked Google account | [Profile.jsx](../Client/src/components/Profile.jsx) |
| `POST /send-verification-email` | Email a "verify your address" link | [Profile.jsx](../Client/src/components/Profile.jsx) |
| `GET /verify-email` | Confirm the email from the verification link | [VerifyEmail.jsx](../Client/src/Auth/VerifyEmail.jsx) |

---

## 2. Users — `/api/`
File: [UserRoutes.js](../Server/src/routes/UserRoutes.js) — **all routes require login.**
Frontend: [App.jsx](../Client/src/App.jsx), [Sidebar.jsx](../Client/src/Navbars/Sidebar.jsx), [Profile.jsx](../Client/src/components/Profile.jsx), [Messaging/api.js](../Client/src/Messaging/api.js), [JoinClassroom.jsx](../Client/src/Classroom/JoinClassroom.jsx)

| Method & Path | What it does | Called from (frontend) |
|---|---|---|
| `GET /getAllUsers` | List all users (admin only) | [Admin/api.js](../Client/src/Admin/api.js) (`fetchUsers`) |
| `GET /users-search?q=` | Light user search (for chat) | [Messaging/api.js](../Client/src/Messaging/api.js) (`searchUsers`) |
| `GET /institution-members` | Everyone in my institution | [Messaging/api.js](../Client/src/Messaging/api.js) (`getInstitutionMembers`) |
| `GET /classroom/:classroomId/students` | Students of a classroom (teacher) | [Messaging/api.js](../Client/src/Messaging/api.js) (`getClassroomStudents`) |
| `GET /users/:id` | Get one user | [Profile.jsx](../Client/src/components/Profile.jsx) |
| `POST /users` | Create a user (admin) | Admin UI |
| `PUT /users/:id` | Update a user / yourself (name, bio, password, plan…) | [Profile.jsx](../Client/src/components/Profile.jsx) |
| `POST /users/:id/avatar` | Upload a profile picture (Cloudinary) | [Profile.jsx](../Client/src/components/Profile.jsx) |
| `DELETE /users/:id` | Delete a user / your own account | [Profile.jsx](../Client/src/components/Profile.jsx) |
| `POST /completeProfile` | Save onboarding profile data | Onboarding UI |
| `GET /profile/:id` | Get a profile by id | [App.jsx](../Client/src/App.jsx), [Sidebar.jsx](../Client/src/Navbars/Sidebar.jsx) |
| `POST /join-classroom` | Student joins a class with an invite code (Institution plan) | [JoinClassroom.jsx](../Client/src/Classroom/JoinClassroom.jsx) |
| `GET /users/:id/classrooms` | Classrooms I teach or am enrolled in | [Messaging/api.js](../Client/src/Messaging/api.js) (`getMyClassrooms`), [MyClassrooms.jsx](../Client/src/Classroom/MyClassrooms.jsx) |
| `GET /student/classrooms/:id` | A classroom a student is enrolled in | [ClassroomView.jsx](../Client/src/Classroom/ClassroomView.jsx) |
| `GET /student/classrooms/:id/courses` | Courses inside that classroom | [ClassroomView.jsx](../Client/src/Classroom/ClassroomView.jsx) |
| `GET /student/courses/:id/modules` | Modules of a course (student view) | [ClassroomView.jsx](../Client/src/Classroom/ClassroomView.jsx) |
| `GET /student/classrooms/:id/announcements` | Announcements (student view) | [ClassroomView.jsx](../Client/src/Classroom/ClassroomView.jsx) |
| `GET /student/modules/:id/lessons` | Lessons of a module (student view) | [ClassroomView.jsx](../Client/src/Classroom/ClassroomView.jsx) |

---

## 3. Admin / Curriculum — `/api/admin`
File: [adminRoutes.js](../Server/src/routes/adminRoutes.js) — admin or teacher only (writes on grades/specialities/levels are admin-only).
Frontend: [Admin/api.js](../Client/src/Admin/api.js) (most calls), [AdminDashboard.jsx](../Client/src/Admin/AdminDashboard.jsx), [ProblemsPage.jsx](../Client/src/Problems/ProblemsPage.jsx), [ProblemCreatePage.jsx](../Client/src/Problems/ProblemCreatePage.jsx), [JoinClassroom.jsx](../Client/src/Classroom/JoinClassroom.jsx)

This is the school structure: **Grade → Speciality → Level → Course → Module → Lesson**, plus Classrooms.

**Public helper**
| `GET /classrooms/join/:code` | Look up a classroom by invite code (no login) | [JoinClassroom.jsx](../Client/src/Classroom/JoinClassroom.jsx) |

**Grades** → [Admin/api.js](../Client/src/Admin/api.js) (`fetchGrades`, `createGrade`, …)
| `GET /grades` · `GET /grades/:id` · `POST /grades` · `PUT /grades/:id` · `DELETE /grades/:id` | List / read / create / update / delete grades |

**Specialities** → [Admin/api.js](../Client/src/Admin/api.js) (`fetchSpecialities`, …)
| `GET /specialities` · `GET /grades/:gradeId/specialities` · `GET /specialities/:id` · `POST /specialities` · `PUT /specialities/:id` · `DELETE /specialities/:id` | Manage specialities |

**Levels** → [Admin/api.js](../Client/src/Admin/api.js) (`fetchLevels`, …)
| `GET /levels` · `GET /specialities/:specialityId/levels` · `GET /levels/:id` · `POST /levels` · `PUT /levels/:id` · `DELETE /levels/:id` | Manage levels |

**Courses** → [Admin/api.js](../Client/src/Admin/api.js) (`fetchCourses`, …)
| `GET /courses` · `GET /levels/:levelId/courses` · `GET /courses/:id` · `POST /courses` · `PUT /courses/:id` · `DELETE /courses/:id` | Manage courses |

**Modules** → [Admin/api.js](../Client/src/Admin/api.js) (`fetchModules`, …)
| `GET /modules` · `GET /courses/:courseId/modules` · `GET /modules/:id` · `POST /modules` · `PUT /modules/:id` · `DELETE /modules/:id` | Manage modules |

**Lessons** → [Admin/api.js](../Client/src/Admin/api.js) (`fetchLessons`, `uploadLessonFile`, …)
| `GET /lessons` · `POST /lessons/upload` · `GET /modules/:moduleId/lessons` · `GET /lessons/:id` · `POST /lessons` · `PUT /lessons/:id` · `DELETE /lessons/:id` | Manage lessons & upload lesson files |

**Announcements** (classroom stream)
| `GET /classrooms/:classId/announcements` · `POST /classrooms/:classId/announcements` · `PUT /announcements/:id` · `DELETE /announcements/:id` | Read / post / edit / delete classroom announcements |

**Classrooms** → [Admin/api.js](../Client/src/Admin/api.js) (`fetchClassrooms`, `createClassroom`, …)
| `GET /classrooms` · `GET /classrooms/:id` · `GET /classrooms/:id/courses` · `GET /classrooms/:id/modules` · `POST /classrooms/:id/modules` · `DELETE /classrooms/:id/modules/:moduleId` · `POST /classrooms` · `PUT /classrooms/:id` · `DELETE /classrooms/:id` | Manage classrooms & their assigned modules |

**Enrollment**
| `GET /students/available` · `GET /classrooms/:id/students` · `POST /classrooms/:id/students` (send invites) · `DELETE /classrooms/:id/students/:studentId` | Manage students in a classroom → [Admin/api.js](../Client/src/Admin/api.js) (`fetchAvailableStudents`, `assignStudentsToClassroom`, …) |

**Stats**
| `GET /stats` | Dashboard counters (grades, courses, students…) → [Admin/api.js](../Client/src/Admin/api.js) (`fetchAdminStats`) |

---

## 4. AI & Problems — `/api/ai`
File: [ai/Ai.js](../Server/src/ai/Ai.js) (remember the doubled `/ai/...`).
Frontend: [ProblemsPage.jsx](../Client/src/Problems/ProblemsPage.jsx), [ProblemPage.jsx](../Client/src/Problems/ProblemPage.jsx), [ProblemCreatePage.jsx](../Client/src/Problems/ProblemCreatePage.jsx), [AdminDashboard.jsx](../Client/src/Admin/AdminDashboard.jsx), [InstitutionTab.jsx](../Client/src/Admin/InstitutionTab.jsx), [ClassroomProblemsTab.jsx](../Client/src/Classroom/ClassroomProblemsTab.jsx), [AIMentor.jsx](../Client/src/components/AIMentor.jsx), [Messaging/api.js](../Client/src/Messaging/api.js)

| Method & Path | What it does | Called from (frontend) |
|---|---|---|
| `POST /ai/chat` | One short AI reply (the `/ai` chat command) → real URL `/api/ai/ai/chat` | [Messaging/api.js](../Client/src/Messaging/api.js) (`aiChat`) |
| `POST /ai/generate/roadmaps` | Generate a simple topic roadmap (nodes/edges) | Roadmap UI |
| `POST /generate/problem-roadmap` | Build a learning roadmap for one problem | [ProblemPage.jsx](../Client/src/Problems/ProblemPage.jsx) |
| `POST /ai/generate/problems` | AI-generate 5 problems and save them | [AdminDashboard.jsx](../Client/src/Admin/AdminDashboard.jsx) |
| `GET /ai/getallproblems` | List problems (filtered by plan/scope/class) | [ProblemsPage.jsx](../Client/src/Problems/ProblemsPage.jsx), [planApi.js](../Client/src/Admin/planApi.js) (`fetchAllProblems`, `fetchInstitutionProblems`) |
| `POST /ai/problems` | Create one problem manually | [ProblemCreatePage.jsx](../Client/src/Problems/ProblemCreatePage.jsx), [planApi.js](../Client/src/Admin/planApi.js) (`createInstitutionProblem`) |
| `POST /ai/problems/generate-draft` | AI draft (1/3/5) — **not saved** | [ProblemCreatePage.jsx](../Client/src/Problems/ProblemCreatePage.jsx) |
| `GET /ai/problems/check-duplicate?title=` | Warn if a similar problem exists | [ProblemCreatePage.jsx](../Client/src/Problems/ProblemCreatePage.jsx) |
| `POST /ai/problems/:id/fork` | Copy a problem into a class/module/institution | [ClassroomProblemsTab.jsx](../Client/src/Classroom/ClassroomProblemsTab.jsx), [InstitutionTab.jsx](../Client/src/Admin/InstitutionTab.jsx) |
| `PATCH /ai/problems/:id` | Edit a problem (also free/pro-tier toggles) | [planApi.js](../Client/src/Admin/planApi.js) (`setProblemFreeTier`, `setProblemProTier`), [InstitutionTab.jsx](../Client/src/Admin/InstitutionTab.jsx) |
| `POST /ai/problems/save-draft` | Save an AI draft as a real problem | [ProblemCreatePage.jsx](../Client/src/Problems/ProblemCreatePage.jsx) |
| `PATCH /ai/problems/:id/status` | Change status (draft/review/published/archived) | [AdminDashboard.jsx](../Client/src/Admin/AdminDashboard.jsx) |
| `POST /ai/getproblembyid` | Get one problem (by id, in the body) | [ProblemPage.jsx](../Client/src/Problems/ProblemPage.jsx) |
| `DELETE /ai/deletepromblem/:id` | Delete a problem | [planApi.js](../Client/src/Admin/planApi.js) (`deleteInstitutionProblem`), Admin UI |
| `POST /ai/correct-code` | "Fix my code with AI" (Pro/Institution only) | [ProblemPage.jsx](../Client/src/Problems/ProblemPage.jsx) |
| `POST /ai/mentor` | Streaming Socratic coding mentor (SSE) | [AIMentor.jsx](../Client/src/components/AIMentor.jsx) |

---

## 5. PDF AI Tools — `/api/pdf`
File: [pdfRoutes.js](../Server/src/routes/pdfRoutes.js) — **login + Pro/Institution plan required.**
Frontend: [PdfAssistant.jsx](../Client/src/components/PdfAssistant.jsx), [Admin/api.js](../Client/src/Admin/api.js) (`uploadLessonPdf`)

| Method & Path | What it does |
|---|---|
| `POST /upload` | Upload a PDF, extract text, build a search index |
| `GET /list` | List uploaded PDFs |
| `POST /explain` | Explain a selected piece of text in simple words |
| `POST /chat` | Ask questions about a PDF (RAG semantic search) |
| `POST /summarize` | Summarize a PDF in bullet points |
| `POST /quiz` | Generate a 10 or 20 question quiz from the PDF |
| `POST /highlights` · `GET /highlights/:pdfId` · `DELETE /highlights/:pdfId/:highlightId` | Save / list / delete highlights |
| `POST /bookmarks` · `GET /bookmarks/:pdfId` · `DELETE /bookmarks/:pdfId/:bookmarkId` | Save / list / delete bookmarks |
| `POST /smart-search` | Concept-based semantic search inside the PDF |

---

## 6. Code Submissions — `/api/submissions`
File: [submissionRoutes.js](../Server/src/routes/submissionRoutes.js) — login required.
Frontend: [ProblemPage.jsx](../Client/src/Problems/ProblemPage.jsx), [ProblemsPage.jsx](../Client/src/Problems/ProblemsPage.jsx), [LearningDashboard.jsx](../Client/src/Dashbord/LearningDashboard.jsx)

| Method & Path | What it does | Called from |
|---|---|---|
| `POST /` | Save a code submission + update the student's problem record | [ProblemPage.jsx](../Client/src/Problems/ProblemPage.jsx) (after running code) |
| `GET /:userId` | A student's submissions + stats (solved, languages, difficulty) | [ProblemsPage.jsx](../Client/src/Problems/ProblemsPage.jsx), [LearningDashboard.jsx](../Client/src/Dashbord/LearningDashboard.jsx) |

> Note: actually **running** the code uses an external service (Piston/`execute`) from
> [Codeeditor/Api.js](../Client/src/Codeeditor/Api.js), not the backend.

---

## 7. Assignments — `/api/assignments`
File: [assignmentRoutes.js](../Server/src/routes/assignmentRoutes.js) — login required (writes are teacher/admin).
Frontend: [ModuleAssignmentsTab.jsx](../Client/src/Admin/ModuleAssignmentsTab.jsx) (teacher), [ClassAssignmentsPage.jsx](../Client/src/Classroom/ClassAssignmentsPage.jsx) / [ClassroomView.jsx](../Client/src/Classroom/ClassroomView.jsx) (student)

| Method & Path | What it does |
|---|---|
| `POST /` | Teacher creates a draft assignment |
| `GET /module/:moduleId` | Assignments of a module (students only see published) |
| `GET /student/:studentId/module/:moduleId` | Assignments + this student's solved status |
| `PUT /:id` | Edit an assignment |
| `PUT /:id/publish` | Publish/unpublish (notifies students on first publish) |
| `GET /:id/roster` | Per-student completion grid (teacher) |
| `GET /:id/student/:studentId/submissions` | One student's latest submissions for the assignment |
| `GET /:id/stats` | How many students solved each problem |
| `DELETE /:id` | Delete an assignment |

---

## 8. Conversations (chat) — `/api/conversations`
File: [conversationRoutes.js](../Server/src/routes/conversationRoutes.js) — login required.
Frontend: [Messaging/api.js](../Client/src/Messaging/api.js) → used by [Messages.jsx](../Client/src/Messaging/Messages.jsx)

| Method & Path | What it does | api.js function |
|---|---|---|
| `POST /create-group` | Create a group (free tier capped at 3) | `createGroup` |
| `POST /invite` | Owner invites a user to a group | `invite` |
| `POST /:id/accept` · `POST /:id/reject` | Accept / reject a group invite | `acceptInvite`, `rejectInvite` |
| `PUT /:id` | Rename a group (owner) | `renameGroup` |
| `DELETE /:id` | Delete a group (owner) | `deleteGroup` |
| `POST /:id/leave` | Leave a group | `leaveGroup` |
| `POST /:id/ban` | Ban a user from a group (owner) | `banUser` |
| `GET /` | List my conversations | `listConversations` |
| `GET /:id/messages` | Messages in a conversation | `listMessages` |
| `POST /:id/photo` | Upload a conversation photo (Cloudinary) | `uploadConversationPhoto` |

---

## 9. Messages — `/api/messages`
File: [messageRoutes.js](../Server/src/routes/messageRoutes.js) — login required.
Frontend: [Messaging/api.js](../Client/src/Messaging/api.js)

| Method & Path | What it does | api.js function |
|---|---|---|
| `POST /upload` | Upload a message attachment | `uploadAttachment` |
| `POST /send` | Send a message into a conversation | `sendMessage` |
| `POST /private` | Send a private message (auto-creates the 1:1 chat; free tier capped at 3 contacts) | `sendPrivate` |

---

## 10. Notifications — `/api/notifications`
File: [notificationRoutes.js](../Server/src/routes/notificationRoutes.js) — login required.
Frontend: [Messaging/api.js](../Client/src/Messaging/api.js)

| Method & Path | What it does | api.js function |
|---|---|---|
| `GET /` | List my notifications | `listNotifications` |
| `PUT /:id/read` | Mark one as read | `markNotificationRead` |
| `POST /:id/accept` | Accept a classroom invite notification | `acceptInvitation` |
| `POST /:id/decline` | Decline a classroom invite notification | `declineInvitation` |

---

## 11. Plans & Institutions — `/api/plan`
File: [planRoutes.js](../Server/src/routes/planRoutes.js).
Frontend: [Admin/planApi.js](../Client/src/Admin/planApi.js) → used by [InstitutionTab.jsx](../Client/src/Admin/InstitutionTab.jsx), [PlanPricingTab.jsx](../Client/src/Admin/PlanPricingTab.jsx), [UsersByPlanTab.jsx](../Client/src/Admin/UsersByPlanTab.jsx), [Profile.jsx](../Client/src/components/Profile.jsx), [OnboardInstitution.jsx](../Client/src/Auth/OnboardInstitution.jsx)

**Public (no login)**
| `GET /invite/:token` | Preview an invite link → `fetchInvitePreview` |
| `GET /pricing` | Plan prices → `fetchPlanPricing` |

**My plan**
| `GET /me/plan` | What my plan unlocks + usage limits → `fetchMyPlan` |
| `POST /upgrade/pro` · `POST /upgrade/institution` | Simulated self-upgrade → `upgradeToPro`, `upgradeToInstitution` |
| `PUT /pricing` | Super admin changes prices → `changeamount` |
| `POST /institutions/logo-upload` | Upload an institution logo |

**Institutions**
| `POST /institutions/self-create` | Create my own institution after paying → `selfCreateInstitution` |
| `GET /institutions/:id` · `PATCH /institutions/:id` | Read / edit institution profile → `fetchInstitution`, `updateInstitution` |
| `POST /institutions` | Super admin creates an institution → `createInstitution` |
| `GET /institutions/:id/members` · `DELETE /institutions/:id/members/:userId` | List / remove members → `fetchInstitutionMembers`, `removeMember` |

**Invite links**
| `POST /institutions/:id/invite-links` · `GET /institutions/:id/invite-links` · `DELETE /invite-links/:token` | Create / list / revoke links → `createInviteLink`, `fetchInviteLinks`, `revokeInviteLink` |
| `POST /institutions/:id/invite-user` | Invite a user by email + notification → `inviteUserByEmail` |
| `GET /users/search?q=` | Find invitable users → `searchUsers` |
| `POST /invite/:token/accept` | Accept an invite and join → `acceptInvite` |

**Command center (institution admin)**
| `GET /institutions/:id/stats` | Overview counters & recent activity → `fetchInstitutionStats` |
| `GET /institutions/:id/classrooms` | Classrooms + filters & counters → `fetchInstitutionClassrooms` |
| `GET /institutions/:id/classrooms/:classId/audit` | Read-only class audit → `fetchClassroomAudit` |
| `PATCH /institutions/:id/classrooms/:classId` | Archive/reactivate a class → `setClassroomActive` |
| `GET /institutions/:id/announcements` · `POST …` · `DELETE …/:annId` | Institution-wide announcements → `fetchAnnouncements`, `createAnnouncement`, `deleteAnnouncement` |
| `GET /institutions/:id/analytics` | Aggregated analytics → `fetchAnalytics` |

**Super admin dashboards**
| `GET /super-admin/users-by-plan` | Users grouped by plan → `fetchUsersByPlan` |
| `GET /super-admin/users-overview` | Rich per-user view + chart stats → `fetchUsersOverview` |

---

## 12. Workspace — `/api/workspace`
File: [workspaceRoutes.js](../Server/src/routes/workspaceRoutes.js) — login required. Personal PDF/code locker.
Frontend: [PdfAssistant.jsx](../Client/src/components/PdfAssistant.jsx), [LearningDashboard.jsx](../Client/src/Dashbord/LearningDashboard.jsx), [ClassroomPdf.jsx](../Client/src/ClassroomPdf/ClassroomPdf.jsx)

| Method & Path | What it does |
|---|---|
| `GET /list` | List my workspace items (free tier capped at 3 each) |
| `POST /pdf` | Upload a PDF to my workspace |
| `POST /code` | Save a code snippet |
| `POST /code/analyze` | AI review/chat about a code snippet |
| `POST /code/summarize` | AI summary of a snippet |
| `POST /code/quiz` | AI quiz from a snippet |
| `GET /history` · `POST /history` · `DELETE /history/:id` · `DELETE /history` | Study history (quizzes & explanations) |
| `PATCH /item/:itemId` | Rename an item / set tags |
| `DELETE /item/:itemId` | Delete a PDF or code item |

---

## 13. Stripe — `/api/stripe`
File: [stripeRoutes.js](../Server/src/routes/stripeRoutes.js) — login required.
Frontend: [Admin/planApi.js](../Client/src/Admin/planApi.js) → used by [Profile.jsx](../Client/src/components/Profile.jsx) / [PlanSection.jsx](../Client/src/components/PlanSection.jsx)

| Method & Path | What it does | planApi.js function |
|---|---|---|
| `POST /create-checkout-session` | Start a Stripe Checkout for Pro/Institution | `createCheckoutSession` |
| `GET /verify/:sessionId` | Confirm payment and upgrade the user | `verifyStripeSession` |
| `POST /` | Test helper that echoes an amount | — |

---

## 14. Institution Curriculum — `/api/institution-curriculum`
File: [institutionCurriculumRoutes.js](../Server/src/routes/institutionCurriculumRoutes.js) — institution admin / super admin, scoped to `:institutionId`.
Frontend: [Admin/planApi.js](../Client/src/Admin/planApi.js) → used by [InstitutionTab.jsx](../Client/src/Admin/InstitutionTab.jsx)

Each institution keeps its **own** grades/specialities/levels (separate from the global admin ones).

| Method & Path | What it does | planApi.js function |
|---|---|---|
| `GET/POST/PUT/DELETE /:institutionId/grades[...]` | Manage the institution's grades | `fetchInstitutionGrades`, `createInstitutionGrade`, `updateInstitutionGrade`, `deleteInstitutionGrade` |
| `GET/POST/PUT/DELETE /:institutionId/specialities[...]` | Manage specialities | `fetchInstitutionSpecialities`, `createInstitutionSpeciality`, … |
| `GET/POST/PUT/DELETE /:institutionId/levels[...]` | Manage levels | `fetchInstitutionLevels`, `createInstitutionLevel`, … |
| `POST /:institutionId/seed-from-defaults` | Copy the global templates into this institution | `seedInstitutionCurriculum` |

---

## 15. Roadmaps — `/api/roadmap`
File: [roadmapRoutes.js](../Server/src/routes/roadmapRoutes.js) — login required.
Frontend: [Roadmap/api.js](../Client/src/Roadmap/api.js) → used by [RoadmapPage.jsx](../Client/src/Roadmap/RoadmapPage.jsx), and classroom roadmaps via [ClassroomRoadmapTab.jsx](../Client/src/Classroom/ClassroomRoadmapTab.jsx)

**Personal roadmap** → `roadmapApi.*`
| Method & Path | What it does | api.js function |
|---|---|---|
| `GET /me` | My active roadmap + profile | `me` |
| `GET /list` | All my roadmaps | `list` |
| `PUT /profile` | Save career goal / interests / languages | `saveProfile` |
| `POST /generate` | Generate a new roadmap (plan-capped) | `generate` |
| `POST /switch/:id` | Make a saved roadmap active | `switchTo` |
| `DELETE /:id` | Delete a roadmap | `deleteRoadmap` |
| `PATCH /:id/title` | Rename a roadmap | `rename` |
| `POST /node/:nodeId/status` | Mark a node pending/in-progress/completed | `setStatus` |
| `POST /node/:nodeId/quiz-submit` | Submit a node quiz score | `quizSubmit` |
| `POST /certificate/issue` | Issue the completion certificate | `issueCertificate` |
| `GET /node/:nodeId/resources` | Get a node's videos/docs/StackOverflow | `resources` |

**Classroom roadmap** → `roadmapApi.classroom.*`
| Method & Path | What it does | api.js function |
|---|---|---|
| `POST /classroom/:classId/generate` | Teacher creates + shares a roadmap to all students | `classroom.generate` |
| `GET /classroom/:classId` | Get the roadmap (teacher: master, student: own copy) | `classroom.get` |
| `GET /classroom/:classId/dashboard` | Teacher view of every student's progress | `classroom.dashboard` |
| `DELETE /classroom/:classId` | Teacher removes the class roadmap | `classroom.remove` |
| `POST /classroom/:classId/node/:nodeId/status` | Student updates status on their copy | `classroom.setStatus` |
| `POST /classroom/:classId/node/:nodeId/quiz-submit` | Student submits a quiz on their copy | `classroom.quizSubmit` |

---

## Quick tips for reading this

- **"login required"** = the route uses the `authenticate` middleware ([Authmiddleware.js](../Server/src/middleware/Authmiddleware.js)); send the `Authorization: Bearer <token>` header.
- **"Pro/Institution only"** = the route also uses `requirePro`; free users get HTTP `402 Upgrade required`.
- **Real-time** chat & notifications also use Socket.IO ([realtime/messageHub.js](../Server/src/realtime/messageHub.js)), set up in [Messaging/api.js](../Client/src/Messaging/api.js) (`getSocket`).
- Frontend base URL is hard-coded to `http://localhost:5000` in the various `api.js` files.
</content>
</invoke>
