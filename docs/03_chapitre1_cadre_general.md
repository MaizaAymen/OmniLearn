# Chapter 1 — General Framework of the Project

## I. Introduction

In this chapter, we present an overall view of the project. We start by introducing the host organization, then move to a detailed description of the project itself — its context, an analysis of existing solutions, the problems they leave open, and the solution we propose. We close the chapter with the methodology and modeling language chosen to drive the work.

## II. Presentation of the Host Organization

### 1. Company

**[Company name]** is a Tunisian software company specialized in the design of web and mobile solutions and the development of custom information systems. Founded in **[year]** and based in **[city / address]**, the company has built a reputation for the reliability of its delivery and the breadth of skills of its developers. With a team of **[N]** engineers, it offers high-quality digital products tailored to the specific needs of each client, with a strong focus on innovation and modern web technologies.

> *Figure 1: Company logo — to be inserted.*

### 2. Organizational Chart

The company is structured around two main departments: a **Development Department** (Web team, Mobile team, Backend / DevOps team) and a **Marketing & Communication Department** (Digital marketing, Communication, Sales). Both report to the General Management.

> *Figure 2: Company organizational chart — to be inserted.*

### 3. Activities of the Company

The company delivers a complete range of custom web development services, ranging from elegant showcase websites to complex, scalable platforms. With solid experience in mobile development, the team is also specialized in building applications for both iOS and Android. Thanks to its mastery of modern technologies (React, Node.js, PostgreSQL, AI / LLM integrations, Stripe, Cloud), it offers performant solutions adapted to each client, ensuring an optimal user experience and continuous scalability.

## III. Presentation of the Project

### 1. Project Scope

This project is part of the end-of-studies work required to obtain the **Applied Bachelor's degree in Information Systems Development** at the Higher Institute of Technological Studies. The goal is to design and implement a complete, ergonomic web platform — **OmniLearn** — to simplify online learning for students, teachers and entire educational institutions. OmniLearn unifies, in a single SaaS product, code practice, AI-assisted study, virtual classrooms, real-time collaboration and personalized roadmaps.

### 2. Existing Solutions Study

In this section we briefly review the main platforms currently used for online learning and computer-science practice, in order to identify their limits and motivate the design of OmniLearn.

#### 2.1. LeetCode

LeetCode is the de-facto reference for technical interview preparation and coding practice. It offers a very large catalogue of algorithmic problems, an online judge, contests and a premium tier. However, it is **strictly focused on competitive coding**: it does not provide classrooms, no UML modeling, no PDF-based AI tutor for course material, no real-time messaging between learners and no personalized roadmap built from the learner's own goals and curriculum.

> *Figure 3: LeetCode home page — to be inserted.*

#### 2.2. Google Classroom

Google Classroom is widely adopted by schools to distribute assignments, collect submissions and broadcast announcements. It integrates well with Google Workspace but is **a generic LMS**: it does not provide an in-browser code editor with multi-language execution, no UML tooling, no automated AI tutoring on course PDFs and no graded problem set with automatic evaluation.

> *Figure 4: Google Classroom home page — to be inserted.*

#### 2.3. Coursera / Udemy

Coursera and Udemy provide curated video courses with quizzes. They scale extremely well for content delivery but **lock the learner into pre-recorded paths**: they offer little space for the learner's own institution, no real classroom management for a local school or university, and no AI tutor grounded in the institution's own documents.

### 3. Problems Identified

Several major challenges remain unsolved by the existing platforms, which limits their effectiveness for a broad audience:

- **Tool fragmentation:** learners must juggle a coding judge, an LMS, a UML tool, a chat application, a video conferencing tool and a separate AI assistant. The cognitive cost is high.
- **No multi-tenant institution model:** existing platforms are either fully public (LeetCode) or fully tied to a single vendor's ecosystem (Google Classroom). Independent schools cannot offer their own branded learning environment.
- **No AI tutor grounded in the institution's own material:** generic AI tools (ChatGPT) hallucinate course content; specialized LMS tools rarely embed an AI assistant working on the school's own PDFs.
- **No personalized roadmap:** learners follow rigid pre-built tracks instead of a roadmap built from their goals, prior skills, languages and interests.

### 4. Proposed Solution

To address the issues identified above, we propose **OmniLearn** — a unified, multi-tenant web platform that brings together, in a single ergonomic interface:

- An in-browser **code editor** supporting multiple languages (JavaScript, Python, Java, PHP, etc.) with code execution and a results panel.
- A **problem set** with free-tier and pro-tier catalogues, automated submission evaluation, and a per-student personalized problem set built from the user's interests and roadmap.
- A **UML editor** with stored diagrams and an AI-assisted evaluation route.
- A **classroom system** with enrollment, modules, lessons, code submissions, assignments, announcements, grades and class-level analytics.
- A **PDF assistant** that ingests course PDFs into a vector store (Chroma DB) and answers questions with RAG, grounded in the institution's own material.
- A **real-time messaging system** (Socket.IO) with conversations, notifications and a live workspace.
- A **video meeting feature** based on Stream Video.
- A **personalized roadmap** generated by an AI roadmap service from the learner's career goal, interests and programming languages — saved per user and updatable over time.
- A **subscription model** with three plans (Free, Pro, Institution) managed through Stripe, plus an onboarding flow for institutions and invite-link based member enrollment.

