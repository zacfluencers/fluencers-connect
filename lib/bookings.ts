import type { BookingStatus, UserRole } from "@/lib/types";

/** Matches the DB check constraint in 0001_init.sql. */
export const MAX_REVISIONS = 3;

export type BookingAction =
  | "accept"
  | "decline"
  | "start"
  | "submit"
  | "approve"
  | "request_revision"
  // Backward steps (creator-initiated, never cross the money boundary).
  | "unaccept"
  | "revert_to_accepted"
  | "withdraw";

export interface Transition {
  action: BookingAction;
  /** Which role is allowed to perform this transition. */
  actor: UserRole;
  /** Status the booking moves to. */
  to: BookingStatus;
  label: string;
  intent: "primary" | "danger" | "default";
}

/**
 * The booking state machine. Single source of truth for who can do what and
 * where each action leads. Enforced in the server actions (lib altitude data,
 * app altitude rules) on top of RLS.
 *
 *   requested → accepted → in_progress → in_review → completed
 *   requested → declined            (creator rejects)
 *   in_review → in_progress         (brand asks for a revision, max 3)
 *
 * The forward chain also has matching backward steps so either party can move
 * between stages while a booking is live. Backward steps are creator-initiated
 * and never cross the money boundary — Approve (releases escrow) and Decline
 * (refunds) are final, so `completed` / `declined` / `refunded` can't be undone.
 */
export const TRANSITIONS: Record<BookingStatus, Transition[]> = {
  requested: [
    { action: "accept", actor: "creator", to: "accepted", label: "Accept request", intent: "primary" },
    { action: "decline", actor: "creator", to: "declined", label: "Decline", intent: "danger" },
  ],
  accepted: [
    { action: "start", actor: "creator", to: "in_progress", label: "Start work", intent: "primary" },
    { action: "unaccept", actor: "creator", to: "requested", label: "Back to request", intent: "default" },
  ],
  in_progress: [
    { action: "submit", actor: "creator", to: "in_review", label: "Submit for review", intent: "primary" },
    { action: "revert_to_accepted", actor: "creator", to: "accepted", label: "Back a step", intent: "default" },
  ],
  in_review: [
    { action: "approve", actor: "brand", to: "completed", label: "Approve & complete", intent: "primary" },
    { action: "request_revision", actor: "brand", to: "in_progress", label: "Request revision", intent: "default" },
    { action: "withdraw", actor: "creator", to: "in_progress", label: "Withdraw submission", intent: "default" },
  ],
  completed: [],
  declined: [],
  refunded: [],
};

/** Transitions a given role may perform from a given status, with revision cap applied. */
export function availableActions(
  status: BookingStatus,
  role: UserRole,
  revisionCount: number,
): Transition[] {
  return TRANSITIONS[status].filter((t) => {
    if (t.actor !== role) return false;
    if (t.action === "request_revision" && revisionCount >= MAX_REVISIONS) {
      return false;
    }
    return true;
  });
}

/** Look up a single transition by status + action (used to validate in the server action). */
export function findTransition(
  status: BookingStatus,
  action: BookingAction,
): Transition | undefined {
  return TRANSITIONS[status].find((t) => t.action === action);
}

export const STATUS_META: Record<
  BookingStatus,
  { label: string; tone: "neutral" | "info" | "warn" | "success" | "danger" }
> = {
  requested: { label: "Requested", tone: "info" },
  declined: { label: "Declined", tone: "danger" },
  accepted: { label: "Accepted", tone: "info" },
  in_progress: { label: "In progress", tone: "warn" },
  in_review: { label: "In review", tone: "warn" },
  completed: { label: "Completed", tone: "success" },
  refunded: { label: "Refunded", tone: "neutral" },
};

/** Ordered steps for a simple progress indicator (excludes the off-path states). */
export const FLOW_STEPS: BookingStatus[] = [
  "requested",
  "accepted",
  "in_progress",
  "in_review",
  "completed",
];
