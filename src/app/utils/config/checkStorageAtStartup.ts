import { config } from "./index";

/**
 * The startup check src/instrumentation.ts runs (Node.js runtime only —
 * kept in its own file so the Edge bundle never sees process.exit):
 * parses the storage settings once and, on a bad value, prints why and
 * exits. A throw instead would only make Next log "Failed to prepare
 * server" and keep a server running that can't serve anything.
 */
export function checkStorageAtStartup() {
  try {
    void config.storage; // parses (and throws on a bad value) once
  } catch (error) {
    console.error(
      `[startup] Storage settings: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
