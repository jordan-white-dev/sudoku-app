---
agent: Analyst
description: "Start a new feature using the Analyst → Architect → Developer → Reviewer pipeline"
---

You are starting a new feature using the structured Analyst → Architect → Developer → Reviewer workflow.

Before describing your idea, it is helpful — but not required — to have a rough sense of:

- The problem you want to solve and who experiences it
- Any known constraints (must work on mobile, must not break existing behavior, etc.)
- Which area of the app is likely affected (if known)

The Analyst will ask a few rounds of clarifying questions before writing anything. After the interview, you will be asked to approve the handoff before the Architect begins (design and implementation spec), and again before the Developer begins (TDD implementation, one task at a time). If the Architect finds a requirements gap — either during initial spec writing or after being escalated to by the Developer mid-implementation — it will escalate to the Analyst for resolution; each handoff in that round trip also requires your approval, so additional approval points may appear. Once implementation starts, the Developer and Reviewer hand off to each other automatically — both the approval path (task approved, continue to next) and the rejection path (CHANGES REQUESTED, R ≤ 3) fire without prompting you. The review loop runs without interruption unless a finding cycle limit is reached or an exception escalation requires your input. Exception escalations pause the loop at each step — each handoff in the chain requires your approval before the next agent starts. Escalations always follow the chain: Developer → Architect (to resolve spec ambiguities), which may in turn escalate → Analyst (to resolve requirements gaps) before returning through the same chain. The session ends once the Developer has presented the pull request URL and confirmed the workflow is complete — merging and branch cleanup are left to you. Note: the final step uses the GitHub CLI (`gh pr create`) to open the pull request; if the CLI is unavailable or not authenticated, the Developer will provide the PR body and instructions to create it manually via the GitHub web interface. Similarly, if `git push` fails (for example due to a remote rejection or missing upstream), the Developer will pause, report the exact error, and ask you to push manually before continuing to the pull request step.

For a full reference of all handoffs and approval points, see [.github/README.md](../README.md).

When you are ready, describe your idea:
