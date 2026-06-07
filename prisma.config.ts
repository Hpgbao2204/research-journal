import path from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 configuration.
 *
 * In Prisma 7 the datasource connection URL is no longer declared in
 * `schema.prisma`; it is provided here (or via a runtime adapter). The seed
 * command also moves here from the deprecated `prisma` key in package.json.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
