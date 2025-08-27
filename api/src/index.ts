import { Hono } from "hono";
import { cors } from "hono/cors";

import { Environment } from "../bindings";

import authRoute from "./routes/auth";
import mealRoute from "./routes/meal";
import dishRoute from "./routes/dish";
import familyRoute from "./routes/family";

const app = new Hono<Environment>();
app.use("/*", cors());

app.get("/", (c) => c.text("Hello Cloudflare Workers!"));

app.route("/", authRoute); // /auth
app.route("/", mealRoute); // /meals
app.route("/", dishRoute); // /dishes
app.route("/", familyRoute); // /families

export default app;
