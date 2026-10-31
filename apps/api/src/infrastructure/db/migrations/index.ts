import type { Migration } from "kysely/migration";
import * as m0001 from "./0001_initial_schema";
import * as m0002 from "./0002_oauth_accounts";
import * as m0003 from "./0003_email_verification";
import * as m0004 from "./0004_account_settings";

/** Static registry so migrations survive bundling. Append new ones in order. */
export const migrations: Record<string, Migration> = {
  "0001_initial_schema": m0001,
  "0002_oauth_accounts": m0002,
  "0003_email_verification": m0003,
  "0004_account_settings": m0004,
};
