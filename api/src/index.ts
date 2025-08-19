import { Hono } from "hono";

import { Environment } from "../bindings";

import mealRoute from "./routes/meal";
import dishRoute from "./routes/dish";
import userRoute from "./routes/user";

const app = new Hono<Environment>();

app.get("/", (c) => c.text("Hello Cloudflare Workers!"));

app.route("/", mealRoute);
app.route("/", dishRoute);
app.route("/", userRoute);

export default app;
