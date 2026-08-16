/**
 * dsh-habit 共享类型。
 * @module @max-null/dsh-habit/types
 */

/** 一条习惯候选：LLM 判断产出，等待用户确认。 */
export interface HabitCandidate {
  /** 稳定 id。 */
  id: string
  /** 习惯描述（LLM 产出，人可读）。 */
  habit: string
  /** LLM 判断置信度。 */
  confidence: 'high' | 'medium' | 'low'
  /** 证据条数（纠正信号计数）。 */
  evidenceCount: number
  /** 证据切片：纠正消息原文（最多 5 条）。 */
  evidence: string[]
  /** 候选状态。 */
  status: 'pending' | 'confirmed' | 'discarded'
  /** 创建时间（epoch ms）。 */
  createdAt: number
}

/** 纠正信号检测结果。 */
export interface CorrectionSignal {
  /** 用户消息原文（切片用）。 */
  text: string
  /** 命中的纠正模式。 */
  pattern: string
}

/** 引擎配置。 */
export interface HabitConfig {
  /** 触发 LLM 判断的纠正信号阈值（默认 3）。 */
  signalThreshold?: number
  /** 分析用模型（默认 flash，成本优先）。 */
  provider?: string
  /** 分析用模型 id。 */
  model?: string
  /** 存储根；默认 `$DSH_HOME/storages/habit`。 */
  storageRoot?: string
}