The platform is designed to be flexible, customizable and accessible — and aims to improve the experience of all the actors involved (students, teachers, institution admins, super admins), while simplifying the management of educational activities end-to-end.

## IV. Methodology Adopted

The **Agile methodology** is a project-management approach that promotes collaborative work, predictability-based reactivity and rapid delivery of value to the client — in contrast with traditional methods that execute projects sequentially and rely on a single up-front plan covering the entire project.

## V. Agile Methodology

Instead of the long "tunnel effect" of waterfall, the Agile approach significantly reduces — or even completely eliminates — that effect, by giving more visibility, involving the client from start to finish and adopting an **iterative and incremental** process. Agile considers that requirements cannot be frozen, and proposes to adapt to changes — within a minimum set of rules.

### Table 1 — Comparison Between Agile Methods

| Agile method | Description | Advantages | Disadvantages |
|---|---|---|---|
| **XP (Extreme Programming)** | An agile method emphasizing rapid delivery of high-quality software through pair programming, TDD, refactoring and continuous integration. | Strong focus on code quality through automated tests; reinforced communication. | Can be hard to implement; requires a skilled and experienced team. |
| **Kanban** | An agile method focused on visualizing and optimizing the flow of work to reduce wait times and maximize team efficiency. | Clear visualization of the process via Kanban boards; flexibility to manage continuous flow. | Can be hard to apply; may not work well for distributed teams. |
| **Scrum Framework** | An agile framework emphasizing collaboration and iteration, using fixed-length sprints to deliver functionality. | Encourages communication and collaboration; flexibility; rapid delivery. | Requires a skilled, experienced team; requires rigorous project management. |

We selected the **Scrum** framework, which provides higher visibility on the project and allows changes to be integrated more rapidly.

## VI. SCRUM Workspace

**Scrum** is a framework for developing complex products, focused on collective effort to deliver products of high value, productive and creative — often called the agile manifesto in action.

### 1. The Pillars of SCRUM

- **Transparency:** facts are presented as they are to all stakeholders, who are therefore concerned directly or indirectly.
- **Inspection:** daily inspection enables rapid detection of any gap between the iteration's objective, the planned work and the daily reality.
- **Adaptation:** after identifying gaps and what can be improved, we seek continuous improvement. The team adapts based on inspection results.

### 2. The Roles of SCRUM

- **Product Owner:** aligns the Scrum team on the product's objectives, taking into account business needs and customer expectations.
- **Scrum Master:** guarantees the team's effectiveness by applying Scrum values, facilitating ceremonies and removing impediments.
- **Development Team:** members concretely realize the sprint's tasks, including the various professionals required to meet its objectives.

### 3. The Events of SCRUM

- **Sprint Planning:** defines what will be delivered and how, ensuring each member knows the goals.
- **Daily Scrum (Stand-up):** the 15-minute standing meeting used to track progress and detect impediments.
- **Sprint Review:** lets the team present completed work and gather feedback from stakeholders.
- **Sprint Retrospective:** evaluates the sprint to improve team dynamics, processes and tools.

> *Figure 5: The Scrum method — to be inserted.*

## VII. The Unified Modeling Language (UML)

UML is a standardized graphical language for modeling software development and object-oriented design. It is also used for industrial processes. UML offers 14 types of diagrams; we chose four of them to explain how our platform works:

- **Class diagram:** models the static structure of the system by defining its components.
- **Use-case diagram:** globally shows the actions an actor can perform within a software system.
- **Sequence diagram:** illustrates the chronological order of messages exchanged between objects, showing their collaboration over time.
- **Activity diagram:** represents the flow and steps of a process or activity within a system.

## VIII. Project Management with SCRUM

### Table 2 — Scrum Roles

| Scrum Role | Person Responsible |
|---|---|
| **Product Owner** | *[Company supervisor]* |
| **Scrum Master** | *[Academic supervisor]* |
| **Dev Team** | Aymen Maiza |

## IX. Identification of the System Actors

- **Super Admin:** oversees the whole platform — manages institutions, the global problem catalogue, free-tier and pro-tier flags, all users (ban/unban), and plan-level statistics.
- **Institution Admin:** manages a single institution — onboards it, invites teachers and students through invite links, defines the institution's curriculum (grades, specialities, levels), and monitors classroom activity inside the institution.
- **Teacher:** creates classes, courses, modules, lessons and assignments inside the institution; evaluates code submissions; broadcasts announcements; responds to messages from students.
- **Student:** joins classes; solves coding problems; submits code; works on assignments; chats in conversations; attends video meetings; uses the PDF assistant on course material; models with UML; follows a personalized roadmap.
- **Visitor:** browses the public landing page; signs up; verifies email; chooses a plan; eventually joins an institution via an invite link.

