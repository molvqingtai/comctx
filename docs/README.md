# Comctx Docs

This app contains the documentation site for `comctx`, built with Fumadocs on top of Waku.

## Development

From the repository root, start the docs app with:

```bash
pnpm dev:docs
```

Or run it from the `docs` workspace directly:

```bash
pnpm --filter docs dev
```

## Build

To create a production build for the docs site:

```bash
pnpm build:docs
```

Or from the `docs` workspace:

```bash
pnpm --filter docs build
```

## Type Check

To validate generated MDX content and run TypeScript checks:

```bash
pnpm check:docs
```

## Content Location

Documentation pages live in:

- `content/docs`

The app source code lives in:

- `src`

## Notes

- The docs site is generated from the Fumadocs template and has been adapted for the `comctx` project.
- If you add or rename MDX files under `content/docs`, rerun the checks to ensure generated content stays in sync.