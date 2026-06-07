# Assignment Feature — Explained Simply

## What is an Assignment?

An **assignment** is a teacher-created task that groups **problems** (coding exercises) and attaches them to a **module** within a **classroom**. Students solve the problems in the code editor, submit their code, and the teacher can track progress.

---

## How It Works (Front ↔ Back)

### 1. Teacher creates a Module (back-end route: `POST /api/admin/classrooms/:id/modules`)

- **Front-end**: Admin panel form → creates module inside a classroom
- **Back-end**: Saves to DB table `Module`, returns the module

### 2. Teacher creates an Assignment (back-end route: `POST /api/assignments`)

- **Front-end**: Admin panel → picks a module, sets a deadline, adds problems
- **Back-end**: Saves to DB table `ClassAssignment`, links to `Module`
- The assignment has: `id`, `moduleId`, `title`, `dueDate`, `problems`, `published` flag

### 3. Teacher publishes the Assignment (back-end route: `PUT /api/assignments/:id/publish`)

- **Front-end**: Publish button in admin panel
- **Back-end**: Sets `published = true` so students can see it

### 4. Student views assignments (back-end route: `GET /api/assignments/student/:studentId/module/:moduleId`)

- **Front-end**: `ClassAssignmentsPage.jsx` loads assignments for the classroom
- **Back-end**: Queries `ClassAssignment` where module matches, returns assignments + their problems

### 5. Student solves a problem in the code editor

- **Front-end**: `Codeeditor.jsx` loads the problem, student writes code, clicks "Submit"
- **Back-end**: `POST /api/submissions` saves their code to `CodeSubmission` table

### 6. Teacher views stats (back-end route: `GET /api/assignments/:id/stats`)

- **Front-end**: `ModuleAssignmentsTab.jsx` shows roster + per-student submission status
- **Back-end**: Aggregates submissions for that assignment, returns which students submitted, scores, timestamps

---

## Key Database Tables

| Table | Purpose |
|---|---|
| `Module` | Groups assignments within a classroom |
| `ClassAssignment` | One assignment (title, due date, problems, published flag) |
| `CodeSubmission` | One student's submitted code for a problem |

## Client Files Involved

- `Client/src/Classroom/ClassAssignmentsPage.jsx` — student-facing assignment list
- `Client/src/Admin/ModuleAssignmentsTab.jsx` — teacher-facing assignment management + stats
- `Client/src/Codeeditor/Codeeditor.jsx` — the actual coding/problem-solving interface
- `Client/src/Admin/api.js` — API calls for admin operations (create module, create assignment)

## Server Files Involved

- `Server/src/routes/assignmentRoutes.js` — all `/api/assignments` endpoints
- `Server/src/routes/submissionRoutes.js` — all `/api/submissions` endpoints
- `Server/src/models/ClassAssignment.js` — the assignment model
- `Server/src/models/CodeSubmission.js` — the submission model
