/**
 * 候选管理（纯函数，可单测）。
 * @module @max-null/dsh-habit/candidates
 */

import type { HabitCandidate } from './types.ts'

/**
 * 添加候选：语义重复（同习惯文本）跳过，返回是否新增。
 * @param candidates - 现有候选列表。
 * @param candidate - 新候选（不含 id/createdAt/status，由本函数填）。
 * @returns [新列表, 是否新增]。
 */
export function addCandidate(
  candidates: readonly HabitCandidate[],
  candidate: Omit<HabitCandidate, 'id' | 'status' | 'createdAt'>,
): [HabitCandidate[], boolean] {
  const duplicate = candidates.some(existing => existing.habit === candidate.habit && existing.status !== 'discarded')
  if (duplicate) return [[...candidates], false]
  const next: HabitCandidate = {
    ...candidate,
    id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    createdAt: Date.now(),
  }
  return [[...candidates, next], true]
}

/**
 * 确认/丢弃候选。
 * @param candidates - 现有候选列表。
 * @param id - 目标候选 id。
 * @param status - 目标状态（confirmed/discarded）。
 * @returns 更新后的列表；id 不存在时原样返回。
 */
export function settleCandidate(
  candidates: readonly HabitCandidate[],
  id: string,
  status: 'confirmed' | 'discarded',
): HabitCandidate[] {
  return candidates.map(candidate => candidate.id === id ? { ...candidate, status } : candidate)
}

/** 待确认候选（pending 状态）。 */
export function pendingCandidates(candidates: readonly HabitCandidate[]): HabitCandidate[] {
  return candidates.filter(candidate => candidate.status === 'pending')
}
