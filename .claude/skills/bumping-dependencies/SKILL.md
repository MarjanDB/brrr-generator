---
name: bumping-dependencies
description: Adding, removing or updating dependencies, pnpm itself or Node in this repo — the pnpm catalog, exact versions, the supply-chain settings in pnpm-workspace.yaml (release age, trust policy, build approval), where the pnpm and Node versions are pinned, and what to verify afterwards. Use for any change to package.json dependencies, pnpm-workspace.yaml, pnpm-lock.yaml, the Dockerfile's versions, or for pnpm install errors such as ERR_PNPM_TRUST_DOWNGRADE or ERR_PNPM_NO_MATURE_MATCHING_VERSION.
---

# Bumping dependencies

## Where versions live

- Every external version is in the `catalog:` of `pnpm-workspace.yaml`, pinned exactly (`saveExact: true`, no `^` or `~`). The
  `package.json` files say `"catalog:"`; workspace packages say `"workspace:*"`.
- `catalogMode: strict`: `pnpm --filter <package> add <dep>` (`-D` for dev) writes the new dependency into the catalog, and a version
  that isn't in the catalog is rejected. To update, change the version in the catalog, then `pnpm install`. `pnpm outdated -r` lists
  what's behind.
- pnpm itself: `packageManager` in the root `package.json` and `ARG PNPM_VERSION` in the `Dockerfile`; keep them equal. CI
  (`pnpm/action-setup@v6`) reads `packageManager`.
- Node: `ARG NODE_VERSION` in the `Dockerfile`; CI uses `lts/*`. `@types/node` follows the Node major.

## Supply-chain settings

The settings in `pnpm-workspace.yaml` are deliberate. Don't loosen them, and don't add per-package exceptions (`trustPolicyExclude`,
`minimumReleaseAgeExclude`), even to get an install through.

| Setting | Effect | When it fails |
| --- | --- | --- |
| `minimumReleaseAge: 1440` | Versions younger than a day can't be installed | `ERR_PNPM_NO_MATURE_MATCHING_VERSION`: stay on the previous version and note when the new one becomes installable. If a dependency's range needs a version that's too young, pin the dependent package one release back. |
| `trustPolicy: no-downgrade`, `trustPolicyIgnoreAfter: 43200` | A version published in the last 30 days with weaker trust evidence (provenance, trusted publisher) than earlier versions of the same package is refused | `ERR_PNPM_TRUST_DOWNGRADE`: report the package and versions and let the user decide; usually another version, or holding back the package that pulls it in. |
| `blockExoticSubdeps: true` | Transitive dependencies only come from the registry | A dependency pulling from git or a tarball: report it. |
| `allowBuilds` | Which packages may run install scripts | pnpm lists packages whose build scripts it skipped. Never add or change entries: tell the user, who runs `pnpm approve-builds` themselves. |
| `enableGlobalVirtualStore: false` | Packages live in this repo's `node_modules` | Keep it: Nuxt resolves modules that other modules depend on (e.g. `@nuxtjs/robots` from `@nuxtjs/seo`) only from its `modulesDir`. |

To re-resolve from scratch, delete `node_modules` together with `pnpm-lock.yaml`. pnpm reuses `node_modules/.pnpm/lock.yaml` when the
lockfile is missing, so deleting only the lockfile keeps the old resolutions.

## Verify

After `pnpm install`:

1. `pnpm lint`
2. `pnpm --filter @brrr/lib test`, `pnpm --filter @brrr/lib typecheck`, `pnpm --filter @brrr/lib build`
3. `pnpm --filter @brrr/cli exec tsc --noEmit`
4. `pnpm --filter @brrr/app typecheck`, `pnpm --filter @brrr/app build`, and read the build output for new warnings

For a major version, read its changelog or migration guide before bumping. Breaks this repo has already hit:

- TypeScript 6: `baseUrl` is deprecated (`paths` are relative to the tsconfig), and `types` defaults to `[]`, so Node types need
  `"types": ["node"]` (`standalone/cli/tsconfig.json`).
- tsdown: output is `.mjs` / `.d.mts` (lib's `exports` point there); externalising dependencies is the default.
- Vite 8: `resolve.tsconfigPaths: true` replaces `vite-tsconfig-paths` (`lib/vitest.config.ts`).
- js-yaml 5: the core schema leaves unquoted dates as strings, which `zDateTimeFromISOString` accepts.
- csv-stringify: the default (Node) build needs `Buffer`; lib imports `csv-stringify/browser/esm/sync`.
- Biome majors add lint rules (Vue and a11y last time): fix the findings, or scope an override in `biome.json` with a reason.

## Pull request

Branch, commit as `chore(deps): …`, and open the PR with the `patch` label (release-drafter derives the next version from labels).
