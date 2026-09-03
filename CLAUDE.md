# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev               # vite dev server
npm run build             # production build (needs git available: vite.config.ts shells out to `git rev-parse HEAD`)
npm run preview
npm run check             # svelte-kit sync && svelte-check
npm run lint              # eslint
npx prettier --write .    # no format script; prettier config exists and CI does not check formatting
```

There is no test framework and no test files in this repo. CI (`.github/workflows/`) runs
`npm run lint` on every push/PR and `npm run build` on `main`.

## Architecture

SvelteKit 2 / Svelte 5 (runes) SPA-ish site for Twitch utilities, deployed at `tv.supa.sh`.
**There is no backend in this repo.** Every route is prerendered static HTML and all data is
fetched from third-party APIs in the browser.

- `svelte.config.js` swaps adapters by `NODE_ENV`: `adapter-static` in dev, `adapter-cloudflare`
  in production. Prerender origin is pinned to `https://tv.supa.sh`.
- `src/hooks.ts` reroutes every request to a lowercased pathname, so URLs are case-insensitive.
- `vite.config.ts` defines the globals `__COMMIT_HASH` and `__BUILD_DATE` (declared in
  `src/app.d.ts`, allowlisted in `eslint.config.js`). Both must be `JSON.stringify`-ed: Vite deep
  clones the config and throws on a non-plain value such as a bare `Date`.
- `+page.ts` loaders are either just `export const prerender = true` (logs, live, firehose) or
  thin `fetch` wrappers around `api-tv.supa.sh` (vods). `/` 308-redirects to `/live`.

### Routes

| Route                      | Data source                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/live`                    | `api-tv.supa.sh/tags/ro` stream list; HLS playback via `luminous.alienpls.org` (Twitch) or `api-tv.supa.sh/kick_playback` (Kick) |
| `/logs`                    | `logs.zonian.dev` (BestLogs): `/health`, `/meta/search`, `/list`, `/{channel}/{y}/{m}/{d}`, `/search`, `/stats`                  |
| `/firehose`                | WebSocket to one of `src/routes/firehose/instances.json`, `wss://{instance}/firehose?jsonBasic=true`                             |
| `/vods`, `/vods/[channel]` | `api-tv.supa.sh`, media on `r2-vods.supa.sh` (mostly disabled in the sidebar)                                                    |
| `/jake`                    | one-off archive page backed by `fi.supa.sh`                                                                                      |

Emotes and badges come from 7TV / BetterTTV / FrankerFaceZ / IVR through
`src/lib/twitch/services/` — each service is a plain object of `fetch` functions with a 10s
`AbortSignal.timeout` that throws on non-ok. Callers wrap them in `Promise.allSettled` so one
dead provider degrades instead of breaking the page.

### Chat message rendering

[chat.svelte.ts](src/lib/twitch/chat.svelte.ts) owns the whole pipeline for `/logs`, `/firehose`
and `/jake`: the `Message` / `ChatComponents` types and a `ChatSource` class holding the emote and
badge tables plus `parse()` and `badges()`. Each page constructs one `ChatSource` (jake passes
`emoteClass` to size emotes for its wrapping layout), calls the `load*` methods, and renders rows
through [message/content.svelte](src/lib/components/message/content.svelte). Emote or link
handling changes belong in `ChatSource`, not in a page.

`parse` turns a raw IRC-tag message into `ChatComponents` — an array of `{ type: Component, props }`
rendered via `{#each ... as { type: Component, props }}`. Word lookup order is channel emote →
global emote → `linkParser.parse` → plain text, with Twitch native emotes spliced in from the
`emotes` tag by codepoint position (offset by `system-msg` length, iterating `[...text]` so astral
chars line up).

`parse` and `badges` memoise per message and invalidate when their table changes — a virtualised
row calls both for every message on screen on every scroll tick, and `/logs` caches its dayjs
formatting and its id lookup for the same reason. Keep new per-row work off the hot path.

The tables are `SvelteMap`s populated asynchronously; because rendering happens inside a plain
function rather than a `$derived`, `content.svelte` wraps the render in
`{#key chat.emoteVersion}` / `{#key chat.badgeVersion}`. Those counters are assigned from plain
non-reactive tick fields so bumping one never reads the signal it writes — otherwise an `$effect`
that calls a `load*` method would depend on its own write. Keep that shape when adding a source.

`messageSearch` supports `regex:`, `in:` and `from:` prefixes and otherwise does a
case-insensitive substring scan. It keeps a **module-level cache** (`lastQuery`/`lastResult`) that
narrows the previous result set when the new query extends the old one — anything that mutates
the message array in place instead of replacing it will break that invariant.

### State conventions

- Page title is a context, not a store: `+layout.svelte` `setContext<TitleContext>("title", …)`
  and each page calls `getContext<TitleContext>("title").set("…")` at the top of its script.
