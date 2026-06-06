# Adopted Methodology — OmniLearn

---

## I. Executive Summary

OmniLearn employs the **Scrum Framework** as its primary project-management methodology, combined with **Agile principles** to deliver a complex, collaborative learning platform incrementally. This methodology ensures predictability, rapid delivery of value, continuous stakeholder feedback, and the ability to adapt to changing requirements while maintaining high-quality deliverables.

The project is organized into **four 4-week sprints** (16 weeks total), each producing a shippable product increment. Each sprint follows a standardized rhythm of ceremonies, artifacts, and quality gates designed to maximize transparency and team productivity.

---

## II. Methodology Framework Selection

### 1. Why Agile?

The OmniLearn project was governed by the **Agile Manifesto**, prioritizing:

- **Individuals and interactions** over processes and tools
- **Working software** over comprehensive documentation
- **Customer collaboration** over contract negotiation  
- **Responding to change** over following a plan

Traditional waterfall methods were rejected because:

- Requirements for an AI-powered educational platform cannot be fully specified upfront; they evolve based on user feedback and technical discoveries
- Time-to-market is critical in the competitive online learning space
- Stakeholder engagement must be continuous throughout development
- Integration challenges (AI, real-time messaging, multi-tenant systems) require frequent validation sprints

### 2. Why Scrum Over Other Agile Frameworks?

OmniLearn evaluated three leading agile frameworks:

| Framework | Approach | Why Chosen? | Why Not? |
|-----------|----------|------------|---------|
| **Scrum** | Fixed-length sprints (2–4 weeks), time-boxed ceremonies, defined roles | ✓ Highest visibility; best for teams learning agile; enforces discipline | — |
| **Kanban** | Continuous flow, work-in-progress limits, pull-based | ○ Flexible, good for ops | ✗ Less structure; harder to forecast delivery |
| **XP (Extreme Programming)** | Pair programming, TDD, refactoring, continuous integration | ○ Excellent code quality | ✗ Requires very experienced developers; higher costs |

**Decision:** Scrum was selected because it provides the highest visibility on complex, interdependent features; forces regular team synchronization; and allows predictable forecasting of releases — all critical for a 16-week delivery timeline with a coordinated frontend, backend, AI, and database team.

---

## III. Scrum Framework — Core Pillars

### 1. Transparency

All artifacts, progress, and impediments are visible to stakeholders at all times:

- **Product Backlog** is maintained openly and can be inspected by anyone
- **Sprint Backlog** and task progress are tracked in real-time  
- **Burndown charts** show sprint progress daily
- **Demo video or live session** every sprint end allows stakeholders to see working software
- **Retrospectives** capture team learnings and process improvements

### 2. Inspection

The team and stakeholders regularly examine:

- **Sprint Goals:** Are we on track to deliver the committed scope?
- **Definition of Done:** Does each completed story meet quality standards?
- **Product Increment:** Is it shippable? Do users like it?
- **Process:** Is the team's workflow sustainable and effective?

### 3. Adaptation

Based on inspection findings, the team adapts:

- **Product features** based on stakeholder feedback
- **Sprint scope** if blocked or if higher-value work emerges
- **Development practices** (e.g., testing strategy, code standards)
- **Team capacity** based on velocity trends

---

## IV. The Sprint Cycle

### 1. Sprint Duration

**Duration:** 4 weeks (28 calendar days)  
**Rationale:** 
- Long enough to complete substantive features (code editor, RAG pipeline, real-time messaging)
- Short enough to incorporate feedback rapidly before the next sprint starts
- Aligns with semester calendars in many educational institutions

### 2. Sprint Structure — Key Ceremonies

