/** Why a player reports a question (spec 4.9); matches the check in `question_reports`. */
export const REPORT_REASONS = ['wrong', 'unclear', 'outdated', 'too_hard', 'other'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]
