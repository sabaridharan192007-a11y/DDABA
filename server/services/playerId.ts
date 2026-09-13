import { randomInt } from "crypto";
import { playerStorage } from "../storage";

/**
 * Player IDs are opaque, server-generated credentials. The database unique
 * constraint remains the final authority if two requests race.
 */
export async function generateUniquePlayerId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `DDABA-${new Date().getFullYear()}-${randomInt(100000, 1000000)}`;
    if (!(await playerStorage.findByPlayerId(candidate))) return candidate;
  }
  throw new Error("Unable to generate a unique player ID.");
}