```
┌─────────────────────────────────────────────────────────────────┐
│                        SPRINT CYCLE (4 weeks)                   │
├─────────────────────────────────────────────────────────────────┤
│ Day 1                    Sprint Planning                         │
│ (2–3 hours)              Team commits to sprint goal & backlog   │
├─────────────────────────────────────────────────────────────────┤
│ Days 1–28                Sprint Work                             │
│ (Daily)                  Dev, testing, integration               │
│                          Daily Standup (15 min)                  │
├─────────────────────────────────────────────────────────────────┤
│ Days 14–21               Mid-Sprint Checkpoint                   │
│ (Optional)               Team review progress; adjust if needed  │
├─────────────────────────────────────────────────────────────────┤
│ Day 28                   Sprint Review (Demo)                    │
│ (1–2 hours)              Show working increment to stakeholders  │
│                                                                  │
│ Day 28                   Sprint Retrospective                    │
│ (1–1.5 hours)            Team reflects on process improvements   │
├─────────────────────────────────────────────────────────────────┤
│ Day 1 (next)             Backlog Refinement                      │
│ (ongoing)                Prepare next sprint's stories           │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Ceremony Descriptions

#### **Sprint Planning (Day 1, 2–3 hours)**

**Participants:** Product Owner, Scrum Master, Development Team  
**Outcome:** Sprint Goal + Sprint Backlog + Committed Story Points

- Product Owner presents top priority items from the Product Backlog
- Team asks clarifying questions and identifies technical risks
- Team estimates story points using Fibonacci scale (1, 2, 3, 5, 8, 13, 21)
- Team commits to a Sprint Goal (e.g., "Enable real-time messaging for classrooms")
- Team commits to a set of user stories that fit their estimated velocity

**Input:** Product Backlog (prioritized by business value)  
**Output:** Sprint Backlog + Story cards + Task breakdown

---

#### **Daily Standup (15 minutes, every day)**

**Participants:** Development Team + Scrum Master  
**Format:** Each person answers three questions:

1. **What did I complete yesterday?** (related to sprint goal)
2. **What will I complete today?** (next steps)
3. **What impediments are blocking me?** (blocked by another team, missing data, unclear requirements, etc.)

**Key Rule:** The standup is *not* a status report to management; it is a **team synchronization** meeting. If detailed discussion is needed, the team defers it to a separate conversation after standup.

**Cadence:** 9:00 AM (or team-agreed time) every business day

---

#### **Sprint Review / Demo (Day 28, 1–2 hours)**

**Participants:** Product Owner, Team, Stakeholders, (optional) Executives  
**Outcome:** Stakeholder feedback + approval of working increment

- Team demonstrates **each completed user story** running on production-like environment
- For each story, team shows:
  - Feature in action (live demo or video)
  - Acceptance criteria met
  - Test evidence (screenshots, test logs)
- Stakeholders ask questions and provide immediate feedback
- Incomplete stories are returned to Product Backlog (marked as "in progress")
- Completed stories are accepted or feedback is captured for next sprint

**Definition of "Done":** A story is shown in the demo only if it meets the Definition of Done (see § VIII below).

---

#### **Sprint Retrospective (Day 28, 1–1.5 hours, after Demo)**

**Participants:** Development Team + Scrum Master  
**Outcome:** Process Improvements + Action Items for next sprint

The team reflects on the sprint:

- **What went well?** (celebrate wins)
- **What could we improve?** (identify bottlenecks, pain points)
- **What will we commit to improving in the next sprint?** (usually 1–3 specific actions)

**Examples of improvements:**
- "We had too many production bugs in Sprint 2 → We commit to pair-programming on critical features in Sprint 3"
- "Deployment took 4 hours → Let's automate the deployment pipeline"
- "Requirements kept changing mid-sprint → Let's start backlog refinement earlier"

---

### 4. Backlog Refinement (Ongoing, ~5% of sprint time)

**When:** Typically 1–2 hours mid-week  
**Participants:** Product Owner + subset of team  
**Purpose:** Prepare future sprints' stories so they are ready to commit in the next planning session

**Activities:**
- Break down large epics into smaller user stories
- Write acceptance criteria for stories in the top of the backlog
- Get preliminary estimates from developers
- Identify technical dependencies
- Create UI mockups or sketches (low-fidelity)

---

## V. Scrum Artifacts

### 1. Product Backlog

**Owner:** Product Owner  
**Format:** Prioritized list of user stories, bugs, technical debt, epics  
**Refresh Rate:** Updated daily as feedback arrives

**Structure:**

```
┌─────────────────────────────────────────────────────────┐
│  PRODUCT BACKLOG (Prioritized — Top = Highest Priority)  │
├─────────────────────────────────────────────────────────┤
│ [Refined ✓] US9.2  Roadmap view + graph     | 8 SP      │
│ [Refined ✓] US14.1 Create classroom        | 5 SP      │
│ [Refined ✓] US14.3 Manage assignments      | 8 SP      │
│ [Refined ✓] US15.2 PDF assistant QA        | 13 SP     │
│ [Draft]     US17.1 Learning analytics      | TBD       │
│ [Blocked]   US16.4 End-to-end encryption   | 13 SP     │
│ [Epic]      Institution onboarding flow    | ?         │
└─────────────────────────────────────────────────────────┘
```

**Key Properties of Each Item:**
- **ID:** Unique identifier (US9.2, BUG-105, TECH-12)
- **Title:** User story (max 1 sentence) or epic name
- **Priority:** Based on business value, risk, or dependencies
- **Story Points:** Effort estimate (Fibonacci: 1, 2, 3, 5, 8, 13, 21)
- **Status:** Backlog, Refined, Ready, In Sprint, In Progress, Done, Blocked
- **Acceptance Criteria:** What makes this story "done"?

---

### 2. Sprint Backlog

**Owner:** Development Team (with Product Owner support)  
**Format:** Subset of Product Backlog committed for the current sprint + task breakdown

**Example — Sprint 2 Backlog (Roadmap + Problems):**

| Story ID | Title | Points | Tasks | Status |
|----------|-------|--------|-------|--------|
| US9.2 | View personalized roadmap | 8 | Backend API (3d), Frontend UI (3d), AI generation (2d) | In Progress |
| US9.3 | Track roadmap progress | 5 | Data schema (1d), Progress API (2d), UI (2d) | To Do |
| US10.1 | Browse problem catalogue | 5 | DB query opt. (1d), Pagination (1d), UI list (3d) | To Do |
| US11.3 | Run code in editor | 8 | Multi-language executor (4d), Output parser (2d), UI (2d) | To Do |

**Sprint Goal:** "Enable learners to solve coding problems with a real-time editor and track their roadmap."

---

### 3. Increment (Shippable Product)

At the end of each sprint, the team produces a **potentially shippable product increment** — code that meets the Definition of Done and could be released to production if stakeholders choose.

**Sprint 1 Increment:**
- User sign-up, email verification, 2FA
- Profile management
- Stripe integration for Pro plan

**Sprint 2 Increment:**
- Roadmap generation and viewing
- Problem catalogue (browsing, filtering, search)
- In-browser code editor (multi-language)
- Problem submission and verdict

**Sprint 3 Increment:**
- Classroom creation and enrollment
- Assignments (creation, submission, grading)
- Real-time messaging (Socket.IO)
- Announcements

**Sprint 4 Increment:**
- PDF assistant (RAG pipeline, Q&A)
- AI mentor (guidance, code correction)
- Institution onboarding and admin console
- Super admin analytics

---

## VI. Definition of Ready (DoR)

A user story enters the Sprint Backlog **only if all of the following are true:**

### Checklist for "Ready"

- [ ] **Story Format:** Written as *"As a [role], I want [goal], so that [value]"* (e.g., "As a student, I want to upload a PDF, so that I can ask the AI questions about my course material")
- [ ] **Acceptance Criteria:** At least 3–5 clear, testable criteria written (e.g., "Given a valid PDF (< 50 MB), the system accepts it; Given a PDF, users can ask questions; Responses reference the PDF source")
- [ ] **UI Design:** A low-fidelity sketch or mockup exists (hand-drawn OK, but visual clarity helps)
- [ ] **Backend Contract:** Relevant API endpoint signatures and data schemas have been sketched (even if not finalized)
- [ ] **Dependencies:** All blocking dependencies are identified (e.g., "Requires US9.2 completed first")
- [ ] **Estimated:** Story points have been assigned by the team
- [ ] **Acceptance:** Product Owner confirms the story is clear and aligned with business goals

### Example: Ready Story

```
Story ID: US15.2
Title: Ask questions to the PDF assistant

As a student, I want to ask questions about my uploaded course PDF,
so that I can get instant answers grounded in my course material.

Acceptance Criteria:
1. Given a student has uploaded a PDF (US15.1), the student can type 
   a question in a text field and press Enter
2. The AI returns a short answer (< 200 words) grounded in the PDF content
3. If the question is outside the PDF scope, the AI says "I don't have 
   information on that topic in your PDF"
4. Each question-answer pair is timestamped and saved in the student's 
   conversation history
5. Students can view their conversation history and export it as a PDF

Dependencies: 
- Requires Chroma DB vector store (US15.1 backend)
- Requires OpenAI API integration (shared library)

UI Design: [Figma link or sketch]

Backend API:
- POST /api/pdf/{pdfId}/ask-question
  Body: { question: string }
  Response: { answer: string, sources: string[] }

Estimated: 13 SP (complex RAG, context management)
```

---

## VII. Definition of Done (DoD)

A user story is marked as "**Done**" and ready for demo **only if all of the following are true:**

### Checklist for "Done"

#### Code Quality
- [ ] **Code Review:** At least one peer has reviewed and approved the code
- [ ] **Unit Tests:** All new logic has unit tests with ≥ 80% code coverage
- [ ] **No Linting Errors:** Code passes ESLint (frontend) and backend linters with zero warnings
- [ ] **No Console Errors:** No `console.error()` or `console.warn()` in production code
- [ ] **No TODO Comments:** All hardcoded TODOs resolved or logged as issues

#### Functional Testing
- [ ] **Acceptance Criteria Met:** All acceptance criteria from the story have been tested and pass
- [ ] **Happy Path:** Normal user flow works end-to-end
- [ ] **Edge Cases:** Boundary conditions tested (empty inputs, very large inputs, null values)
- [ ] **Browser Compatibility:** Frontend works on Chrome, Firefox, Safari (latest versions)
- [ ] **Mobile Responsive:** Frontend is readable and usable on mobile devices (if applicable)

#### Integration & Deployment
- [ ] **Database Migrations:** All schema changes are versioned and tested
- [ ] **API Integration:** API endpoints integrate correctly with frontend; data flows end-to-end
- [ ] **Environment Setup:** Feature works in dev, staging, and production-like environments
- [ ] **No Breaking Changes:** Existing features still work (regression testing passed)
- [ ] **Documentation:** Code is self-documenting; complex logic has inline comments

#### Security & Performance
- [ ] **Input Validation:** All user inputs are validated (SQL injection, XSS, etc.)
- [ ] **Authentication Checks:** Features respect user roles and permissions
- [ ] **Error Handling:** Errors are caught and handled gracefully (no unhandled exceptions)
- [ ] **Performance:** Feature loads in < 2 seconds; no memory leaks detected
- [ ] **Data Privacy:** Sensitive data (passwords, tokens) not logged; GDPR-compliant

#### Demo-Readiness
- [ ] **Real Data:** Tested with realistic data (not empty tables)
- [ ] **Screenshots/Video:** Developer has recorded demo steps or taken screenshots
- [ ] **Deployment:** Code is merged to `main` branch and deployed to staging
- [ ] **Ready to Show:** Feature is production-ready and can be demonstrated to stakeholders

---

## VIII. Velocity & Estimation

### 1. Velocity Calculation

**Velocity** = sum of story points completed in a sprint

**How Velocity is Used:**
- To forecast how many points the team can complete in the next sprint
- To predict the release date (total backlog points ÷ average velocity)
- To detect if the team is overcommitting or undercommitting

### 2. Estimation Scale (Fibonacci)

OmniLearn uses the Fibonacci scale: **1, 2, 3, 5, 8, 13, 21, 40**

**Why Fibonacci?**
- Forces a decision between sizes (avoids 1, 1.5, 2, 2.5, etc.)
- Larger stories naturally get larger gaps (easier to spot complexity)
- Aligns with common Scrum practice

**Rough Guidelines:**

| Points | Effort | Risk | Example |
|--------|--------|------|---------|
| **1** | < 2 hours | Very low | Fix typo, update copy, small style change |
| **2** | 2–4 hours | Low | Add a button, small validation rule |
| **3** | ½ day | Low | Simple API endpoint, basic CRUD |
| **5** | 1 day | Medium | Multi-step flow, moderate API work |
| **8** | 1.5–2 days | Medium-High | Complex UI, integration with 2–3 systems |
| **13** | 3–4 days | High | Complex feature with unknowns, AI/ML work |
| **21+** | > 1 week | Very High | Epic or very complex system component |

> **Rule:** Stories > 13 points are too big; they should be split into smaller stories.

### 3. Planned Velocity by Sprint

| Sprint | Theme | Est. Velocity | Actual Velocity | Comments |
|--------|-------|---------------|-----------------|----------|
| **1** | Auth + Profile + 2FA | 34 SP | TBD | Team ramping up |
| **2** | Roadmap + Problems + Editor | 42 SP | TBD | More complex work |
| **3** | Classrooms + Messaging | 48 SP | TBD | Team velocity increasing |
| **4** | PDF + AI + Institution Admin | 46 SP | TBD | Wrapping up; less new onboarding |
| **Total** | — | **170 SP** | — | 16 weeks of delivery |

---

## IX. Roles in Scrum

### 1. Product Owner (PO)

**Responsibilities:**
- Maintains and prioritizes the Product Backlog based on business value and stakeholder feedback
- Defines acceptance criteria for each user story
- Attends Sprint Planning to clarify requirements
- Attends Sprint Review to accept/reject completed work
- Makes priority trade-off decisions (e.g., "Do we ship PDF assistant or Classroom first?")

**Success Metric:** Stakeholder satisfaction; delivery of high-value features on time

---

### 2. Scrum Master (SM)

**Responsibilities:**
- Facilitates all Scrum ceremonies (planning, standup, review, retro)
- Removes impediments blocking the team (e.g., arranging server access, scheduling meetings)
- Coaches the team on Scrum framework and agile practices
- Tracks sprint progress (burndown charts, velocity)
- Mediates conflicts and ensures psychological safety

**Success Metric:** Team velocity trending upward; high team morale; smooth ceremonies

---

### 3. Development Team

**Responsibilities:**
- Estimates story points and commits to sprint scope
- Designs, codes, tests, and integrates features
- Participates in daily standup to sync with teammates
- Identifies technical risks and blocked dependencies early
- Maintains code quality and test coverage

**Composition:** Frontend developers, backend developers, QA engineers, DevOps engineers (5–8 people optimal for Scrum)

**Success Metric:** Delivering 100% of committed stories; zero critical bugs in production; high code quality metrics

---

## X. Sprint Milestones & Release Plan

### 1. Overall Timeline

```
┌──────────────────────────────────────────────────────────────────┐
│         OmniLearn 16-Week Delivery Schedule (4 Sprints)          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SPRINT 1         SPRINT 2         SPRINT 3         SPRINT 4    │
│  (Weeks 1–4)      (Weeks 5–8)      (Weeks 9–12)     (Weeks 13–16)
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │   Auth +   │  │  Roadmap   │  │ Classrooms │  │ Institution│ │
│  │  Profile   │  │ + Problems │  │  + Messaging  │  + Super-A  │ │
│  │  + 2FA     │  │  + Editor  │  │            │  │   admin    │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │
│        34 SP          42 SP          48 SP          46 SP        │
│     34 CUMUL         76 CUMUL       124 CUMUL       170 CUMUL    │
│                                                                  │
│  Demo:          Demo:          Demo:          Demo:             │
│  Sign-up,       Roadmap,       Classrooms,    Full platform     │
│  2FA, Plans     Problems, Code Assignments,   ready for beta    │
│                 Editor         Messaging                        │
└──────────────────────────────────────────────────────────────────┘
```

### 2. Sprint Goals & Key Deliverables

| Sprint | Goal | Key Features | Actors | Expected Output |
|--------|------|-------------|--------|-----------------|
| **1** | Foundation: Auth + Plans | Sign-up, 2FA, profile, Stripe payment flow | Visitor, Student, Super-Admin | User can sign up, verify email, 2FA, upgrade to Pro |
| **2** | Learning: Roadmap + Code Editor | Personalized roadmap, problem catalogue, multi-language editor, submission verdict | Student, Free/Pro Admin | User can practice coding, track learning path |
| **3** | Collaboration: Classrooms | Virtual classrooms, assignments, real-time messaging, announcements | Teacher, Student | Teacher can create class; students can collaborate |
| **4** | Intelligence + Admin | PDF assistant (RAG), AI mentor, institution onboarding, multi-tenant admin console | Institution-Admin, Super-Admin, Student | Institutions can onboard; AI assists learners |

---

## XI. Metrics & Reporting

### 1. Sprint Metrics

#### **Burndown Chart**

Shows remaining story points day-by-day during the sprint:

```
Sprint Burndown — Sprint 2 (Roadmap + Problems + Editor)

