# OmniLearn Platform Architecture - C4 Model

This document outlines the architecture of the OmniLearn platform using the **C4 model** (Context, Container, and Component levels) to provide a clear, hierarchical view of the system's technical design.

## Level 1: System Context Diagram

The System Context diagram provides a high-level view of the OmniLearn platform and how it interacts with external users and third-party systems.

```mermaid
C4Context
    title System Context diagram for OmniLearn Platform
    
    Person(student, "Student", "A user who consumes content, executes code, works on UMLs, and interacts with the AI tutor.")
    Person(instructor, "Instructor/Admin", "A user who creates classrooms, handles institution plans, uploads PDFs, and manages students.")
    
    System(omnilearn, "OmniLearn Platform", "Provides interactive learning, code execution, real-time collaboration, and AI-powered RAG assistance.")
    
    System_Ext(llm, "LLM Providers", "OpenAI / Groq used for RAG, AI chat, and content generation.")
    System_Ext(cloudinary, "Cloudinary", "Cloud storage for uploaded assets, PDFs, and images.")
    System_Ext(stripe, "Stripe", "Payment gateway for application subscriptions and tiers.")
    System_Ext(email, "Email Service", "Service (Nodemailer) for notifications and auth reset emails.")
    System_Ext(stream, "Stream Video", "Third-party service for live video sessions and WebRTC communications.")

    Rel(student, omnilearn, "Learns, codes, and collaborates using")
    Rel(instructor, omnilearn, "Manages classrooms and creates course content using")
    
    Rel(omnilearn, llm, "Fetches generated responses and vector embeddings from")
    Rel(omnilearn, cloudinary, "Uploads and retrieves media from")
    Rel(omnilearn, stripe, "Processes payments via")
    Rel(omnilearn, email, "Sends emails using")
    Rel(omnilearn, stream, "Initializes live sessions via")
```

## Level 2: Container Diagram

The Container diagram illustrates the high-level technical architecture, showing the major applications and data stores that make up OmniLearn.

```mermaid
C4Container
    title Container diagram for OmniLearn Platform
    
    Person(user, "User", "Student or Instructor")
    
    System_Boundary(c1, "OmniLearn Platform") {
        Container(spa, "Single Page Application", "React, Vite, Tailwind CSS", "Provides the frontend UI (Dashboard, Classroom context, Code Editor, UML Tool, Video streams).")
        Container(api, "API Server", "Node.js, Express", "Core backend handling HTTP APIs, business logic, RAG pipelines, and DB ORM.")
        Container(realtime, "Realtime Server", "Socket.io", "Handles live messaging, collaboration events, and real-time session states.")
        ContainerDb(db, "Relational Database", "PostgreSQL (Sequelize)", "Stores user profiles, classrooms, assignments, plans, and system state.")
        ContainerDb(vectordb, "Vector Database", "ChromaDB", "Stores document embeddings and chunked texts for the AI RAG features.")
    }
    
    System_Ext(llm, "LLM APIs (OpenAI/Groq)")
    System_Ext(cloudinary, "Cloudinary")
    System_Ext(stripe, "Stripe API")

    Rel(user, spa, "Visits and interacts with", "HTTPS/WSS")
    Rel(spa, api, "Makes API calls to", "JSON/HTTPS")
    Rel(spa, realtime, "Connects to for live events", "WebSockets")
    
    Rel(api, db, "Reads from and writes back to", "Sequelize/SQL")
    Rel(api, vectordb, "Reads from and writes to", "ChromaDB API")
    Rel(api, llm, "Generates prompts & embeddings", "REST/HTTPS")
    Rel(api, stripe, "Creates checkouts & listens to webhooks", "REST/HTTPS")
    Rel(api, cloudinary, "Uploads and transforms attachments", "REST/HTTPS")
    Rel(realtime, db, "Validates sessions and users", "Sequelize")
```

## Level 3: Component Diagram (Backend API)

The Component diagram dives into the Node.js Backend API Application to show how the system is structured internally.

```mermaid
C4Component
    title Component diagram for OmniLearn API Application
    
    Container(spa, "Single Page Application", "React", "Consumes API endpoints")
    
    Container_Boundary(api, "API Server / Realtime") {
        Component(router, "Express Routers", "Express.js", "Routes incoming requests to the appropriate context controllers")
        Component(auth_ctrl, "Auth & Users Controller", "Node.js", "Handles JWT login, registration, roles, and profiles")
        Component(class_ctrl, "Classroom Controller", "Node.js", "Handles classes, enrollments, pdf parsing, and roadmap logic")
        Component(code_ctrl, "Execution Controller", "Node.js", "Handles compiling requests and interpreting runtime outputs safely")
        Component(ai_service, "AI & RAG Service", "LangChain", "Manages document chunking, prompt chaining, and chat contexts")
        Component(payment_ctrl, "Payment Controller", "Stripe SDK", "Manages institutional plans, billing, and Stripe webhooks")
        Component(realtime_handler, "Realtime Event Handlers", "Socket.io", "Manages WebSocket events for live sync, messaging, and presence")
        
        Component(auth_middleware, "Auth Middleware", "Express/JWT", "Secures endpoints via JWT validation and RBAC validation")
    }
    
    ContainerDb(db, "PostgreSQL", "Relational Database")
    ContainerDb(vectordb, "ChromaDB", "Vector Store")
    System_Ext(llm, "LLMs")

    Rel(spa, router, "Makes HTTP requests to", "JSON/HTTPS")
    Rel(spa, realtime_handler, "WebSocket connections for live features", "WSS")
    
    Rel(router, auth_middleware, "Routes restricted actions through")
    Rel(auth_middleware, auth_ctrl, "Validates and routes to")
    Rel(auth_middleware, class_ctrl, "Validates and routes to")
    Rel(auth_middleware, code_ctrl, "Validates and routes to")
    Rel(auth_middleware, payment_ctrl, "Validates and routes to")
    Rel(router, ai_service, "Routes AI query generation to")
    
    Rel(auth_ctrl, db, "Reads/Writes user data")
    Rel(class_ctrl, db, "Reads/Writes classroom and module data")
    Rel(payment_ctrl, db, "Updates user subscriptions")
    
    Rel(ai_service, vectordb, "Queries similarity & saves vectors")
    Rel(ai_service, llm, "Performs chat inference and embeddings")
```
