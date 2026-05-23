const COMMON = new Set([
  "password", "passw0rd", "password1", "password123",
  "123456", "12345678", "123456789", "1234567890",
  "qwerty", "qwerty123", "letmein", "welcome", "admin",
  "iloveyou", "abc123", "monkey", "dragon", "football",
  "travidz", "travidz123",
]);

export type StrengthLevel = "weak" | "fair" | "good" | "strong";

export interface StrengthResult {
  score: 0 | 1 | 2 | 3;
  level: StrengthLevel;
  label: string;
  tip: string;
}

export function scorePassword(password: string, email?: string): StrengthResult {
  if (!password) {
    return { score: 0, level: "weak", label: "Too short", tip: "Use at least 10 characters." };
  }

  const lower = password.toLowerCase();
  const localPart = email?.split("@")[0]?.toLowerCase() ?? "";

  let points = 0;
  if (password.length >= 10) points += 1;
  if (password.length >= 14) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  if (COMMON.has(lower)) points -= 3;
  if (localPart.length >= 3 && lower.includes(localPart)) points -= 2;
  if (/^(.)\1+$/.test(password)) points -= 2; // all same char

  // Determine missing improvements for tip
  const tips: string[] = [];
  if (password.length < 10) tips.push("make it longer (10+ characters)");
  else if (password.length < 14) tips.push("make it longer for extra strength");
  if (!(/[a-z]/.test(password) && /[A-Z]/.test(password))) tips.push("mix upper and lower case");
  if (!/\d/.test(password)) tips.push("add a number");
  if (!/[^A-Za-z0-9]/.test(password)) tips.push("add a symbol");
  if (COMMON.has(lower)) tips.unshift("avoid common passwords");
  if (localPart.length >= 3 && lower.includes(localPart)) tips.unshift("don't include your email");

  let level: StrengthLevel;
  let score: 0 | 1 | 2 | 3;
  if (points <= 1) { level = "weak"; score = 0; }
  else if (points === 2) { level = "fair"; score = 1; }
  else if (points === 3) { level = "good"; score = 2; }
  else { level = "strong"; score = 3; }

  const label = level[0].toUpperCase() + level.slice(1);
  const tip = tips[0]
    ? `Try to ${tips[0]}.`
    : level === "strong"
      ? "Great password."
      : "Looking good.";

  return { score, level, label, tip };
}