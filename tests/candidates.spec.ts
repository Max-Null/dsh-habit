import { describe, expect, it } from 'vitest'
import { addCandidate, pendingCandidates, settleCandidate } from '../src/candidates.ts'

function sample(habit: string, confidence: 'high' | 'medium' | 'low' = 'high') {
  return { habit, confidence, evidenceCount: 3, evidence: ['证据1', '证据2'] }
}

describe('addCandidate', () => {
  it('adds with generated identity and pending status', () => {
    const [list, added] = addCandidate([], sample('用户每次提交前要求二次审查'))
    expect(added).toBe(true)
    expect(list).toHaveLength(1)
    expect(list[0]!.id).toMatch(/^cand-/)
    expect(list[0]!.status).toBe('pending')
    expect(typeof list[0]!.createdAt).toBe('number')
  })

  it('skips semantic duplicates (same habit text, non-discarded)', () => {
    const [first] = addCandidate([], sample('习惯A'))
    const [second, added] = addCandidate(first, sample('习惯A'))
    expect(added).toBe(false)
    expect(second).toHaveLength(1)
  })

  it('allows re-adding after discard', () => {
    const [first] = addCandidate([], sample('习惯A'))
    const discarded = settleCandidate(first, first[0]!.id, 'discarded')
    const [, added] = addCandidate(discarded, sample('习惯A'))
    expect(added).toBe(true)
  })
})

describe('settleCandidate', () => {
  it('confirms and discards by id', () => {
    const [first] = addCandidate([], sample('习惯A'))
    const id = first[0]!.id
    expect(settleCandidate(first, id, 'confirmed')[0]!.status).toBe('confirmed')
    expect(settleCandidate(first, id, 'discarded')[0]!.status).toBe('discarded')
  })

  it('returns the list unchanged for an unknown id', () => {
    const [first] = addCandidate([], sample('习惯A'))
    expect(settleCandidate(first, 'nope', 'confirmed')).toEqual(first)
  })
})

describe('pendingCandidates', () => {
  it('filters to pending only', () => {
    const [a] = addCandidate([], sample('A'))
    const [b] = addCandidate(a, sample('B'))
    const settled = settleCandidate(b, b[0]!.id, 'confirmed')
    expect(pendingCandidates(settled).map(c => c.habit)).toEqual(['B'])
  })
})
