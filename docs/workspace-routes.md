# Workspace Feature — Routes Explained (Front ↔ Back)

## What is the Workspace?

The **workspace** is a per-user file storage area where students can:
- Upload **PDF files** (lecture notes, books up to 50MB)
- Save **code snippets** (paste or drag-drop)
- Run **AI analysis** on code (explain, summarize, generate quizzes)
- Review **study history** (past quiz attempts & AI explanations)

Free tier: 3 PDFs + 3 code files. Pro/Institution tier: 200 each.

---

## Server-Side Routes (`/api/workspace`)

File: `Server/src/routes/workspaceRoutes.js`

| Method | Endpoint | What it does |
|---|---|---|
| `GET` | `/list` | Returns all workspace items for the logged-in user (PDFs + code) |
| `POST` | `/pdf` | Upload a PDF file (multipart form). Free users limited to 3, Pro to 200 |
| `POST` | `/code` | Save a code snippet. Body: `{ name, content }`. Same tier limits |
| `POST` | `/code/analyze` | AI analysis via Groq (Llama 3.3). Body: `{ itemId }` or `{ content, language }`. Optional `question` field for follow-up |
| `POST` | `/code/summarize` | AI generates a summary of a saved code snippet |
| `POST` | `/code/quiz` | AI generates multiple-choice questions from code (1–20 questions) |
| `GET` | `/history` | Fetch the user's study history (quiz results + AI explanations) |
| `POST` | `/history` | Save a study history entry (quiz attempt or explanation) |
| `DELETE` | `/history/:id` | Delete one specific history entry |
| `DELETE` | `/history` | Clear all history for the user |
| `PATCH` | `/item/:itemId` | Rename a workspace item or update its tags |
| `DELETE` | `/item/:itemId` | Delete a workspace item (also removes the physical PDF file from disk) |

---

## Client-Side (Frontend)

### Main Page: `ClassroomPdf.jsx` (route: `/classroom-pdf`)

The UI has:
- **Left sidebar**: lists all workspace items with file type icons (PDF/code), tags, search/filter bar
- **Upload PDF button**: triggers `POST /api/workspace/pdf`
- **Add Code button**: modal to paste code or drop a file → `POST /api/workspace/code`
- **Click an item**: right panel shows the content
  - PDF → embedded viewer (`react-pdf-viewer`)
  - Code → syntax-highlighted code viewer with "AI Assistant" button
- **AI Assistant button** on code items → navigates to `/pdf-assistant` with code context
- **Rename/Tags**: pencil icon → modal → `PATCH /api/workspace/item/:itemId`
- **Delete**: trash icon → confirmation → `DELETE /api/workspace/item/:itemId`

### AI Assistant: `PdfAssistant.jsx`

Uses `WORKSPACE_API = ${SERVER_URL}/api/workspace` for:
- Loading and saving study history (`/history`)
- Code analysis and explanation (`/code/analyze`)

### Dashboard Integration: `LearningDashboard.jsx`

Links to the workspace page via a navigation link (`navigate("/classroom-pdf")`).

### Tier Limits Display: `PlanSection.jsx`

Shows usage bars:
- Free: 3/3 PDFs, 3/3 code snippets
- Pro: 200 max each

---

## Data Flow Example

### Uploading a PDF:
1. User clicks "Upload PDF" in `ClassroomPdf.jsx`
2. File picker opens → user selects a PDF
3. `POST /api/workspace/pdf` with `multipart/form-data` → server saves file to `Server/src/uploads/workspace/`
4. Server creates an entry in the user's workspace JSON index
5. Response returns the new item → UI updates the sidebar

### Analyzing code with AI:
1. User clicks "AI Assistant" on a code item
2. `POST /api/workspace/code/analyze` with `{ itemId }`
3. Server reads the code from the workspace index, sends it to Groq API (`llama-3.3-70b-versatile`)
4. AI returns explanation → displayed in the AI chat panel
5. History entry saved via `POST /api/workspace/history`

---

## Key Files

| File | Role |
|---|---|
| `Server/src/routes/workspaceRoutes.js` | All workspace API endpoints |
| `Client/src/ClassroomPdf/ClassroomPdf.jsx` | Main workspace UI |
| `Client/src/ClassroomPdf/ClassroomPdf.css` | Workspace styles |
| `Client/src/components/PdfAssistant.jsx` | AI analysis integration |
| `Client/src/components/PlanSection.jsx` | Tier limit display |
