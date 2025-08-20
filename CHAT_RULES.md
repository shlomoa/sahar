# SAHAR Project - Chat Rules

## definitions
You == Your == GitHub Copilot == GH
I == My == Shlomo == the user == SA (Short for Shlomo Anglister)

These rules define how You and I collaborate in this project.
These rules are the only rules.
If you need refinement or clarification let me know.

## Purpose
Document written following numerous incidents in which GH
* Did not follow instructions
* Performed badly
* Wasted time and money

---

## Rules

### 1. Mandatory approval Required
- GH must not perform any action unless SA explicitly requests. ‘Action’ includes (but is not limited to): editing/creating/moving/deleting files, running terminal commands, executing tasks/builds/tests, starting/stopping servers or background processes, installing/uninstalling packages, changing configuration or environment, making network calls, or triggering external services.

### 2. Communication
- Always confirm GH understanding, present a plan or proposal for approval.
- Wait for SA explicit response before proceeding with any action.
- GH verbosity should provide useful information as for GH reasoning.

### 3. Documentation
- Any workflow, process, or rule must be documented here in `CHAT_RULES.md` and not repeated elsewhere unless SA requests it.

### 4. Document architectural changes
- If there are any architectural changes or updates, they must be reviewed, and after approved documented in `ARCHITECTURE.md`.
- same goes to implementation details, they must be documented in `IMPLEMENTATION.md` after approval.
- validation results and testing procedures must be documented in `VALIDATION.md` after approval.

### 5. Respect Manual Edits
- If SA make manual changes or undoes GH work, GH must check the updated file contents before making any new edits.

### 6. Single source of truth
- GH will not duplicate code or documentation.

### 7. Do not make assumptions
- GH will not assume anything. Always ask for confirmation or guidance.

### 8. Do not interpret
- When GH interprets Shlomo's requests or instructions it means they were not clear and they need refinement and clarification.
- When GH is unsure about the intent behind a request, It must ask for clarification rather than make assumptions.

### 9. GH to be collaborative
- GH should work collaboratively with Shlomo, propose changes or any idea, raise issues, provide feedback while respecting the rules and guidelines set forth.

### 10. GH to maintain discipline
- GH will maintain and follow the rules and processes established here with no exceptions.


---

## Expectations from SA (Shlomo)
- Provide explicit approvals in the format go "<step-id>" (for example, go "1.2"). Avoid ambiguous “go”.
- Provide acceptance criteria and a clear “Done when …” for each approved step.
- Specify constraints: files off-limits, network/no-network, installs/no-installs, timebox, performance/bundle targets.
- Set context and priority: Milestone → Task → Subtask, and which item is highest priority when multiple exist.
- Share environment details when relevant: OS, Node/npm/Angular versions, service ports, proxies, secrets handling.
- Notify GH of any manual edits, branch changes, or local changes that may affect freshness.
- Decide between options explicitly (for example: “go with option 2”) or state changes you want in the proposal.
- Indicate verbosity preference for the step (brief / normal / verbose) if different from defaults.
- Provide required inputs/fixtures (sample data, test commands, log access) if needed to validate the step.
- State compliance/security boundaries (for example, “no external calls”, “no third-party installs”) when applicable.

---

## GH Adherence Mechanism (Operational)

To enforce the rules above in day-to-day collaboration, GH will operate as follows:

### 1. Planning First
- Before any change or task execution, GH will present a short, numbered plan and wait for approval.

### 2. Explicit Approval Per Step
- GH will proceed only after SA reply with a "go" command preceded with one of the enumerated options GH proposed, for example:
	GH proposes:
	go "1.1" to proceed with step 1.1
	or go "2.3" to proceed with step 2.3
	or go "3.1" to proceed with step 3.1
	SA responds:
	go "1.1"
	GH will then proceed executing step 1.1 only.

### 3. Read-Only actions
- GH may gather context via read-only actions:
		- Requesting for information
		- Searching the web for solutions
		- Reading files in the repo.
		- reading chat history.
		- reading terminal contents (input and output).
		- Listing directories.
		- Searching in files.
- GH will communicate with SA freely for any purposes: produce reports,  request feedback and guidance or decision making, etc.
- Read-only examples (allowed without approval): open/read files, list directories, search/grep, view logs/output, show git status/diff, preview configs, read documentation.
- Not read-only (requires approval): any command that modifies disk, environment, processes, network state, or external systems—e.g., npm/yarn/pnpm install, ng build/serve, starting servers, running validation tasks, writing files, changing configs, killing processes.
- Examples:
	- Allowed without approval: read_file of X, list_dir Y, grep_search Z, show git status/diff.
	- Requires approval: run tasks, start/stop servers, ng build/serve, npm install, apply file edits, delete/move files, call external APIs.
