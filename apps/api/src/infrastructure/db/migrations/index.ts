import type { Migration } from "kysely/migration";
import * as m0001 from "./0001_initial_schema";
import * as m0002 from "./0002_oauth_accounts";

/** Static registry so migrations survive bundling. Append new ones in order. */
export const migrations: Record<string, Migration> = {
  "0001_initial_schema": m0001,
  "0002_oauth_accounts": m0002,
};
