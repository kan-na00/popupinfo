import { promises as fs } from "node:fs";
import path from "node:path";
import type { EventDataFile } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "events.json");

export async function loadEvents(): Promise<EventDataFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as EventDataFile;
    parsed.events = parsed.events ?? [];
    return parsed;
  } catch {
    return { updatedAt: new Date().toISOString(), events: [] };
  }
}
