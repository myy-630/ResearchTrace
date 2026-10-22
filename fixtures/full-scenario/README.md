# Full local research scenario

Run `node fixtures/full-scenario/setup.mjs /path/to/empty/workspace` to seed a local,
repeatable demonstration project. The workspace gets one question, four methods,
seven experiment groups, 27 runs (including three failed), multiple seeds, one
archived method, and Markdown / LaTeX / Word paper examples. The Markdown
`incorrect.md` contains deliberately wrong metrics, learning rate, split, and
mean; its linked result also has a dirty Git snapshot. `ambiguous.md` has
two equally plausible runs and must stay ambiguous until the user selects one.

The script only writes inside the workspace argument. It is idempotent once the
ambiguous document has been seeded. `train.mjs` is a lightweight local script
for additional real runs; it requires Node.js only and no GPU or network.

For the M8 from-empty manual flow, use a new empty Harness workspace and the
ResearchTrace Chat tools in this order: initialize, create a question and
methods, run `train.mjs` (after copying it into that workspace), archive a
method, query the current route, parse a paper, trace a Claim, and run an audit.
Open the right Sidebar via its ResearchTrace guide; navigate Tree → Details →
Audit without opening another page.
