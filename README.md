# @max-null/dsh-habit

本插件属于 **`@max-null/*` 插件系列**——这一系列共同构成 **[SSID（思灵 · Seek Soul in Darkness）](https://github.com/Max-Null/seek-soul-in-darkness)** 桌面体验。SSID 是整合它们的盒：`dsh-capture` · `dsh-chat-rail` · `dsh-chinese-thinking` · `dsh-draft-polish` · `dsh-guardian` · `dsh-habit` · `dsh-header-unify` · `dsh-memory` · `dsh-node-appearance` · `dsh-plugin-center` · `dsh-skill-mcp-center` · `dsh-ssid-panels` · `dsh-ssid-zh-ui`。

This plugin belongs to the **`@max-null/*` family** — a set of plugins that together form the **[SSID (思灵 · Seek Soul in Darkness)](https://github.com/Max-Null/seek-soul-in-darkness)** desktop experience.

Self-learning habit engine for the DeepSeek Harness — observes user-correction
signals from session events, judges habits with a low-cost model on threshold,
and settles candidates behind a two-level human gate. No new agent role: the
judgment is an event-driven plugin, immune to context decay.

## The loop

```
① observe   session/event → correction-signal detection (deterministic, zero-token)
② judge     >=3 signals in one session → one flash call (evidence slices + existing habits)
③ settle    candidate zone → user confirms → dsh-memory remember() (suggested)
            → user confirms again → auto → recall injection
```

## Compose

```yaml
- id: habit
  name: '@max-null/dsh-habit'
```

Requires `storage` and `llm` in the host composition (dsh-base ships both).
Installs as a bundle: `dsh plugin --profile <name> add @max-null/dsh-habit`.

## Service

- `ctx.habit` — the engine:
  - `snapshot()` → candidates (newest first)
  - `confirm(id)` / `discard(id)` → first-level human gate
  - (the second gate is dsh-memory's own suggested→auto confirmation)

## Config

| Field | Default | Meaning |
|---|---|---|
| `signalThreshold` | `3` | Correction signals before one judgment call |
| `provider` | `deepseek-official` | Judgment model provider |
| `model` | `deepseek-v4-flash` | Judgment model (cheap, deterministic) |
| `storageRoot` | `$DSH_HOME/storages/habit` | JSON storage root |

## Design notes

- **Deterministic observation, LLM on demand**: correction detection is a
  fixed phrase list + length cap (task descriptions are not corrections);
  the LLM only runs when a session accumulates enough signals.
- **Two-level human gate**: candidates must be confirmed in the UI AND then
  pass dsh-memory's own suggested→auto gate. The model can never promote its
  own habits.
- **Narrow input for quality**: the judgment call gets at most 5 evidence
  texts plus the existing habit list — judgment quality comes from precise
  context, not volume.

## Develop

```sh
npm install --legacy-peer-deps
npm test
npm run typecheck
npm run build
```

## SSID 系列