- Cross-page player/grid state is in `src/lib/stores/live.ts` (classic writable stores),
  persisted to `localStorage` by subscriptions in `+layout.svelte`. Other prefs are written
  directly to `localStorage` (`sidebar-provider-state`, `logs-search-mode`,
  `logs-bottom-scroll-state`, `live-show-kick`, …).
- The URL query string is the source of truth for `/logs` and `/firehose` filters. The pattern is
  an `$effect` that reads the reactive values then `untrack(() => { … goto(page.url.search,
{ replaceState: true, keepFocus: true }) })`, with the initial read done in `onMount`. Follow it
  rather than introducing bidirectional bindings.
- Long lists use [virtual-list.svelte](src/lib/components/virtual-list.svelte), a fixed-`itemSize`
  windowed list that measures its own height and takes an `item` snippet. Bind it with
  `bind:this` for its `scrollTo` / `scrollToBottom` / `scrollToIndex` exports rather than reaching
  for the scroll container. Indexes passed to it are **display** indexes, so in `/logs` they
  already account for the list being reversed when `scrollFromBottom` is off.

### UI layer

There is **no shadcn-svelte**. `src/lib/components/ui/` is hand-written and owned by this repo —
lint and format it like anything else. Each file wraps a bits-ui primitive (or a plain element)
in one composed component rather than a directory of parts: `Dialog` takes `title`/`description`
props with `trigger`/`footer` snippets, `Popover` and `Select` take a `trigger` snippet and an
`options` array. Import from the `$lib/components/ui` barrel. `shell.svelte.ts` holds sidebar
open/collapsed state; `sidebar.svelte` is a plain `<nav>`, not a primitive.

Controls are sized for touch: `Button` `md`/`icon` and `Input`/`Select` are `h-11`/`size-11` (44px,
WCAG 2.5.5), the compact `sm`/`icon-sm` and the sidebar rows are 36-40px, and nothing drops below
24px except the permalink button inside a `/logs` chat row, which is exempt as an inline target in
a fixed-height virtualised row. Don't reintroduce `h-8` height overrides on pages to tighten a
toolbar row — change the recipe if the scale is wrong. Icon-only buttons need an accessible name:
an `aria-label` or an `sr-only` span, not just `title`.

Tailwind 4 is configured entirely in `src/app.css` (no `tailwind.config.ts`, no
`postcss.config.js`). Colour is a small semantic set — `ground`, `surface`, `raised`, `line`,
`text`, `dim`, `accent`, `signal`, `warn` — with light values on `:root` and dark on `.dark`.
**Do not reach for Tailwind palette colours** (`zinc-800`, `red-500`); use the tokens so both
themes stay correct.

The palette is a hueless neutral grey with a purple `--accent`; `--accent-ink` is the readable
colour on top of the accent. It is deliberately restrained — a per-tool accent (magenta on
`/live`, cyan on `/firehose`, keyed off `data-tool`) was dropped, so don't reintroduce a per-route
hue, and keep the neutrals free of any tint. `--signal` is lime rather than green on purpose:
`/logs` paints a search match `bg-accent/25` and a highlight `bg-signal/15` on rows that sit next
to each other, so signal has to stay far enough from the purple accent to be told apart at those
opacities, and clear of the orange `--warn`. `+layout.svelte` still derives `tool`
from the pathname, but only to pick the toolbar. The site mark is
[logo.svelte](src/lib/components/logo.svelte) — a squircle in `currentColor` with a pulse stroked
in `var(--accent-ink)`; [static/favicon.svg](static/favicon.svg) is the same geometry with the
dark-theme values baked in, so edit the two together.

Type is Space Grotesk (`font-display`, headings and numbers) over Inter (body and
chat rows, chosen for its script coverage); counts and timestamps take the `.tnum` helper.
The chrome scale is `text-3xl` page `h1`, `text-xl` dialog title, `text-base` for control text
(`Button` `md`, `Input`, `Select`) and the copy beside a control, `text-sm` for `Label`, the
compact `sm` button and section headings, `text-xs` only for sidebar section labels and the
footer. Chat rows are the exception and stay at `text-xs`/`text-sm` — their height is pinned by
the `lineHeight` passed to `VirtualList`, so changing their type means changing that too. The
`/live` stream cards keep their own denser scale so the grid stays tight.

bits-ui reports state as `data-state="open"` and booleans as `data-active="false"`, so `app.css`
defines `open` / `closed` / `checked` / `on` variants rather than using Tailwind's bare `data-*`
shorthand, which would miss the first and wrongly match the second.

## Style

Prettier config is unusual and enforced by habit rather than CI: tabs (width 4), `printWidth`
200, double quotes, LF (also forced by `.gitattributes`). Long single-line ternaries and
template URLs are normal here; don't reformat to narrower lines. `require-await` is an error in
ESLint, and `svelte/no-navigation-without-resolve` is off — the site is served from the domain
root and most navigations are query-string-only.
