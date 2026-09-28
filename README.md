# @max-null/dsh-habit

本插件属于 **`@max-null/*` 插件系列**——这一系列共同构成 **[SSID（思灵 · Seek Soul in Darkness）](https://github.com/Max-Null/seek-soul-in-darkness)** 桌面体验。SSID 是整合它们的盒：`dsh-capture` · `dsh-chat-rail` · `dsh-chinese-thinking` · `dsh-draft-polish` · `dsh-guardian` · `dsh-habit` · `dsh-memory` · `dsh-node-appearance` · `dsh-plugin-center` · `dsh-quick-toolbar` · `dsh-skill-mcp-center` · `dsh-ssid-panels` · `dsh-ssid-zh-ui` · `dsh-achievements`。

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

## 截图

本插件是**行为提示类**：不新增任何按钮、面板或设置项，也**不向会话注入任何内容**。

行为效果是**后台沉淀**，全程静默：同一会话内累积到 3 条命中固定纠正短语（如「再检查一下」「重新做」）的短消息后，
插件在回合结束时做一次低成本模型判断；只有判定为「稳定习惯」才落一条候选（状态 `pending`，存于 `$DSH_HOME/storages/habit`）。
候选由宿主 UI 读管——SSiD 侧是侧栏的「习惯」面板，确认后写入 dsh-memory（`suggested`），再由人放行转 `auto`。
未达阈值、判断失败或消息不匹配时，插件不做任何可见动作，会话里看不到任何痕迹。

> 按《SSiD 开发手册》§9 截图规范：截图须回答「装完会多出/变成什么」的**入口与面板**。
> 本插件无界面元素（no UI surface），故**不适用**该项要求，改以上述行为效果说明代替。

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

## Dependencies

`@deepseek-ai/cordis` (`^4.0.1`) plus four kernel packages declared as explicit ranges:
`@deepseek-ai/dsh-llm` and `@deepseek-ai/dsh-session` as `>=0.1.7-rc.2 <0.3.0`,
`@deepseek-ai/dsh-storage` and `@deepseek-ai/dsh-storage-json` as `>=0.1.1-rc.1 <0.3.0`.

**Why a range rather than a caret.** A caret's upper bound is the next minor: `^0.1.7-rc.2`
expands to `>=0.1.7-rc.2 <0.2.0-0`, which a kernel one minor ahead fails. An unsatisfied
`dsh-*` peer is not a warning — the plugin is skipped instead of loaded: it never enters the
fiber graph and never appears in the `did not activate` list, so the only symptom is a missing
set of features. The explicit range admits both the 0.1 and the 0.2 kernel lines.

The check is `app-boot`'s `plugin-compatibility.ts`: it walks `peerDependencies` entries whose
name is `@deepseek-ai/dsh` or starts with `@deepseek-ai/dsh-`, testing
`semver.satisfies(runtimeVersion, requirement, { includePrerelease: true })` — which is why
`@deepseek-ai/cordis` and the other non-`dsh-*` peers sit outside the check. Measured with
semver 7.7.4 against runtime `0.2.0-rc.1`: `^0.1.7-rc.2` and `^0.1.1-rc.1` are `false`;
`>=0.1.7-rc.2 <0.3.0` and `>=0.1.1-rc.1 <0.3.0` are `true`.

## Develop

```sh
npm install --legacy-peer-deps
npm test
npm run typecheck
npm run build
```

## SSID 系列

本插件是 **[SSID（思灵 · Seek Soul in Darkness）](https://github.com/Max-Null/seek-soul-in-darkness)** 全家桶的一员；也可以单独安装到任意 DSH profile——插件自身不依赖其它同系列插件，候选的读管界面由宿主提供（SSiD 侧为 `dsh-ssid-panels` 的「习惯」面板）。


