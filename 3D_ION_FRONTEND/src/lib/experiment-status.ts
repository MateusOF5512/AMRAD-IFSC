export type ExperimentStatus = 'Submitted' | 'Revisions' | 'Review' | 'Approved'

export interface ExperimentStatusCounts {
  submitted: number
  revisions: number
  review: number
  approved: number
}

export const EMPTY_STATUS_COUNTS: ExperimentStatusCounts = {
  submitted: 0,
  revisions: 0,
  review: 0,
  approved: 0,
}

export function normalizeExperimentStatus(status?: string): ExperimentStatus {
  if (status === 'Revisions' || status === 'Review' || status === 'Approved') {
    return status
  }
  return 'Submitted'
}

export function countExperimentsByStatus(
  experiments: { status?: string }[]
): ExperimentStatusCounts {
  const counts: ExperimentStatusCounts = { ...EMPTY_STATUS_COUNTS }
  for (const experiment of experiments) {
    const status = normalizeExperimentStatus(experiment.status)
    if (status === 'Submitted') counts.submitted++
    else if (status === 'Revisions') counts.revisions++
    else if (status === 'Review') counts.review++
    else counts.approved++
  }
  return counts
}

export function countInAnalysis(counts: ExperimentStatusCounts): number {
  return counts.submitted + counts.revisions + counts.review
}

export function isExperimentInAnalysis(status?: string): boolean {
  return normalizeExperimentStatus(status) !== 'Approved'
}

export function isExperimentApproved(status?: string): boolean {
  return normalizeExperimentStatus(status) === 'Approved'
}
