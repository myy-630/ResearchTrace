# M7 audit fixture

Run `node fixtures/audit-scenario/setup.mjs` from the ResearchTrace repository root.
Open `fixtures/audit-scenario/project` as a Harness workspace and call
`researchtrace_run_audit` with the printed document ID. The fixture includes
six source-grounded Claims, six recorded runs, one archived method, and a
deliberately dirty result. The expected report has five errors and two warnings.

The setup is idempotent. All ResearchTrace state stays in the project's local
`.researchtrace/` directory.