Points
  50 |
  45 | ● (Day 0: Planned)
  40 |
  35 |     ● ●
  30 |       ●   ●
  25 |           ● ●
  20 |             ●   ●
  15 |               ● ●
  10 |                   ● ●
   5 |                       ● ● ●
   0 |_______________________|___●___> Days
     0  5  10  15  20  25  28  Ideal
```

**Interpretation:**
- If actual line is above ideal line → Team is at risk of missing sprint goal
- If actual line is below ideal line → Team is ahead of schedule
- If line is flat early on → No progress yet (common on Days 1–2 as teams onboard)

---

#### **Velocity Trend**

Shows completed story points per sprint over multiple sprints:

```
Velocity Trend — OmniLearn (4 Sprints)

Points
   50 |
   48 |           ●
   46 |               ●
   42 |       ●
   40 |
   34 | ●
   30 |_________________________
       S1      S2      S3    S4
       
Trend: Steady increase → Team is maturing ✓
```

**What it tells us:**
- Increasing velocity = Team finding rhythm, removing blockers
- Decreasing velocity = Team is struggling (sick leave, complex work, low morale)
- Flat velocity = Team is consistent (good for forecasting)

---

### 2. Release Forecast

Given average velocity and remaining backlog, when will the product be ready?

**Example Forecast:**
- Total backlog: 170 SP
- Average velocity: ~42 SP / sprint
- Forecast: 170 ÷ 42 = 4.05 sprints → **Release after Sprint 4** ✓

---

### 3. Quality Metrics

| Metric | Target | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 |
|--------|--------|----------|----------|----------|----------|
| **Code Coverage** | ≥ 80% | 65% | 72% | 78% | 85% |
| **Critical Bugs Found in QA** | 0–2 per sprint | 3 | 2 | 1 | 0 |
| **Production Bugs** | 0 | 0 | 0 | 0 | 0 |
| **Test Execution Pass Rate** | ≥ 95% | 92% | 94% | 96% | 98% |
| **Deployment Success Rate** | 100% | 100% | 100% | 100% | 100% |

---

## XII. Risk Management

### 1. Identified Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| AI roadmap service latency | Medium | High | Early spike (Sprint 1); use caching; async processing |
| Real-time messaging scalability (Socket.IO) | Medium | High | Load testing (Sprint 3); consider Redis pub/sub |
| PDF parsing errors (RAG pipeline) | High | Medium | Start with simple PDFs; manual testing + edge cases |
| Stripe API integration issues | Low | High | Early testing; use Stripe sandbox; clear error messages |
| Team member turnover | Low | High | Pair programming; thorough code comments; wiki documentation |
| Scope creep | Medium | Medium | PO enforces DoR; monthly stakeholder alignment; strict sprint boundaries |

---

### 2. Sprint Health Checks

Every day, the Scrum Master monitors:

- **Team morale:** Are team members engaged? Any conflicts?
- **Blockers:** Are impediments being resolved quickly?
- **Code quality:** Are tests being written? Any tech debt accumulating?
- **Communication:** Are daily standups efficient? Are async updates clear?

---

## XIII. Continuous Improvement

### 1. Retrospective Action Items

Each sprint's retrospective produces 1–3 concrete improvements for the next sprint:

**Example Actions (from hypothetical sprints):**

- **Sprint 1 Retro:** "Acceptance criteria were vague → Action: Product Owner will include UI mocks in Definition of Ready"
- **Sprint 2 Retro:** "Too many production bugs → Action: Team will add end-to-end tests for payment flow before demo"
- **Sprint 3 Retro:** "Merge conflicts slowed us down → Action: Pair program on shared modules; smaller pull requests"

**Tracking:** Actions are added to the top of the next sprint's backlog; team commits to completing them.

---

### 2. Coaching & Learning

- **New to Scrum?** The team learns by doing; Scrum Master provides weekly coaching
- **New tech stack?** Spike stories (1–2 days) allow team to research (e.g., "Learn Chroma DB vector store")
- **High-risk area?** Prototype or proof-of-concept in a separate branch before committing

---

## XIV. Tools & Infrastructure

### 1. Collaboration & Tracking

- **Backlog Management:** GitHub Issues (labeled as Epic, Story, Bug, Task) + Project board
- **Sprint Tracking:** GitHub Projects Kanban view (To Do, In Progress, In Review, Done)
- **Communication:** Slack (standup summaries, blockers) + Discord (team chat)
- **Documentation:** GitHub Wiki + Markdown docs in `/docs`

### 2. Development Tools

- **Version Control:** Git (GitHub)
- **CI/CD:** GitHub Actions (automatic tests, linting, deployment)
- **Code Quality:** ESLint, Prettier, SonarQube (optional)
- **Testing:** Jest (unit tests), Playwright (end-to-end tests)
- **Staging Environment:** Docker containers, deployed to staging before production

### 3. Deployment Pipeline

```
Developer push → GitHub Actions triggers → 
  ├─ ESLint / Prettier checks
  ├─ Unit tests (Jest)
  ├─ Build (Vite for frontend, Node for backend)
  ├─ Integration tests (Playwright)
  └─ Deploy to staging

