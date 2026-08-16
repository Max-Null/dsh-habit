/**
 * dsh-habit 引擎：监听会话事件，检测纠正信号，阈值触发 LLM 判断，
 * 管理习惯候选（存储 + 两级人工闸门的第一级）。
 *
 * 状态以内存为权威，候选变化时 flush 到 JSON 存储。
 * @module @max-null/dsh-habit/engine
 */

import { homedir } from 'node:os'
import { join } from 'node:path'
import { Service, type Context } from '@deepseek-ai/cordis'
import type { KvUnit } from '@deepseek-ai/dsh-storage'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { JsonStorageBackend } from '@deepseek-ai/dsh-storage-json'
import { addCandidate, settleCandidate } from './candidates.ts'
import { detectCorrection } from './signals.ts'
import { analyzeHabits, type HabitJudgment } from './analyzer.ts'
import type { CorrectionSignal, HabitCandidate, HabitConfig } from './types.ts'

/** 存储 unit 名。 */
const UNIT_NAME = 'habit'
/** 候选表名。 */
const CANDIDATES_TABLE = 'candidates'

/** 默认存储根：$DSH_HOME/storages/habit。 */
function defaultStorageRoot(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'storages', 'habit')
}

/**
 * 习惯引擎服务（服务名 `habit`）。
 * UI（SSiD 侧栏）通过 snapshot/confirm/discard 读管候选。
 */
export class HabitEngine extends Service {
  static inject = ['storage', 'llm']

  private readonly signalThreshold: number
  private readonly judgeProvider: string
  private readonly judgeModel: string

  private unit: KvUnit | undefined
  private candidates: HabitCandidate[] = []
  /** sessionId → 本会话累积的纠正信号。 */
  private readonly signals = new Map<string, CorrectionSignal[]>()
  /** 串行化分析队列（防并发风暴）。 */
  private analyzeChain: Promise<void> = Promise.resolve()
  /** 串行化磁盘写。 */
  private writeChain: Promise<void> = Promise.resolve()

  constructor(ctx: Context, private readonly config: HabitConfig = {}) {
    super(ctx, 'habit')
    this.signalThreshold = config.signalThreshold ?? 3
    this.judgeProvider = config.provider ?? 'deepseek-official'
    this.judgeModel = config.model ?? 'deepseek-v4-flash'
  }

  /** UI 快照：全部候选（新在前）。 */
  snapshot(): HabitCandidate[] {
    return [...this.candidates].reverse()
  }

  /** 确认候选（UI 调；写入 memory 由壳层做）。 */
  confirm(id: string): HabitCandidate | undefined {
    this.candidates = settleCandidate(this.candidates, id, 'confirmed')
    void this.flush()
    return this.candidates.find(candidate => candidate.id === id)
  }

  /** 丢弃候选。 */
  discard(id: string): HabitCandidate | undefined {
    this.candidates = settleCandidate(this.candidates, id, 'discarded')
    void this.flush()
    return this.candidates.find(candidate => candidate.id === id)
  }

  protected async [Service.init](): Promise<void> {
    const backend = new JsonStorageBackend(this.config.storageRoot ?? defaultStorageRoot())
    this.ctx.storage.backend.register('habit', backend)
    this.ctx.effect(() => async () => { await backend.close() }, 'habit.backendClose')

    this.unit = await backend.kv.open({
      name: UNIT_NAME,
      version: 1,
      tables: [CANDIDATES_TABLE],
      hasGlobal: false,
    })
    const snapshot = await this.unit.loadAll()
    const stored = snapshot.tables[CANDIDATES_TABLE]?.['all']
    this.candidates = Array.isArray(stored) ? stored as HabitCandidate[] : []

    this.ctx.on('session/event', (session: Session, event: SessionEvent) => {
      void this.handleEvent(session, event)
    })
  }

  private handleEvent(session: Session, event: SessionEvent): Promise<void> {
    const sessionId = String(session.id)
    if (event.type === 'user/message') {
      // user/message 事件的 data 就是 UserMessage 本身（content 直接在其上）。
      const text = event.data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join(' ')
      const signal = detectCorrection(text)
      if (signal !== undefined) {
        const list = this.signals.get(sessionId) ?? []
        list.push(signal)
        this.signals.set(sessionId, list)
      }
      return Promise.resolve()
    }
    if (event.type === 'turn/end') {
      const list = this.signals.get(sessionId) ?? []
      if (list.length >= this.signalThreshold) {
        const evidence = list.slice(-5)
        this.signals.set(sessionId, [])
        return this.scheduleAnalysis(evidence)
      }
    }
    return Promise.resolve()
  }

  /** 串行调度一次 LLM 判断。 */
  private scheduleAnalysis(evidence: CorrectionSignal[]): Promise<void> {
    this.analyzeChain = this.analyzeChain.then(async () => {
      const judgments = await analyzeHabits(this.ctx, {
        provider: this.judgeProvider,
        model: this.judgeModel,
        evidence: evidence.map(signal => signal.text),
        existingHabits: this.candidates
          .filter(candidate => candidate.status !== 'discarded')
          .map(candidate => candidate.habit),
      })
      for (const judgment of judgments) {
        if (judgment.type !== 'create_candidate') continue
        const [next, added] = addCandidate(this.candidates, {
          habit: judgment.habit,
          confidence: judgment.confidence,
          evidenceCount: evidence.length,
          evidence: evidence.map(signal => signal.text),
        })
        this.candidates = next
        if (added) await this.flush()
      }
    })
    return this.analyzeChain
  }

  /** 序列化写候选。 */
  private flush(): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      await this.unit?.putRecord(CANDIDATES_TABLE, 'all', this.candidates)
    })
    return this.writeChain
  }
}

export default HabitEngine
