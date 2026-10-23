# ResearchTrace

ResearchTrace is a local DeepSeek Harness plugin. The product and technical
requirements are in [docs/RESEARCHTRACE_SPEC.md](docs/RESEARCHTRACE_SPEC.md).

## Open it in Harness

1. Select or create a Harness workspace and start a conversation in it.
2. Click the right Sidebar button in the top right of the conversation.
3. In the Sidebar start panel, choose **ResearchTrace**. If the workspace is
   new, click **Initialize project**.
4. ResearchTrace opens directly to the research tree. Expand experiment groups
   to see individual runs, click a node to open its detail, or use **Audit paper**
   at the top to select a paper and review its report. The **Back to research
   tree** button returns from detail or audit. A ResearchTrace tool result in
   Chat can also open its related node, run, paper, Claim, or report there.

The plugin stores its own data in `<workspace>/.researchtrace/`, including the
SQLite database, run snapshots, document cache, and audit reports. It has no
separate ResearchTrace web page or server.

## Local test profile

The already installed `researchtrace-dev` test profile links to this checkout.
On this machine, run:

```sh
cd /Users/myy/Documents/ResearchTrace
DSH_HOME="$PWD/.dsh-test-home" /Users/myy/.npm/_npx/b86ed90107c62dab/node_modules/.bin/dsh \
  --profile researchtrace-dev --patch fixtures/m1-browse-picker.patch.yml --no-open --port 0
```

Open the `dsh web:` URL printed by the command. The test profile is local to
this checkout. The repository currently has no GitHub remote.

Run all automated tests with `npm test`. The larger repeatable local scenario
is described in [fixtures/full-scenario/README.md](fixtures/full-scenario/README.md).
