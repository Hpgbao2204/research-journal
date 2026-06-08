import path from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * In Prisma 7 the datasource connection URL is no longer declared in
 * `schema.prisma`; it is provided here (or via a runtime adapter). The seed
 * command also moves here from the deprecated `prisma` key in package.json.
 *
 * Prisma 7 also no longer auto-loads `.env` for CLI commands, so we load it
 * here using Node's built-in loader (Node >= 20.6). This keeps the project
 * self-contained (no dotenv dependency) and lets `prisma generate`,
 * `prisma migrate`, and `prisma db seed` resolve `DATABASE_URL` from `.env`.
 */
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(path.join(process.cwd(), ".env"));
  }
} catch {
  // No .env file present; rely on the ambient environment instead.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
