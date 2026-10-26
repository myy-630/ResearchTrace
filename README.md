# ResearchTrace

ResearchTrace is a local DeepSeek Harness plugin for tracking research experiments, decisions, and paper evidence. It records run provenance in the workspace and can audit paper claims against saved runs. The product and technical requirements are in [the specification](docs/RESEARCHTRACE_SPEC.md).

## Requirements

- Node.js 24 or newer
- DeepSeek Harness with the `dsh` command available

## Install from source

```sh
git clone https://github.com/myy-630/ResearchTrace.git
cd ResearchTrace
dsh plugin --profile web add .
dsh web
```

In a Harness workspace, open the right Sidebar, choose **ResearchTrace**, and select **Initialize project** if the workspace is new. ResearchTrace opens the research tree; selecting a node opens its detail, and **Audit paper** opens an audit pane. Tree, detail, and audit panes can stay open side by side.

ResearchTrace stores its own data in `<workspace>/.researchtrace/`, including the SQLite database, run snapshots, document cache, and audit reports. It has no separate web page or server.

## Development

Run the automated tests with:

```sh
npm test
```

The repeatable local scenario is described in [fixtures/full-scenario/README.md](fixtures/full-scenario/README.md). The repository also includes sample workspaces and papers under `fixtures/`.

## License

MIT. See [LICENSE](LICENSE). Vendored dependencies retain their own licenses in `vendor/`.
