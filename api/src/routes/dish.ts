import { Hono, Context } from "hono";

import { Environment } from "../../bindings"; // Importing the Environment type for type safety
import { initDbConnect } from "../db/index";
import { dish as dishTable } from "../db/schema"; // Importing the meal table schema

type NewDish = typeof dishTable.$inferInsert;

const dishRoute = new Hono<Environment>().basePath("/dishes");

dishRoute.get("/", async (c: Context<Environment>) => {
  const db = initDbConnect(c.env.APP_DB);

  const allDishes = await db.select().from(dishTable).all();

  return c.json({
    dishes: allDishes,
  });
});

dishRoute.post("/", async (c: Context<Environment>) => {
  const db = initDbConnect(c.env.APP_DB);

  const newDish: NewDish = await c.req.json();

  const insertedDish = await db
    .insert(dishTable)
    .values(newDish)
    .returning()
    .get();

  return c.json(insertedDish, 201);
});

export default dishRoute;
