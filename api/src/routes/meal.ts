import { eq } from "drizzle-orm";
import { BatchResponse } from "drizzle-orm/batch";
import { Context } from "hono";
import { validator } from "hono/validator";

import { getBaseRoute } from "./base"; // Importing the base route function
import { Environment } from "../../bindings"; // Importing the Environment type for type safety
import { initDbConnect } from "../db/index";
import { meal as mealTable, mealDish as mealDishTable } from "../db/schema"; // Importing the meal table schema

import { isValidZ, uuidSchema, T_UUID } from "#schema"; // Importing the validation utility
import { createOrUpdateMealSchema, T_CreateOrUpdateMeal } from "#schema/meals"; // Importing the meal schema for validation

type NewMeal = typeof mealTable.$inferInsert;
type Meal = typeof mealTable.$inferSelect;
type NewMealDish = typeof mealDishTable.$inferInsert;

const mealRoute = getBaseRoute("/meals", true); // Creating a base route for meals with authentication

mealRoute.get("/", async (ctx: Context<Environment>) => {
  const db = initDbConnect(ctx.env.APP_DB);

  const authUser = ctx.get("auth-user");
  const userId: string = authUser.sub;
  const familyId: string = authUser?.families?.[0];

  // get all meals with dishes for the family
  const allMeals = await db.query.meal.findMany({
    where: eq(mealTable.family_id, familyId),
    with: { dishes: { with: { dish: true } } },
  });

  // transform the result to include dishes directly in the meal object
  const mealsWithDishes = allMeals.map((meal) => ({
    ...meal,
    dishes: meal.dishes.map((md) => md.dish),
  }));

  return ctx.json({
    meals: mealsWithDishes,
  });
});

mealRoute.post(
  "/",
  validator("json", (value, c) => {
    const parsed = isValidZ(createOrUpdateMealSchema, value);
    if (!parsed.success) {
      return c.json(parsed.error, 400);
    }
    return parsed.data;
  }),
  async (ctx) => {
    const db = initDbConnect(ctx.env.APP_DB);
    const newMeal: T_CreateOrUpdateMeal = ctx.req.valid("json")!;

    // ensure we don't have another meal with same dish combination
    // #TODO: return meal name if found

    const authUser = ctx.get("auth-user");
    const userId: string = authUser.sub;
    const familyId: string = authUser?.families?.[0];

    const mealToInsert: NewMeal = {
      id: undefined, // let the database generate the id
      name: newMeal.name,
      family_id: familyId,
      created_by: userId,
    };

    // #TODO: figure out how to make this atmoic considering transactions are not supported in D1

    // create new meal
    // link dishes to meal in meal_dish table
    const insertedMeal: Meal = await db
      .insert(mealTable)
      .values(mealToInsert)
      .returning()
      .get();

    const newMealId: string = insertedMeal.id;

    // link dishes to meal in meal_dish table
    const mealDishesToInsert: NewMealDish[] = newMeal.dishes.map(
      (dishId: string) => ({
        meal_id: newMealId,
        dish_id: dishId,
      }),
    );

    await db.insert(mealDishTable).values(mealDishesToInsert);

    return ctx.json(insertedMeal, 201);
  },
);

mealRoute.put(
  "/:mealId",
  validator("param", (value, c) => {
    const parsed = isValidZ(uuidSchema, value.mealId);
    if (!parsed.success) {
      return c.json({ message: "Invalid Meal ID", detail: parsed.error }, 400);
    }
    return parsed.data;
  }),
  validator("json", (value, c) => {
    const parsed = isValidZ(createOrUpdateMealSchema, value);
    if (!parsed.success) {
      return c.json(parsed.error, 400);
    }
    return parsed.data;
  }),
  async (ctx) => {
    const db = initDbConnect(ctx.env.APP_DB);
    const mealId: T_UUID = ctx.req.valid("param");
    const updatedMeal: T_CreateOrUpdateMeal = ctx.req.valid("json")!;

    const authUser = ctx.get("auth-user");
    const userId: string = authUser.sub;
    const familyId: string = authUser?.families?.[0];

    // check if meal exists and belongs to the family
    const existingMeal = await db.query.meal.findFirst({
      where: eq(mealTable.id, mealId),
    });

    if (!existingMeal) {
      return ctx.json({ message: "Meal not found" }, 404);
    }

    if (existingMeal.family_id !== familyId) {
      return ctx.json(
        { message: "You do not have permission to update this meal" },
        403,
      );
    }

    // update meal name
    const mealToUpdate: Partial<NewMeal> = {
      name: updatedMeal.name,
    };

    const updatedMealRecord = await db
      .update(mealTable)
      .set(mealToUpdate)
      .where(eq(mealTable.id, mealId))
      .returning()
      .get();

    await db.delete(mealDishTable).where(eq(mealDishTable.meal_id, mealId));
    const mealDishesToInsert: NewMealDish[] = updatedMeal.dishes.map(
      (dishId: string) => ({
        meal_id: mealId,
        dish_id: dishId,
      }),
    );

    await db.insert(mealDishTable).values(mealDishesToInsert);

    return ctx.json(
      { message: "Meal updated successfully", meal: updatedMealRecord },
      200,
    );
  },
);

mealRoute.delete(
  "/:mealId",
  validator("param", (value, c) => {
    const parsed = isValidZ(uuidSchema, value.mealId);
    if (!parsed.success) {
      return c.json({ message: "Invalid Meal ID", detail: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (ctx) => {
    const db = initDbConnect(ctx.env.APP_DB);
    const mealId = ctx.req.valid("param");

    const authUser = ctx.get("auth-user");
    const userId: string = authUser.sub;
    const familyId: string = authUser?.families?.[0];

    // check if meal exists and belongs to the family
    const existingMeal = await db.query.meal.findFirst({
      where: eq(mealTable.id, mealId),
    });

    if (!existingMeal) {
      return ctx.json({ message: "Meal not found" }, 404);
    }

    if (existingMeal.family_id !== familyId) {
      return ctx.json(
        { message: "You do not have permission to delete this meal" },
        403,
      );
    }

    // delete meal
    await db.delete(mealTable).where(eq(mealTable.id, mealId));

    return ctx.json(204);
  },
);

export default mealRoute;
