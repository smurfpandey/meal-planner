import { Hono } from "hono";

import { Environment } from "../../bindings";
import { validateAppTokenMiddleware } from "../utils/auth";

export function getBaseRoute(routePath: string, isProtected: boolean) {
  const baseRoute = new Hono<Environment>().basePath(routePath);

  if (isProtected) {
    baseRoute.use(validateAppTokenMiddleware());
  }

  return baseRoute;
}
