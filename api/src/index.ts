import { Hono } from "hono";

import { Environment } from "../bindings";

import authRoute from "./routes/auth";
import mealRoute from "./routes/meal";
import dishRoute from "./routes/dish";
import familyRoute from "./routes/family";

const app = new Hono<Environment>();

app.get("/", (c) => c.text("Hello Cloudflare Workers!"));

app.route("/", authRoute); // /auth
app.route("/", mealRoute); // /meals
app.route("/", dishRoute); // /dishes
app.route("/", familyRoute); // /families

export default app;
