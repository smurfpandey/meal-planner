import { Hono, Context } from "hono";

import { Environment } from "../../bindings"; // Importing the Environment type for type safety
import { initDbConnect } from "../db/index";
import { meal as mealTable } from "../db/schema"; // Importing the meal table schema

const mealRoute = new Hono<Environment>().basePath("/meals");

mealRoute.get("/", async (c: Context<Environment>) => {
  const db = initDbConnect(c.env.APP_DB);

  const allMeals = await db.select().from(mealTable).all();

  return c.json({
    meals: allMeals,
  });
});

export default mealRoute;
