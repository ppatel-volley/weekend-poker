# AI Agent Guidelines

> **Template**: Reusable framework for configuring AI coding agents.
> Customize [`AGENTS-PROJECT.md`](./AGENTS-PROJECT.md) for your project and swap [`AGENTS-REACT-TS.md`](./AGENTS-REACT-TS.md) for your tech stack.
>
> Informed by ["Large Language Model Reasoning Failures"](https://arxiv.org/abs/2602.06176) (Song, Han, Goodman — ICML 2025).

**How to Use This Document:**
1. Sections 1–3 are **MANDATORY** — read before writing any code
2. Section 8 has behavioral guidelines to reduce common LLM coding mistakes
3. Check [`learnings/INDEX.md`](./learnings/INDEX.md) before starting work (if it exists)
4. See [`AGENTS-RLM.md`](./AGENTS-RLM.md) only when context exceeds ~100K tokens

---

## Project-Specific Configuration

Import project and language-specific guidelines as needed:

- [`AGENTS-PROJECT.md`](./AGENTS-PROJECT.md) — Project-specific commands, test locations, keyword triggers
- [`AGENTS-REACT-TS.md`](./AGENTS-REACT-TS.md) — React, TypeScript patterns
- [`AGENTS-THREEJS.md`](./AGENTS-THREEJS.md) — Three.js, shaders, React Three Fiber *(load only for 3D/WebGL tasks)*
<!-- Add language files as needed: AGENTS-CSHARP.md, AGENTS-CPP.md, AGENTS-PYTHON.md -->

---

## 1. MANDATORY Response Requirements

**EVERY response that involves code changes MUST end with a Verification Block.**

### Verification Block Template (REQUIRED)

```
---
**Verification**
- Learnings checked: [LIST or "None applicable - reason"]
- Tests: [PASSED/FAILED] ([X] tests)
- Types: [PASSED/NOT RUN]
- Build: [PASSED/NOT RUN]
- New tests added: [YES - describe / NO - justify]
- Confidence: [0.0-1.0] [brief reason if below 0.9]
```

### When to Include

| Situation | Required? |
|-----------|-----------|
| Any code edit (new or modified) | **YES** |
| Answering questions about code | No |
| Planning/discussing approaches | No |
| User explicitly asks to skip | No |

---

## 2. Complexity Triggers (MUST Check)

**Before starting ANY task:**
1. Check [`learnings/INDEX.md`](./learnings/INDEX.md) for relevant past mistakes (skip if not yet created)
2. Check project-specific keyword triggers in [`AGENTS-PROJECT.md`](./AGENTS-PROJECT.md) (if applicable)
3. Scan complexity triggers below

**If ANY trigger is TRUE, you MUST:**
- State which keyword/complexity trigger(s) apply
- State which learnings you checked and key takeaways
- Output a DECOMPOSE step showing sub-problems
- State key assumptions (mark verified/unverified)

### Complexity Triggers

| Trigger | Action | Example |
|---------|--------|---------|
| Changes touch 3+ files | Decompose | Refactoring, new feature across packages |
| Architectural decision required | Decompose | Add caching, implement auth |
| Request is ambiguous | Clarify | Missing details that change implementation |
| Multiple valid approaches exist | Decompose | Trade-offs between solutions |
| Uncertain about best approach | Decompose | Novel problem, unfamiliar domain |
| Task involves risk | Decompose | Data migration, breaking changes |

**If NO triggers apply:** Proceed directly, but still include the Verification Block.

### Clarification Gate

Ask when:
- A missing input would materially change the answer
- The risk of a wrong assumption is high
- The task depends on user preference (taste, policy, priority)

Don't ask when:
- It's an implementation detail the user doesn't care about (e.g., `forEach` vs `map`)
- The answer is in the codebase and you can look it up yourself
- You can make a safe, reversible choice and note the assumption

---

## 3. Testing Requirements

**MANDATORY: Run tests and add new tests when writing code.**

> See [`AGENTS-PROJECT.md`](./AGENTS-PROJECT.md) for project-specific test commands and locations.

### When to Add Tests

| Change | Required Test |
|--------|--------------|
| New reducer/function | Unit test |
| New thunk/endpoint | Integration test |
| New shared type/function | Unit test |
| Bug fix | Regression test that would have caught the bug |
| New feature | Both unit and integration tests |

### Test Philosophy

**Tests are the source of truth. Code must conform to tests, not vice versa.**

- **CRITICAL:** If a test fails, the code is wrong — fix the code, not the test
- **CRITICAL:** If a test expectation is genuinely incorrect, fix the test AND document why
- When in doubt, verify the math — especially for physics, geometry, calculations

---

## 4. Pre-Completion Checklist

**Before saying "done", verify ALL items:**

- [ ] Tests pass
- [ ] New tests added for new code (or justified why not)
- [ ] Type check passes (if applicable)
- [ ] Build succeeds
- [ ] Verification Block included in response
- [ ] Prove it works — never mark complete without demonstration
- [ ] Diff behavior between main and your changes (when relevant)
- [ ] No function exceeds ~50 lines, no file exceeds ~300 lines
- [ ] No debug artifacts left behind (console.log, debugger, commented-out code)
- [ ] Naming is self-documenting — no abbreviations that require explanation

If any item fails: fix it before completing, or explain why you cannot.

---

## 5. Confidence Calibration

Anchor confidence to **observable artifacts**, not gut feeling:

| Range | Observable Criteria | Action |
|-------|-------------------|--------|
| 0.9–1.0 | All tests pass, types check, behavior verified, no open questions | Proceed |
| 0.7–0.8 | Tests pass but edge cases unverified, or minor requirement ambiguity | Proceed, note gaps |
| 0.5–0.7 | Tests don't cover the change, or requirement is ambiguous | State assumptions, flag risk |
| Below 0.5 | Can't verify correctness, or requirement is unclear | **STOP** — ask for clarification |

### Recovery Path (confidence below 0.8)

1. Identify the weakest link — what specific artifact is missing or failing?
2. Try a different approach OR ask for the missing info
3. Max 4 retries; if still below 0.8, escalate to user

---

## 6. Meta-Cognitive Process (Complex Tasks)

When complexity triggers apply:

1. **DECOMPOSE** — Break into sub-problems, ordered by: dependencies → risk → value
2. **SOLVE** — Address each sub-problem with explicit confidence (0.0–1.0)
3. **VERIFY** — Cross-check with alternate method, boundary/edge-case analysis, consistency with constraints, run tests
4. **SYNTHESIZE** — Combine results. Final confidence ≈ min(sub-confidences) if any is critical.
5. **REFLECT** — If confidence below 0.8, identify weakness and retry (max 2 times)

### Output Template (complex tasks)

```
## Analysis

**Complexity Triggers**: [list which apply]

**Assumptions**:
- [assumption 1] (verified/unverified)

**Approach**:
1. [sub-problem 1] - confidence: X.X
2. [sub-problem 2] - confidence: X.X

**Risks/Caveats**:
- [risk 1]
```

---

## 7. Communication Style

- Be concise by default
- Use bullets for multi-part answers
- Call out assumptions, tradeoffs, and risks explicitly
- For simple questions, use inline confidence: "Yes (0.9)"
- Don't use filler phrases like "Great question!" or "Absolutely!"

---

## 8. Behavioral Guidelines (Reducing Common Mistakes)

> These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 8.1 Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 8.2 Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for scenarios that would require the language runtime itself to be broken. DO handle errors that can plausibly occur in production: network failures, invalid user input, null values from external APIs, missing DOM elements.
- If you write 200 lines and it could be 50, rewrite it.

### 8.3 Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- If existing code quality blocks your task (no types, tangled dependencies), do the **minimum** refactoring needed to complete your task cleanly. Document what you changed and why.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

**Test:** Every changed line should trace directly to the user's request.

### 8.4 Goal-Driven Execution

**Define success criteria. Loop until verified.**

| Request | Transform to |
|---------|-------------|
| "Add validation" | Write tests for invalid inputs, then make them pass |
| "Fix the bug" | Write a test that reproduces it, then make it pass |
| "Refactor X" | Ensure tests pass before and after |

Plan format:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

- Strong success criteria let you loop independently.
- Weak criteria ("make it work") require constant clarification.

### 8.5 Session & Context Hygiene

**Fresh context for fresh problems. Tight scope per request.**

- Start fresh conversations for new topics. Earlier context in long conversations degrades processing (proactive interference).
- Keep task scope tight — one logical change per request. (This applies to individual agent sessions. For larger tasks requiring multi-agent execution, see §9.)
- Trim context ruthlessly. Irrelevant files and background noise degrade reasoning quality.
- A focused 200-line excerpt beats a 5000-line file paste.

### 8.6 Problem Framing Awareness

**Before implementing a proposed solution, verify the problem itself is correct.**

- **Restate the requirement** in your own words before coding. If the user said "add a cache here", first ask: "Is caching the right solution for the actual problem?"
- **Separate problem from solution.** Evaluate constraints and goals independently before assessing a proposed approach. The first framing you see disproportionately shapes your reasoning (anchoring bias).
- **State relationships bidirectionally.** "Team A owns Service X" doesn't guarantee reliably answering "who owns Service X?" State important mappings from both directions.
- **Restructure if stuck.** If your output feels off, rephrase the problem — logically equivalent prompts can produce different results.

### 8.7 Never Trust Arithmetic or Counting

**Pattern-matching is not arithmetic. Always compute, never reason about numbers.**

- Write code to compute, don't do mental arithmetic. For any quantitative analysis, produce a script — then run it.
- Verify numerical outputs independently. Spot-check totals, unit conversions, and aggregations.
- Be especially cautious with: cost estimates, pricing calculations, date/time arithmetic, and counting over lists.

### 8.8 Confirmation Bias

**Agreement is not validation. Actively seek counterarguments.**

- When analysing data, examine raw data before forming conclusions. Don't anchor on the user's framing.
- For important decisions, argue the opposing position. "What would go wrong with this approach?"
- Don't treat agreement as validation. Independent verification requires actively challenging assumptions.

### 8.9 Robustness & Consistency

**When outputs are inconsistent, restructure — don't just retry.**

- If you get inconsistent or poor outputs, restructure the approach — don't retry the same thing.
- For critical code, review the logic, not just whether it runs. Code can pass tests but contain subtle reasoning errors.
- Pin important context in CLAUDE.md and project docs for a consistent baseline rather than relying on conversational memory.

### 8.10 DRY & SOLID Principles

**Apply DRY and SOLID pragmatically — not dogmatically. These serve simplicity (§8.2), not the other way around.**

**DRY (Don't Repeat Yourself):**
- If the same logic appears in 3+ places, extract it. Two occurrences are fine — premature abstraction is worse than a little duplication.
- DRY applies to **logic and behaviour**, not to superficially similar code. Two functions that look alike but serve different concerns should stay separate.
- When extracting shared code, co-locate it near its callers. Don't create a `utils/` junk drawer.

**SOLID:**
- **S — Single Responsibility:** Each module/class/function does one thing. If you can't describe it without "and", split it.
- **O — Open/Closed:** Prefer extending behaviour (new functions, new components) over modifying existing working code. But don't build extension points speculatively — only when the codebase already demands it.
- **L — Liskov Substitution:** Subtypes must be substitutable for their base types without breaking behaviour. If you override, honour the contract.
- **I — Interface Segregation:** Don't force consumers to depend on methods they don't use. Keep interfaces focused. Prefer multiple small interfaces over one large one.
- **D — Dependency Inversion:** Depend on abstractions, not concretions — but only where the abstraction earns its keep. A single-implementation interface added "just in case" is over-engineering.

**Tie-breaker when Simplicity (§8.2) and SRP conflict:** For functions under ~20 lines, favor keeping them inline even if they do "two things." For longer functions, favor SRP extraction. Example: a 10-line handler that validates then saves is fine as-is; a 60-line handler that validates, transforms, saves, and notifies should be split.

**Balance with §8.2:** If applying a SOLID principle would add complexity without a concrete, present-day benefit, skip it. The goal is maintainable code, not textbook compliance.

### 8.11 Error Handling

**Handle errors at trust boundaries. Propagate with context. Never swallow silently.**

- **Trust boundaries** require error handling: user input, network/API calls, file I/O, external library calls, environment variables, database queries
- **Internal code** generally doesn't: if your own function passes a valid type, don't re-validate it
- Catch errors at the level that can **do something useful** (retry, show user message, fallback). Don't catch just to log and re-throw.
- Always propagate context: `throw new Error('Failed to fetch user profile', { cause: err })` — not just `throw err`
- Never swallow errors with empty catch blocks. If you genuinely need to ignore an error, add a comment explaining why.
- For async code: every `await` that can reject must be in a try/catch or have a `.catch()` handler. Unhandled rejections crash processes.
- Fail fast on startup: validate config, env vars, and connections at boot — not on first request

### 8.12 Security Practices

**Validate at boundaries. Never trust external input. Never hardcode secrets.**

- **Never hardcode secrets** — API keys, tokens, passwords, connection strings go in environment variables, never in source code
- **Never commit secrets** — if a `.env`, credentials file, or key is staged, stop and unstage it. Add to `.gitignore`.
- **Sanitize user input** — treat ALL user-provided data as untrusted. Validate type, length, format, and range.
- **Parameterized queries only** — never interpolate user input into SQL, shell commands, or template strings that get executed
- **Avoid `dangerouslySetInnerHTML`** (React), `eval()`, `innerHTML`, and `new Function()` — if unavoidable, sanitize with a proven library (e.g., DOMPurify)
- **Validate on the server** — client-side validation is UX, not security. Always re-validate on the backend.
- **Use HTTPS** — never make requests to HTTP endpoints from production code
- **Least privilege** — request only the permissions, scopes, and access levels you actually need

### 8.13 Documentation & Comments

**Comment the "why", not the "what". Code should be self-documenting.**

- Add comments only when the reason for a decision isn't obvious from the code itself
- Use JSDoc/TSDoc for exported functions and public APIs — parameters, return types, and what the function does
- Don't add comments to code you didn't change (see §8.3)
- Remove stale comments when you change the code they describe — a wrong comment is worse than no comment
- No TODO comments without a linked issue or ticket reference

### 8.14 Logging & Observability

**Log for operators, not for developers. Structure for machines, write for humans.**

- Use structured logging (key-value pairs) over free-text strings
- **Never log secrets, tokens, PII, or passwords** — if in doubt, don't log it
- Use appropriate log levels: `error` (failures requiring action), `warn` (degraded but functional), `info` (significant business events), `debug` (development only, never in production hot paths)
- Include correlation/request IDs in log entries for traceability across services
- Log at boundaries: incoming requests, outgoing calls, errors, and state transitions — not every function call

---

## 9. Workflow Orchestration

### Plan Mode
- Enter plan mode when the **approach** is uncertain: architectural decisions, new features with multiple valid designs, unfamiliar domains
- For tasks where the approach is clear but execution spans multiple files (bug fixes, straightforward refactors), proceed directly using the complexity trigger decomposition from §2
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
- Always include a link to the local `.md` file where the plan is being developed, so the user can easily jump in and edit it if needed
- Structure plans from **high-level (product, UX) → low-level (architecture, code structure)**. Don't mix levels of abstraction. PMs should get what they need by skimming the top; engineers should find implementation detail by reading deeper
- Include the "what" and "why" for each step, not just the "how"

### Team-Based Execution

**For any non-trivial work, spawn a team of specialist agents rather than working solo.**

- Decompose the task and create a team with specialist agents for each area of work
- Each agent should have deep expertise in their assigned domain (e.g., frontend, backend, testing, data, architecture, DevOps)
- Use the shared task list for coordination — agents claim and complete tasks independently
- One logical concern per agent — don't overload specialists with unrelated work
- Offload research, exploration, and parallel analysis to keep the lead agent's context clean
- For complex problems, throw more compute at it — more specialists working in parallel
- The lead agent orchestrates, reviews, and merges — specialists execute

### Git Worktree Strategy (Multi-Agent Default)

**Use git worktrees as the primary isolation strategy for multi-agent work.** Each agent gets its own working directory and branch, eliminating file-level conflicts during parallel execution.

#### Setup (lead agent responsibility)

```bash
# Create a worktree per specialist agent
git worktree add ../project-frontend feature/frontend
git worktree add ../project-backend feature/backend
git worktree add ../project-tests feature/tests

# Assign each agent to its worktree directory
# Agents operate ONLY within their assigned worktree
```

#### Rules

- **One worktree per agent** — agents must never operate outside their assigned directory
- **One branch per worktree** — each worktree tracks a dedicated feature branch
- **Lead agent merges** — specialists push to their branches; the lead reviews and merges into the integration branch
- **Shared files** (config, lock files, shared types) — designate one agent as the owner, or use the File Edit Conflicts backoff pattern below as a fallback
- **Cleanup** — the lead agent removes worktrees when branches are merged: `git worktree remove ../project-frontend`

#### When to use worktrees vs. shared directory

| Scenario | Strategy |
|----------|----------|
| Agents touch different files/areas | **Worktrees** (preferred) |
| Agents must co-edit the same files | Shared directory + File Edit Conflicts backoff |
| Single agent with subagent research | Shared directory is fine |
| Quick, low-risk parallel tasks | Shared directory is fine |

### Autonomous Execution
- When given a bug report: just fix it. Don't ask for hand-holding.
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

### Demand Elegance
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes
- Challenge your own work before presenting it

### Multi-Agent Review
- Don't let agents auto-merge work. Treat parallel agent outputs like PRs from junior developers — review, test, merge deliberately.
- Expect coordination failures. Agents in parallel have no shared state. Conflicts and redundant work are the default without human orchestration.
- Add explicit verification checkpoints between stages.

### File Edit Conflicts (Exponential Backoff — Fallback)

When worktrees aren't viable and agents share a directory, or when agents must co-edit shared files (config, lock files, shared types), use this pattern. When you get a "File has been modified since read" error, retry with exponential backoff:

1. **Immediately** — re-read the file and retry the edit
2. **After 10 seconds** — `sleep 10`, re-read, retry
3. **After 30 seconds** — `sleep 30`, re-read, retry
4. **After 60 seconds** — `sleep 60`, re-read, retry

Only give up after all 4 attempts fail. Each retry MUST re-read the file first to get the latest content, then adapt the edit to the current state of the file.

---

## 10. Task Management

> Create a `tasks/` directory if it doesn't exist before writing to these files.

1. **Plan** — Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan** — Check in before starting implementation
3. **Track Progress** — Mark items complete as you go
4. **Explain Changes** — High-level summary at each step
5. **Document Results** — Add review section to `tasks/todo.md`
6. **Capture Lessons** — Update `tasks/lessons.md` after corrections

### Self-Improvement Loop (after ANY correction from the user)

1. Update `tasks/lessons.md` with the pattern
2. Write rules for yourself that prevent the same mistake
3. Ruthlessly iterate until mistake rate drops
4. Review lessons at session start

---

# APPENDIX A: RLM Patterns (Large Context)

See [`AGENTS-RLM.md`](./AGENTS-RLM.md) for large context handling patterns. **Load only when:** context > 100K tokens, task requires processing most/all of a large input, or task scales O(N)/O(N²).

---

# APPENDIX B: Quick Reference

### Known LLM Failure Modes

| Failure Mode | Risk | Mitigation |
|---|---|---|
| Working memory overload | High in long sessions | Fresh conversations per topic (§8.5) |
| Anchoring / confirmation bias | High for decisions | Lead with problem, request counterarguments (§8.6, §8.8) |
| Compositional reasoning | High for multi-step tasks | Decompose into sequential steps (§2, §6) |
| Arithmetic errors | High for calculations | Always use code, never mental maths (§8.7) |
| Framing sensitivity | Medium | Restructure prompt if output is off (§8.6) |
| Reversal curse | Medium in complex context | State relationships bidirectionally (§8.6) |
| Multi-agent coordination | High if parallelising | Human review gates, no auto-merge (§9) |

---

# APPENDIX C: Learnings System

The `learnings/` folder contains documented mistakes and how to avoid them. Check `learnings/INDEX.md` before starting work (see §2). For the learning document format and when to add learnings, see the Learnings section in [`AGENTS-PROJECT.md`](./AGENTS-PROJECT.md).

---

# APPENDIX D: Project Documentation (FOR[name].md)

When starting a new project, write a `FOR[yourname].md` covering: Technical Architecture, Codebase Structure, Technologies Used, Technical Decisions, and Lessons Learned. Write conversationally — explain the "why", use analogies, tell the story of the project.

---

**REMINDER: Every response that includes code changes MUST end with a Verification Block. See Section 1.**
