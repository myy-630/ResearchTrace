# Demo research project

This fixture runs on Node.js without a GPU or network access.

For the M2 Harness scenario, open this directory as the workspace, initialize
ResearchTrace, then ask: “跑一下 Future30，使用 fixtures/configs/future30.yaml。”

The command is:

```sh
node train.mjs --config fixtures/configs/future30.yaml --output results/future30/metrics.json
```

Expected metrics: `results/future30/metrics.json`. Add `--fail` to produce a
failing run; use `--delay-ms 0` for fast automated tests.
