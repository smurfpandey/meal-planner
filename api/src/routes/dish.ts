import { Hono, Context } from "hono";
import { and, eq, ne, sql } from "drizzle-orm";

import { Environment } from "../../bindings"; // Importing the Environment type for type safety
import { initDbConnect } from "../db/index";
import { dish as dishTable, lower } from "../db/schema"; // Importing the meal table schema
import { AppTokenPayload, validateAppTokenMiddleware } from "../utils/auth"; // Importing the authentication middleware

type NewDish = typeof dishTable.$inferInsert;

const dishRoute = new Hono<Environment>().basePath("/dishes");
dishRoute.use(validateAppTokenMiddleware());

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

  // validate request body
  if (!newDish.name || newDish.name.trim() === "") {
    return c.json({ message: "Dish name is required" }, 400);
  }
  if (newDish.description && newDish.description.length > 150) {
    return c.json(
      { message: "Description is too long. Maximum 150 characters allowed." },
      400,
    );
  }

  //

  const authUser: AppTokenPayload = c.get("auth-user");
  const userId: string = authUser.sub!;
  const familyId: string = authUser?.families?.[0];

  newDish.id = undefined; // let the database generate the id
  newDish.created_by = userId;
  newDish.family_id = familyId;

  // Make sure the dish name is unique within the family
  const existingDish = await db.query.dish.findFirst({
    columns: {
      id: true,
    },
    where: and(
      eq(lower(dishTable.name), newDish.name.toLocaleLowerCase()),
      eq(dishTable.family_id, familyId),
    ),
  });

  if (existingDish) {
    return c.json(
      {
        message:
          "A dish with the same name already exists. Please create a new dish.",
      },
      409,
    );
  }

  const insertedDish = await db
    .insert(dishTable)
    .values(newDish)
    .returning()
    .get();

  return c.json({ insertedDish, userId, familyId }, 201);
});

dishRoute.delete("/:dishId", async (c: Context<Environment>) => {
  const db = initDbConnect(c.env.APP_DB);
  const { dishId } = c.req.param();

  const authUser: AppTokenPayload = c.get("auth-user");
  const familyId: string = authUser?.families?.[0];

  // Check if the dish exists and belongs to the user's family
  const existingDish = await db.query.dish.findFirst({
    columns: {
      id: true,
    },
    where: and(eq(dishTable.id, dishId), eq(dishTable.family_id, familyId)),
  });

  if (!existingDish) {
    return c.json({ message: "Dish not found" }, 404);
  }

  await db.delete(dishTable).where(eq(dishTable.id, dishId));

  return c.json(204);
});

dishRoute.put("/:dishId", async (c: Context<Environment>) => {
  const db = initDbConnect(c.env.APP_DB);
  const { dishId } = c.req.param(); // Get dishId from URL parameters
  const updatedDish: NewDish = await c.req.json(); // Get updated dish data from request body
  const authUser: AppTokenPayload = c.get("auth-user");
  const userId: string = authUser.sub!;
  const familyId: string = authUser?.families?.[0];

  // Validate request body
  if (!updatedDish.name || updatedDish.name.trim() === "") {
    return c.json({ message: "Dish name is required" }, 400);
  }
  if (updatedDish.description && updatedDish.description.length > 150) {
    return c.json(
      { message: "Description is too long. Maximum 150 characters allowed." },
      400,
    );
  }

  // Check if the dish exists and belongs to the user's family
  const existingDish = await db.query.dish.findFirst({
    columns: {
      id: true,
    },
    where: and(eq(dishTable.id, dishId), eq(dishTable.family_id, familyId)),
  });

  if (!existingDish) {
    return c.json({ message: "Dish not found" }, 404);
  }

  // Make sure the updated dish name is unique within the family
  const duplicateDish = await db.query.dish.findFirst({
    columns: {
      id: true,
    },
    where: and(
      eq(lower(dishTable.name), updatedDish.name.toLocaleLowerCase()),
      eq(dishTable.family_id, familyId),
      // Exclude the current dish from the duplicate check
      ne(dishTable.id, dishId),
    ),
  });
  if (duplicateDish) {
    return c.json(
      {
        message:
          "A dish with the same name already exists. Please choose a different name.",
      },
      409,
    );
  }

  // Update the dish
  const dishToUpdate = {
    name: updatedDish.name,
    description: updatedDish.description,
    updated_at: sql`(current_timestamp)`,
  };
  const result = await db
    .update(dishTable)
    .set(dishToUpdate)
    .where(eq(dishTable.id, dishId))
    .returning()
    .get();
  return c.json({ dish: result });
});

export default dishRoute;
