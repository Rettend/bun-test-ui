# bun-test-ui

A visual test runner UI for Bun, similar to [Vitest UI](https://vitest.dev/guide/ui.html).

![bun-test-ui](https://img.shields.io/npm/v/bun-test-ui)

## Features

- **Auto-runs tests** when you open the UI
- **Live updates** via WebSocket
- **Watch mode** - auto-reruns tests when source or test files change
- **Visual test explorer** with pass/fail/skip status
- **Console output** per test
- **Powered by Bun** - uses the inspector protocol

## Install

```bash
bun add -d bun-test-ui
```

## Usage

```bash
bunx bun-test-ui
```

This starts the UI at `http://localhost:51205` and auto-opens your browser.

### Options

```bash
bunx bun-test-ui [pattern] [options]

Options:
  -p, --port <number>  Port to run on (default: 51205)
  --no-watch           Disable watch mode
  --no-open            Don't auto-open browser
```

### Examples

```bash
# Run all tests with watch mode (default)
bunx bun-test-ui

# Filter by pattern
bunx bun-test-ui my-feature

# Custom port
bunx bun-test-ui --port 3000

# Disable watch mode (single run)
bunx bun-test-ui --no-watch
```

## Configuration

The CLI reads your `bunfig.toml` for test configuration:

```toml
[test]
root = "./tests"
```

Watch mode (enabled by default) monitors both your test directory and `./src`:

- **Test file changes** → Only that test file is re-run
- **Source file changes** → All tests are re-run

## Development

```bash
# Clone the repo
git clone https://github.com/rettend/bun-test-ui
cd bun-test-ui
bun install

# Dev server with HMR
bun run dev

# Build UI assets
bun run build

# Run production CLI
bun run start
```

## How it works

Uses [bun-inspector-protocol](https://github.com/oven-sh/bun/blob/main/packages/bun-inspector-protocol/README.md) to communicate with Bun's test runner via the WebSocket inspector, similar to how `bun-vscode` implements VS Code test runner support.

## License

MIT
