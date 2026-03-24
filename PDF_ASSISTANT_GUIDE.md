# 📚 AI PDF Assistant - Complete Guide

## ✅ Installation Complete!

The AI PDF Assistant has been successfully added to your OmniLearn application.

---

## 📁 Files Created/Modified

### Backend
- `Server/src/routes/pdfRoutes.js` - All PDF endpoints
- `Server/src/server.js` - Added PDF routes
- `Server/package.json` - Added pdf-parse@1.1.1

### Frontend
- `Client/src/components/PdfAssistant.jsx` - Main PDF viewer component
- `Client/src/App.jsx` - Added route for /pdf-assistant
- `Client/package.json` - Added react-pdf and pdfjs-dist

---

## 🚀 How to Start

### 1. Start Backend
```bash
cd Server
npm run dev
```
Server runs on `http://localhost:5000`

### 2. Start Frontend
```bash
cd Client
npm run dev
```

### 3. Access AI PDF Assistant
Navigate to: `http://localhost:YOUR_PORT/pdf-assistant`

---

## 🎯 Features

### 1. **Upload PDF**
- Click the file input at the top
- Select any PDF file from your computer
- File is automatically processed and text is extracted

### 2. **View PDF**
- PDF displays in the left panel
- Use "Previous" and "Next" buttons to navigate pages
- Shows current page number (e.g., "Page 1 of 10")

### 3. **Explain Selected Text with AI** 💡
- Select any text in the PDF with your mouse
- A popup button appears: "💡 Explain with AI"
- Click it to get a simple, beginner-friendly explanation
- Explanation appears below the PDF in a blue box

### 4. **Chat with PDF** 💬 (RAG System)
- Right panel has a chat interface
- Type any question about the PDF content
- AI searches the PDF and answers based on the content
- Chat history is saved during your session

### 5. **Summarize PDF** 📄
- Click "📄 Summarize PDF" button in the chat panel
- Get a 3-5 bullet point summary of the PDF
- Summary appears in the chat

---

## 🔧 API Endpoints

### `POST /api/pdf/upload`
Upload and process PDF file
- Input: `multipart/form-data` with `pdf` field
- Output: `{ pdfId, filename, totalPages, chunksCount }`

### `POST /api/pdf/explain`
Explain selected text
- Input: `{ text: string }`
- Output: `{ explanation: string }`

### `POST /api/pdf/chat`
Ask questions about PDF (RAG)
- Input: `{ pdfId: string, question: string }`
- Output: `{ answer: string, sources: number }`

### `POST /api/pdf/summarize`
Summarize PDF
- Input: `{ pdfId: string }`
- Output: `{ summary: string }`

---

## 🧠 How RAG Works (Simple Explanation)

**RAG = Retrieval Augmented Generation**

1. **Upload**: PDF text is extracted and split into 800-word chunks
2. **Storage**: Chunks are stored in memory (server RAM)
3. **Question**: When you ask a question, the system:
   - Searches for chunks containing your question keywords
   - Takes the top 3 most relevant chunks
   - Sends them + your question to the AI
4. **Answer**: AI reads the chunks and answers based on that context

### Example Flow:
```
User asks: "What is the main topic of chapter 2?"
↓
System searches chunks for: "chapter" and "2"
↓
Finds 3 relevant chunks from chapter 2
↓
Sends to AI: "Context: [chunks]... Question: What is the main topic?"
↓
AI responds with answer based on the chunks
```

---

## 🛠️ Technical Details

### Backend Stack
- **pdf-parse@1.1.1**: Extract text from PDF
- **multer**: Handle file uploads
- **groq-sdk**: AI model (Llama-3.3-70B)
- **Express**: REST API endpoints

### Frontend Stack
- **react-pdf**: Display PDF in browser
- **pdfjs-dist**: PDF rendering engine
- **axios**: API calls
- **React hooks**: State management

### AI Model
- **Model**: Llama-3.3-70B (via Groq)
- **Fast**: Responses in 1-3 seconds
- **Free tier**: Available

---

## 💾 Data Storage

**Current**: In-memory cache (Map)
- ✅ Simple and fast
- ✅ No database setup needed
- ❌ Clears when server restarts

**Future improvements** (optional):
- Store in PostgreSQL database
- Add user authentication
- Save chat history
- Use vector database (ChromaDB, Pinecone)

---

## 🎨 UI Components

### Left Panel (PDF Viewer)
- File upload input
- PDF document display
- Page navigation buttons
- Text selection popup
- Explanation box

### Right Panel (Chat)
- "Summarize PDF" button
- Chat message history
- Input field for questions
- Send button

---

## 🔑 Key Code Locations

### Helper Functions (Backend)
- `chunkText()` - Splits text into chunks (Server/src/routes/pdfRoutes.js:177)
- `findRelevantChunks()` - Searches for relevant content (Server/src/routes/pdfRoutes.js:192)

### React Handlers (Frontend)
- `handleFileUpload()` - Uploads PDF (Client/src/components/PdfAssistant.jsx:25)
- `handleTextSelection()` - Detects text selection (Client/src/components/PdfAssistant.jsx:54)
- `explainText()` - Gets AI explanation (Client/src/components/PdfAssistant.jsx:65)
- `askQuestion()` - Chat with PDF (Client/src/components/PdfAssistant.jsx:80)

---

## 🐛 Troubleshooting

### Server won't start
```
Error: DOMMatrix is not defined
```
**Solution**: Make sure you're using pdf-parse@1.1.1
```bash
cd Server
npm install pdf-parse@1.1.1
```

### PDF won't display
```
Error: Cannot read pdf worker
```
**Solution**: Check that the worker path is correct in PdfAssistant.jsx:6
```javascript
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

### API calls fail
**Solution**: Check CORS is enabled and API_URL is correct
```javascript
const API_URL = "http://localhost:5000/api/pdf";
```

### Chat doesn't work
**Solution**: Make sure you uploaded a PDF first and got a `pdfId`

---

## 🚀 Future Enhancements (Ideas)

1. **Better RAG**: Use embeddings instead of keyword search
2. **Translate**: Add translation feature for selected text
3. **Highlight**: Highlight sources in PDF that AI used
4. **Export Chat**: Download chat history as text/PDF
5. **Multi-PDF**: Compare multiple PDFs at once
6. **OCR**: Extract text from scanned PDFs
7. **Voice**: Ask questions with voice input
8. **Annotations**: Save notes and highlights

---

## 📝 Code is Simple!

The entire feature is just **2 files**:
- Backend: `pdfRoutes.js` (~210 lines)
- Frontend: `PdfAssistant.jsx` (~280 lines)

Total: **~500 lines of easy-to-read code!**

No complex libraries, no vector databases, no fancy algorithms.
Just:
- Upload PDF → Extract text
- Split into chunks → Store in memory
- Ask question → Search chunks → Send to AI
- Display answer → Done! ✅

---

## 🎓 Learn More

- [react-pdf docs](https://github.com/wojtekmaj/react-pdf)
- [pdf-parse docs](https://www.npmjs.com/package/pdf-parse)
- [Groq API docs](https://console.groq.com/docs)
- [RAG explained](https://aws.amazon.com/what-is/retrieval-augmented-generation/)

---

## ✨ That's It!

You now have a complete AI PDF Assistant in your app.

**Questions?** Check the code - it's simple and well-commented!

**Happy learning!** 🚀📚
