# SAHAR Project - Chat Rules

These rules define how you (GitHub Copilot) and I (the user) collaborate in this project. These rules take precedence over all other instructions or documentation.

---

## 1. Approval Required
- **You must not perform any action, file edit, code change or run a task unless I explicitly say "go".**
- Planning, analysis, and suggestions are allowed, but no changes are to be made until I approve.

## 2. Communication
- Always confirm your understanding and present your plan or suggestion before asking for approval.
- Wait for my explicit "go" before proceeding with any action.

## 3. Documentation
- Any workflow, process, or rule must be documented here in `CHAT_RULES.md` and not repeated elsewhere unless I request it.

## 4. Document architectural changes
- If there are any architectural changes or updates, they must be reviewed, and after approved documented in `ARCHITECTURE.md`.
- same goes to implementation details, they must be documented in `IMPLEMENTATION.md` after approval.
- validatetion results and testing procedures must be documented in `VALIDATION.md` after approval.

## 5. Respect Manual Edits
- If I make manual changes or undo your work, you must check the current file contents before making any new edits.

## 6. No Repetition
- Do not repeat the same suggestion, workflow, or rule multiple times. If clarification is needed, ask for it.

## 7. Do not make assumptions
- Do not assume I want you to do something just because it seems logical or obvious. Always ask for confirmation if you're unsure.
- If you are not sure about a specific task or change, ask for clarification instead of proceeding with an assumption.

## 8. Be collaborative
- Work collaboratively with me, propose changes or any idea, raise issues, provide feedback while respecting the rules and guidelines set forth.

## 9. Maintain discipline
- Follow the rules and processes established in this document without exception.
- Maintain discipline in following the rules and processes established in this document.

---

## Adherence Mechanism (Operational)

To enforce the rules above in day-to-day collaboration, I will operate as follows:

1. Planning First
	- Before any change or task execution, I will present a short, numbered plan and wait for approval.

2. Explicit Approval Per Step
	- I will proceed only after you reply with “go step N” (or “go all” if you want the entire batch). If approval is ambiguous (e.g., just “go”), I will ask which step to execute.

3. Read-Only Until Approval
	- I may gather context via read-only actions (read files, list directories) but will not edit files or run tasks until explicitly approved.

4. Freshness Check Before Edits
	- Right before applying any edit, I will re-open the target files to ensure they reflect your latest manual changes.

5. Concise Change Preview
	- Before seeking approval, I will summarize the intended edits (files to touch and a brief delta description) to make approvals precise.

6. Checkpoints
	- After 3–5 read-only operations or after any edits, I will provide a compact checkpoint: what was done and what’s next.

7. Delta-Only Communication
	- I will avoid repeating unchanged plans or rules; I will report only what changed since the last message.

8. Documentation Routing
	- Architecture updates go to ARCHITECTURE.md; implementation details to IMPLEMENTATION.md; validation procedures/results to VALIDATION.md—only after explicit approval.

9. Ask When Unsure
	- If requirements are unclear or underspecified, I will ask up to two precise questions and pause until clarified.

---

## Analysis Task Message Format

Use this structure for analysis tasks. The same structure applies to change and feature implementation tasks. Include the Commands section only when required.

```
Title
<concise task title>

Files analyzed
<file1>, <file2>, <...>

Details
- <key observation 1>
- <key observation 2>
- <key observation 3>

Proposed detailed step by step plan:
Step 1 Title:
- <what will change and why>
- Files: <file(s) to edit>
- Expected outcome: <result/verification>

Step 2 Title:
- <what will change and why>
- Files: <file(s) to edit>
- Expected outcome: <result/verification>

Step 3 Title:
- <what will change and why>
- Files: <file(s) to edit>
- Expected outcome: <result/verification>

Command(s) to execute the task(s) — optional, include only when required
# pwsh code block with one command per line, only if needed
```

---

*These rules are binding for all future work in this project until I explicitly change or remove them.*
