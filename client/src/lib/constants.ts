export const CATEGORIES = [
  "UNDER_8", "UNDER_10", "UNDER_12", "UNDER_14", "UNDER_17", "UNDER_19", "ABOVE_19",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  UNDER_8: "Under 8",
  UNDER_10: "Under 10",
  UNDER_12: "Under 12",
  UNDER_14: "Under 14",
  UNDER_17: "Under 17",
  UNDER_19: "Under 19",
  ABOVE_19: "Above 19",
};

export const DISCIPLINES = ["AEROSKATOBALL", "SPEED", "ZIG_ZAG", "HUDDLES", "SKATE_WALK"] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const DISCIPLINE_LABELS: Record<string, string> = {
  AEROSKATOBALL: "Aeroskatoball",
  SPEED: "Speed",
  ZIG_ZAG: "Zig Zag",
  HUDDLES: "Huddles",
  SKATE_WALK: "Skate Walk",
};

// Dindigul district taluks/areas — editable demo values.
export const AREAS = [
  "Dindigul", "Palani", "Oddanchatram", "Vedasandur", "Nilakottai",
  "Natham", "Kodaikanal", "Athoor", "Gujiliamparai", "Vadamadurai",
] as const;

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Approval",
  VERIFIED: "Accepted",
  REJECTED: "Rejected",
};
