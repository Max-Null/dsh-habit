/**
 * 纠正信号检测（纯函数，可单测）。
 *
 * 第一版保守：只匹配明确的纠正短语，且要求消息较短（避免长任务描述误报）。
 * @module @max-null/dsh-habit/signals
 */

import type { CorrectionSignal } from './types.ts'

/** 纠正模式：用户明确纠正/要求重做的短语。 */
export const CORRECTION_PATTERNS: readonly string[] = [
  '你再检查',
  '再检查一下',
  '再审查',
  '重新审查',
  '重新做',
  '重新来',
  '重新写',
  '重新改',
  '你漏了',
  '漏掉了',
  '这里错了',
  '这不对',
  '不对哦',
  '不是这样',
  '改一下',
  '改回来',
  '怎么没',
  '没做完',
  '还没做',
  '别忘了',
]

/** 纠正消息的最大长度（超过视为任务描述而非纠正）。 */
export const MAX_CORRECTION_LENGTH = 200

/**
 * 检测一条用户消息是否为纠正信号。
 * @param text - 用户消息文本。
 * @returns 命中的信号；非纠正返回 undefined。
 */
export function detectCorrection(text: string): CorrectionSignal | undefined {
  if (text.length === 0 || text.length > MAX_CORRECTION_LENGTH) return undefined
  for (const pattern of CORRECTION_PATTERNS) {
    if (text.includes(pattern)) {
      return { text, pattern }
    }
  }
  return undefined
}
