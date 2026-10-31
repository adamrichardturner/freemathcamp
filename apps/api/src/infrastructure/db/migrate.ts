import { createKysely, createMigrator } from "./database";

/** CLI: `migrate up` applies pending migrations, `migrate down` reverts the latest. */
const main = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const db = createKysely(url);
  const migrator = createMigrator(db);
  const direction = process.argv[2] ?? "up";
  const { error, results } = direction === "down" ? await migrator.migrateDown() : await migrator.migrateToLatest();
  for (const r of results ?? []) console.log(`${r.status === "Success" ? "✓" : "✗"} ${r.direction} ${r.migrationName}`);
  if (!results?.length) console.log("Nothing to migrate.");
  await db.destroy();
  if (error) {
    console.error(error);
    process.exit(1);
  }
};

void main();
