# C4 Diagram - Semantic Research / Smart Search

This document explains the semantic research flow used by OmniLearn's PDF assistant. In the codebase, this feature is implemented as a retrieval-augmented generation path: the client sends a query, the server tries semantic retrieval with embeddings and Chroma, and the AI formats the final answer.

Main code paths:
- [Client/src/components/PdfAssistant.jsx](../Client/src/components/PdfAssistant.jsx)
- [Server/src/routes/pdfRoutes.js](../Server/src/routes/pdfRoutes.js)

## Level 1 - System Context

```mermaid
C4Context
title Semantic Research / Smart Search - System Context

Person(user, "Student / Teacher", "Searches inside uploaded PDFs and asks questions by meaning, not only by exact words")
System(omni, "OmniLearn", "Educational platform with a semantic PDF research feature")
System_Boundary(pdf, "PDF Assistant") {
  System(pdfAssistant, "PDF Assistant", "Uploads PDFs, chunks text, builds embeddings, and serves semantic search results")
}
System_Ext(hf, "HuggingFace Inference", "Generates text embeddings")
System_Ext(chroma, "Chroma DB", "Stores and retrieves vectors")
System_Ext(ai, "LLM Provider", "Generates the final answer or formatted search response")

Rel(user, omni, "Uses")
Rel(omni, pdfAssistant, "Delegates semantic research to")
Rel(pdfAssistant, hf, "Creates embeddings")
Rel(pdfAssistant, chroma, "Stores and searches vectors")
Rel(pdfAssistant, ai, "Sends retrieved context and query")
```

## Level 2 - Container View

```mermaid
C4Container
title Semantic Research / Smart Search - Container View

Person(user, "Student / Teacher", "PDF search user")

System_Boundary(omni, "OmniLearn") {
  Container(client, "Client", "React + Vite", "Renders PdfAssistant and sends search requests")
  Container(api, "Server API", "Node.js + Express", "Handles /upload, /chat, /smart-search and fallback logic")
  Container(storage, "File Storage", "Local disk", "Keeps uploaded PDFs and index metadata")
  Container(cache, "In-memory cache", "JavaScript objects", "Keeps loaded PDFs and vector-store handles")
}

System_Ext(hf, "HuggingFace Inference", "Embedding model service")
System_Ext(chroma, "Chroma DB", "Vector database")
System_Ext(ai, "LLM Provider", "Answer generation")

Rel(user, client, "Searches by meaning")
Rel(client, api, "POST /smart-search or POST /chat")
Rel(api, storage, "Reads uploaded PDF and index file")
Rel(api, cache, "Reads / writes loaded PDF data")
Rel(api, hf, "Builds embeddings")
Rel(api, chroma, "Similarity search")
Rel(api, ai, "Generates answer or excerpt summary")
```

## Level 3 - Component View

```mermaid
C4Component
title Semantic Research / Smart Search - Component View

Container_Boundary(api, "Server/src/routes/pdfRoutes.js") {
  Component(upload, "Upload handler", "Multer + PDF parsing", "Extracts text, chunks it, and stores vector data")
  Component(loader, "PDF loader", "Cache + filesystem", "Loads the PDF, metadata, and vector store for later queries")
  Component(search, "Semantic search handler", "similaritySearch + keyword fallback", "Finds the most relevant chunks for a query")
  Component(prompt, "LLM prompt builder", "Context assembly", "Builds the final prompt from retrieved chunks")
  Component(fallback, "Fallback matcher", "Keyword scoring", "Used when Chroma is unavailable")
}

System_Ext(hf, "HuggingFace Inference", "Embeddings model")
System_Ext(chroma, "Chroma DB", "Vector store")
System_Ext(ai, "LLM Provider", "Final response generation")

Rel(upload, hf, "Embeddings for PDF chunks")
Rel(upload, chroma, "Stores document vectors")
Rel(loader, chroma, "Reopens existing vector collection")
Rel(search, chroma, "similaritySearch(query, k)")
Rel(search, fallback, "Uses when vector store is missing")
Rel(search, prompt, "Passes top matching chunks")
Rel(prompt, ai, "Sends context + query")
```

## Level 4 - Code View

```mermaid
flowchart LR
  A[PdfAssistant.jsx] -->|POST /smart-search| B[pdfRoutes.js]
  B --> C{vectorStore exists?}
  C -->|Yes| D[Chroma.similaritySearch(query, 5)]
  C -->|No| E[keyword scoring fallback]
  D --> F[Top matching chunks]
  E --> F
  F --> G[Build prompt]
  G --> H[LLM response]
  H --> I[Search results shown in UI]
```

## How the semantic research works

1. The user enters a question or concept in the PDF assistant UI.
2. The client sends the request to the server route.
3. The server loads the PDF data and tries semantic retrieval first.
4. If the vector store is ready, Chroma compares the meaning of the query against stored chunks.
5. If Chroma is unavailable, the code falls back to keyword scoring so the feature still works.
6. The retrieved chunks are sent to the LLM, which produces the final answer or search result.

## Why this is a semantic feature

The search is not based only on exact word matching. It uses embeddings to map text into vectors so the system can retrieve passages that are conceptually close to the user's query, even when the wording is different.
