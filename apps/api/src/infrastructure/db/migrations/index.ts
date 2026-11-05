import type { Migration } from "kysely/migration";
import * as m0001 from "./0001_initial_schema";
import * as m0002 from "./0002_oauth_accounts";
import * as m0003 from "./0003_email_verification";
import * as m0004 from "./0004_account_settings";
import * as m0005 from "./0005_learning_mode";
import * as m0006 from "./0006_notifications";
import * as m0007 from "./0007_last_login_ip";
import * as m0008 from "./0008_usernames_and_leagues";
import * as m0010 from "./0010_site_visits";
import * as m0011 from "./0011_league_opt_in_by_default";
import * as m0012 from "./0012_apple_refresh_tokens";

/** Static registry so migrations survive bundling. Append new ones in order. */
export const migrations: Record<string, Migration> = {
  "0001_initial_schema": m0001,
  "0002_oauth_accounts": m0002,
  "0003_email_verification": m0003,
  "0004_account_settings": m0004,
  "0005_learning_mode": m0005,
  "0006_notifications": m0006,
  "0007_last_login_ip": m0007,
  "0008_usernames_and_leagues": m0008,
  "0010_site_visits": m0010,
  "0011_league_opt_in_by_default": m0011,
  "0012_apple_refresh_tokens": m0012,
};
