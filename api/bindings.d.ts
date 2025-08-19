import { Env } from "hono";

type Environment = Env & {
  Bindings: {
    APP_DB: D1Database;
    AUTH0_AUDIENCE: string;
    AUTH0_DOMAIN: string;
    JWT_SECRET: SecretsStoreSecret;
  };
};
