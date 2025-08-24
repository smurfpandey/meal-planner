import { Env } from "hono";
import { JWTPayload } from "jose";

interface Environment extends Env {
  Bindings: {
    APP_DB: D1Database;
    AUTH_AUDIENCE: string;
    AUTH0_DOMAIN: string;
    JWT_SECRET: SecretsStoreSecret;
  };
  Variables: {
    "auth-user"?: JWTPayload;
  };
}
