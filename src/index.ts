/**
 * `dsh-habit`: 自学习习惯引擎插件。
 *
 * 三段式闭环：观察（session/event 检测纠正信号）→ 判断（阈值触发
 * flash 调用）→ 沉淀（候选区，两级人工闸门的第一级；第二级在
 * dsh-memory 的 suggested→auto 确认）。
 *
 * 零新增 agent 角色：习惯判断是事件驱动的插件，不占上下文、
 * 不被压缩影响、确定性触发。
 * @module @max-null/dsh-habit
 */

import type { Context } from '@deepseek-ai/cordis'
import { HabitEngine } from './engine.ts'
import type { HabitConfig } from './types.ts'

export { HabitEngine } from './engine.ts'
export { analyzeHabits, type AnalyzeRequest, type HabitJudgment } from './analyzer.ts'
export { addCandidate, pendingCandidates, settleCandidate } from './candidates.ts'
export {
  CORRECTION_PATTERNS,
  detectCorrection,
  MAX_CORRECTION_LENGTH,
} from './signals.ts'
export type {
  CorrectionSignal,
  HabitCandidate,
  HabitConfig,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    habit: HabitEngine
  }
}

export const name = 'dsh-habit'
export const inject = ['storage', 'llm']

export async function apply(ctx: Context, config?: HabitConfig): Promise<void> {
  await ctx.plugin(HabitEngine, config)
  // 读全局服务 store（引擎自己提供的服务）。
  const habit = ctx.get('habit')
  if (habit === undefined) throw new Error('habit engine failed to register')
}
