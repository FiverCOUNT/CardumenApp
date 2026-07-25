import "dotenv/config";
import { defineConfig } from "prisma/config";

function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = encodeURIComponent(process.env.DB_USER || "");
  const password = encodeURIComponent(process.env.DB_PASSWORD || "");
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "3306";
  const name = process.env.DB_NAME || "";

  return `mysql://${user}:${password}@${host}:${port}/${name}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: buildDatabaseUrl(),
  },
});
