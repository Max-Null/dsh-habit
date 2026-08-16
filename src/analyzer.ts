/**
 * LLM 习惯判断：证据切片 + 已有习惯 → 一次 flash 调用 → 严格 JSON。
 *
 * 输入刻意收窄（最多 5 条纠正原文 + 已有习惯清单），判断质量靠
 * "喂精准上下文"而非大上下文。temperature 0（判断任务要确定性）。
 * @module @max-null/dsh-habit/analyzer
 */

import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

/** LLM 判断输出：一条习惯动作。 */
export interface HabitJudgment {
  type: 'create_candidate' | 'skip'
  /** create_candidate 时的习惯描述。 */
  habit: string
  /** create_candidate 时的置信度。 */
  confidence: 'high' | 'medium' | 'low'
  /** 一句话理由。 */
  reason: string
}

/** 分析输入。 */
export interface AnalyzeRequest {
  provider: string
  model: string
  /** 纠正消息原文（最多 5 条）。 */
  evidence: string[]
  /** 已有习惯（去重判断用）。 */
  existingHabits: string[]
}

/** 分析系统提示词。 */
const SYSTEM_PROMPT = [
  '你是用户行为习惯分析师。用户多次纠正 agent 的行为后，你判断这些纠正是否揭示一个稳定的行为习惯。',
  '',
  '判断纪律：',
  '- 只在证据指向同一类行为时创建习惯候选（create_candidate）',
  '- 证据不足、模式不一致、或语义与已有习惯重复 → 必须 skip',
  '- 不确定宁可 skip，不瞎猜',
  '- habit 描述用中文，一句话，形如「用户每次提交前要求二次审查」',
  '',
  '输出严格 JSON（不要 markdown，不要解释）：',
  '{"actions":[{"type":"create_candidate|skip","habit":"习惯描述（仅 create_candidate 时）","confidence":"high|medium|low（仅 create_candidate 时）","reason":"一句话理由"}]}',
].join('\n')

/**
 * 调 flash 模型做一次习惯判断。
 * @param ctx - 插件上下文（读 llm 服务）。
 * @param request - 证据 + 已有习惯。
 * @returns 判断结果数组（流失败/解析失败时为空数组——自学习宁缺毋滥）。
 */
export async function analyzeHabits(ctx: Context, request: AnalyzeRequest): Promise<HabitJudgment[]> {
  const userPrompt = [
    '## 本次纠正证据（按时间序）',
    ...(request.evidence.length > 0 ? request.evidence.map((text, index) => `${index + 1}. ${text}`) : ['（无）']),
    '',
    '## 已有习惯（语义重复必须 skip）',
    ...(request.existingHabits.length > 0 ? request.existingHabits.map(habit => `- ${habit}`) : ['（无）']),
  ].join('\n')

  try {
    const stream = ctx.llm.stream({
      provider: request.provider,
      model: request.model,
      system: SYSTEM_PROMPT,
      messages: [createUserMessage({
        content: [{ type: 'text', text: userPrompt }],
        source: { kind: 'plugin', plugin: 'dsh-habit' },
      })],
      temperature: 0,
      maxTokens: 1024,
    })
    let text = ''
    for await (const chunk of stream) {
      if (chunk.type === 'text-delta') text += chunk.text
    }
    const match = text.match(/\{[\s\S]*\}/)
    if (match === null) return []
    const parsed = JSON.parse(match[0]) as { actions?: unknown }
    if (!Array.isArray(parsed.actions)) return []
    const judgments: HabitJudgment[] = []
    for (const raw of parsed.actions) {
      if (typeof raw !== 'object' || raw === null) continue
      const action = raw as Record<string, unknown>
      if (action['type'] !== 'create_candidate' && action['type'] !== 'skip') continue
      const judgment: HabitJudgment = {
        type: action['type'],
        habit: typeof action['habit'] === 'string' ? action['habit'] : '',
        confidence: action['confidence'] === 'high' || action['confidence'] === 'medium' || action['confidence'] === 'low'
          ? action['confidence']
          : 'medium',
        reason: typeof action['reason'] === 'string' ? action['reason'] : '',
      }
      if (judgment.type === 'create_candidate' && judgment.habit === '') continue
      judgments.push(judgment)
    }
    return judgments
  } catch {
    // 判断失败宁可没有候选：自学习宁缺毋滥，不抛错打断会话。
    return []
  }
}