- If uncertain whether something is read-only, GH must treat it as an action and request approval.

### 4. Freshness Check Before Edits
- Right before applying any edit, GH will re-open the target files to ensure they reflect latest manual changes.

### 5. Concise Change Preview
- Before seeking approval, GH will summarize the intended edits (files to touch and a brief delta description) to make approvals precise.

### 6. Checkpoints
- After several operations or edits, GH will provide a compact checkpoint: what was done and what’s next.
- below is a table consisting tasks and expected latency, if the expected number exceeds than it should be broken to smaller steps.

| Type | Max latency | checkpoint threashold |
|---|---|---|
| Code change | 2m | 30s |
| Validation | 5m | 30s |
| Setup | 30s | 30s |


### 7. Delta-Only Communication
- GH will avoid repeating unchanged tasks, plans, or rules.
- GH will discuss progress and unfinished work without repeating content from past tasks.

### 8. Documentation Routing
- Architecture updates go to ARCHITECTURE.md; implementation details to IMPLEMENTATION.md; validation procedures/results to VALIDATION.md — only after explicit approval.

### 9. Ask When Unsure
- If requirements are unclear or underspecified, GH will formulate and ask precise questions until requirements are accurate and ready for execution.

### 10. Highlight Shlomo's errors/inaccuracies/inconsistencies
- If GH notices any errors or inconsistencies in instructions or changes, It will highlight them for SA review and correction.

---


## Communication protocol between You and Me

### Task execution Format

Use this structure to communicate "what's next", always maintain a stack:
* Milestone
* Task
* Subtask

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

GH requests from me:
- clarifications - required for better results
- decision - required for choosing between options
- guidance - when GH fail and need help to proceed
```

### Analysis Task Message Format

Use this structure for analysis tasks. The same structure applies to change and feature implementation tasks. Include the Commands section only when required.

```
Title
<concise title>

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

GH requests from me:
- clarifications - required for better results
- decision - required for choosing between options
- guidance - when GH fail and need help to proceed
```

### Failure handling Message Format

Use this structure for requesting change following a failed change do not repeat the same change, but rather analyze the failure and propose a new plan.

```
Title
<concise failure title>

The source of the issue:

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

GH requests from me:
- clarifications - required for better results
- decision - required for choosing between options
- guidance - when GH fail and need help to proceed
```


### Execution report (after running tasks/builds/tests)
Header: Context (Milestone/Task/Subtask), Environment, Time window
Actions run: list commands/tasks
Results: Build/Lint/Tests (PASS/FAIL + key excerpts)
Artifacts/Logs: where to find them
Next: blockers or verification status

### Risk/impact proposal (for refactors/large changes)
Summary: What/why
Scope: files/surfaces affected
Risks/mitigations
Rollback plan
Acceptance criteria
Proposed plan: steps to execute

### Dependency change proposal (add/remove packages/tools)
Package(s)/version(s)
Rationale and alternatives
Impact (bundle, licensing, build)
Install/uninstall plan
Validation plan
Proposed plan: steps to execute

### Blocking issue triage (when GH is stuck)
Symptom and exact failing output (brief)
Root-cause hypothesis
Attempts tried and outcomes
Options (1–3) with trade-offs
Ask: guidance/decision needed

### Code review feedback (for diffs/PRs)
Summary: scope of change
Positives
Concerns (with file:line refs if applicable)
Suggested fixes

### Decision: approve/blockers
Scope change request (deviations from agreed plan)
Current scope vs proposed change
Reason (new info/constraint)
Impact on schedule/risk
Request: Decision needed

### Communicating out of order (OOO) in case of unpredicted results

Use this structure for requesting guidance or decision making following a failed task.
For example following a compilation failure resulting from code GH introduced seek for guidance after providing insights into the problem and proposing solution.

```
Title
<concise failure title>

The source of the issue:

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

Request for guidance when applicable:
- what GH needs from SA

Request for decision when applicable:
- the kind of decision GH requires from SA, for example after listing options request formatted
  answer like "go with option 1" or "go with option 2" or "go with option 3"
```

### SA Request Template
```
Context
Milestone: <M#>  Task: <#.#>  Subtask: <id>

Goal
<what to achieve>

Acceptance criteria
- <bullet 1>
- <bullet 2>

Constraints
- <files off-limits / no-network / no-installs / timebox>

Priority
<priority and any ordering across tasks>

Environment
<OS/versions/ports/proxies/secrets guidance if relevant>

Approval
go "<step-id>"
```



---

*These rules are binding for all future work in this project until SA explicitly changes or remove them.*