## X. Product Backlog

The product backlog — a central artifact of the Scrum methodology — gathers all functionalities expected from the product, expressed as user stories. Each user story is prioritized by the Product Owner to drive release planning and sprint scoping. The backlog therefore acts as a roadmap for development, ensuring an iterative and incremental delivery.

### Table 3 — Product Backlog

| PBI | Main Functionality | Priority |
|---|---|---|
| **Visitor side** | | |
| 1 | As a visitor, I want to browse the public landing page (Home). | High |
| 2 | As a visitor, I want to sign up on the platform and verify my email. | High |
| 3 | As a visitor, I want to choose a plan (Free / Pro / Institution) when signing up. | High |
| **Authenticated user (Student) side** | | |
| 4 | As a student, I want to sign in with my email and password to access my account. | High |
| 5 | As a student, I want to complete and manage my profile (avatar, bio, GitHub, LinkedIn). | High |
| 6 | As a student, I want to recover my password if I forget it. | Medium |
| 7 | As a student, I want to enable two-factor authentication (2FA) on my account. | Medium |
| 8 | As a student, I want to choose a career goal, interests and programming languages to receive a personalized roadmap. | High |
| 9 | As a student, I want to view and progress through my personalized roadmap. | High |
| 10 | As a student, I want to download a certificate when I complete the roadmap. | Medium |
| 11 | As a student, I want to browse the problem catalogue. | High |
| 12 | As a student, I want to solve a problem in the online code editor (multiple languages). | High |
| 13 | As a student, I want to submit my code and see the evaluation result. | High |
| 14 | As a student, I want to see my coding dashboard (progress, last submissions). | Medium |
| 15 | As a student, I want to draw UML diagrams in the in-browser UML editor. | High |
| 16 | As a student, I want to solve UML problems and get AI feedback on my diagram. | High |
| 17 | As a student, I want to join a classroom using a class code. | High |
| 18 | As a student, I want to view my enrolled classrooms, their assignments and announcements. | High |
| 19 | As a student, I want to upload a course PDF and ask questions to the AI assistant grounded in it. | High |
| 20 | As a student, I want to chat in real time with my classmates and teachers. | High |
| 21 | As a student, I want to start or join a video meeting from the platform. | Medium |
| 22 | As a student, I want to receive in-app notifications (new message, new assignment, new grade). | High |
| **Teacher side** | | |
| 23 | As a teacher, I want to sign in and access the teaching dashboard. | High |
| 24 | As a teacher, I want to create classes inside my institution. | High |
| 25 | As a teacher, I want to create courses, modules and lessons. | High |
| 26 | As a teacher, I want to create assignments linked to a module or class. | High |
| 27 | As a teacher, I want to assign problems to a class or to specific students. | High |
| 28 | As a teacher, I want to review code submissions and grade them. | High |
| 29 | As a teacher, I want to broadcast announcements to a class. | Medium |
| 30 | As a teacher, I want to upload lesson PDFs that students can use with the PDF assistant. | High |
| **Institution Admin side** | | |
| 31 | As an institution admin, I want to onboard my institution (name, logo, domain). | High |
| 32 | As an institution admin, I want to generate invite links to add teachers and students. | High |
| 33 | As an institution admin, I want to define my own grades, specialities and levels. | High |
| 34 | As an institution admin, I want to assign teachers to classes. | High |
| 35 | As an institution admin, I want to see the directory of members of my institution. | High |
| 36 | As an institution admin, I want to see usage statistics for my institution. | Medium |
| **Super Admin side** | | |
| 37 | As a super admin, I want to sign in to the super admin dashboard. | High |
| 38 | As a super admin, I want to manage all institutions on the platform. | High |
| 39 | As a super admin, I want to manage the global problem catalogue (CRUD). | High |
| 40 | As a super admin, I want to toggle a problem as Free-tier or Pro-tier. | High |
| 41 | As a super admin, I want to ban / unban any user. | High |
| 42 | As a super admin, I want to view global statistics (users by plan, institutions, submissions). | Medium |
| 43 | As a super admin, I want to manage UML problems. | Medium |
| **Cross-cutting** | | |
| 44 | As a Free user, I want to be limited to free-tier problems and basic messaging. | High |
| 45 | As a Free user, I want to be able to upgrade to Pro through Stripe checkout. | High |
| 46 | As a Pro user, I want full access to all problems, the AI tutor and the PDF assistant. | High |
| 47 | As an Institution member, I want my access to be scoped to my institution's resources. | High |

## XI. Conclusion

In this chapter we presented the project at a high level, described the host organization, surveyed existing solutions, motivated the design of OmniLearn, and introduced the Scrum methodology and UML modeling that drive the work. We also defined the actors and the product backlog. The next chapter dives into a detailed description of the product backlog (functional and non-functional requirements), the sprint planning and the technical environment.

---