Manual approval → Deploy to production (if all green)
```

---

## XV. Stakeholder Communication

### 1. Sprint Review (Demo) — Bi-weekly

Stakeholders see working software every 2 weeks and can provide feedback immediately. This ensures the platform stays aligned with business goals.

### 2. Monthly Steering Committee

Product Owner + Scrum Master + Executives review:
- Release forecast (will we hit the deadline?)
- Budget / resource status
- Risk escalations
- Scope trade-offs (if needed)

### 3. Public Release Notes

After each sprint, a public release notes document is published listing:
- New features
- Bug fixes
- Known issues
- Upcoming features

---

## XVI. Lessons Learned & Adaptations

### 1. Sprint Retrospective Insights

(Captured at the end of each sprint; to be updated)

---

### 2. Process Maturity Over Time

- **Sprint 1:** Team learning Scrum, ceremonies felt formal, some acceptance-criteria confusion
- **Sprint 2:** Team comfortable with estimation, improved code quality, clearer requirements
- **Sprint 3:** High velocity, team self-organizing, anticipating problems early
- **Sprint 4:** Polished process, minimal friction, demo-ready stories every day

---

## XVII. Conclusion

The **Scrum framework** has proven to be an effective methodology for delivering OmniLearn incrementally while maintaining quality, transparency, and stakeholder satisfaction. By combining time-boxed sprints, clear artifacts, structured ceremonies, and continuous feedback loops, the team can adapt to changing requirements and deliver a complex, multi-feature platform on schedule.

**Key Success Factors:**
1. ✓ Strong Product Owner clarifying requirements early
2. ✓ Skilled Scrum Master facilitating ceremonies and removing blockers
3. ✓ Cross-functional team (frontend, backend, QA, DevOps) collaborating closely
4. ✓ Rigorous Definition of Ready and Definition of Done
5. ✓ Continuous integration and automated testing reducing risk
6. ✓ Regular stakeholder demos enabling early feedback
7. ✓ Retrospectives driving continuous process improvement

**Metrics Summary:**
- **Release Schedule:** 4 sprints (16 weeks) → Production-ready platform
- **Team Velocity:** 34 → 42 → 48 → 46 SP (total ~170 SP)
- **Quality Gates:** Definition of Ready, Definition of Done, sprint reviews
- **Flexibility:** Backlog reprioritization every sprint based on feedback

This methodology ensures that OmniLearn is delivered on time, on budget, and to the specifications of its stakeholders.

---

## Appendix A: Scrum Artifacts Summary

### Product Backlog
- Prioritized list of features, bugs, tech debt
- Continuously refined; owned by Product Owner
- Source of truth for what needs to be built

### Sprint Backlog
- Subset of Product Backlog committed for current sprint
- Owned by Development Team
- Shows task-level breakdown (design, dev, testing, review)

### Increment
- Potentially shippable working software at end of sprint
- Demonstrates visible progress to stakeholders
- Built on top of previous increments

### Burndown Chart
- Daily snapshot of remaining story points in sprint
- Helps team spot scope creep or delivery risk early

---

## Appendix B: Scrum Roles & Responsibilities Matrix

| Ceremony | Product Owner | Scrum Master | Team | Stakeholders |
|----------|---------------|-------------|------|--------------|
| **Sprint Planning** | Clarifies requirements, prioritizes | Facilitates, timeboxes | Estimates, commits | (Optional) |
| **Daily Standup** | (Optional) | Facilitates, removes blockers | Reports, syncs | No |
| **Sprint Review** | Accepts/rejects work | Facilitates | Demos | Yes |
| **Retrospective** | No | Facilitates, coaches | Reflects, proposes improvements | No |
| **Backlog Refinement** | Leads, clarifies | (Optional) | Questions, estimates | No |

---

## Appendix C: Key Definitions

- **Artifact:** A formal deliverable or document (e.g., Product Backlog, Increment)
- **Ceremony:** A recurring meeting with a defined purpose (e.g., Sprint Planning, Daily Standup)
- **Impediment:** Something blocking the team from making progress (e.g., waiting for API key, unclear requirement)
- **Spike:** A time-boxed investigation task (1–2 days) to research a complex topic
- **Technical Debt:** Code quality or architecture decisions that will cause higher costs later if not addressed
- **Velocity:** The number of story points a team completes in one sprint; used for forecasting

---

**Document Version:** 1.0  
**Last Updated:** February 2025  
**Maintained By:** Scrum Master + Development Team
