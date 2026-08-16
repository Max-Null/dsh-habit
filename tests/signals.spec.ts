import { describe, expect, it } from 'vitest'
import { CORRECTION_PATTERNS, detectCorrection, MAX_CORRECTION_LENGTH } from '../src/signals.ts'

describe('detectCorrection', () => {
  it('matches explicit correction phrases', () => {
    expect(detectCorrection('你再检查一下提交前有没有跑测试')).toBeDefined()
    expect(detectCorrection('这里错了，应该是 read 不是 write')).toBeDefined()
    expect(detectCorrection('你漏了文档更新')).toBeDefined()
    expect(detectCorrection('重新做，这个方案不行')).toBeDefined()
  })

  it('returns the matched pattern', () => {
    const signal = detectCorrection('你再检查一遍')
    expect(signal?.pattern).toBe('你再检查')
    expect(signal?.text).toBe('你再检查一遍')
  })

  it('rejects non-correction messages', () => {
    expect(detectCorrection('帮我写一个登录功能')).toBeUndefined()
    expect(detectCorrection('继续')).toBeUndefined()
  })

  it('rejects over-long messages (task descriptions, not corrections)', () => {
    const long = '这里错了'.padEnd(MAX_CORRECTION_LENGTH + 10, '，补充说明')
    expect(detectCorrection(long)).toBeUndefined()
  })

  it('pattern list is non-empty and stable', () => {
    expect(CORRECTION_PATTERNS.length).toBeGreaterThan(10)
  })
})
