import { eq } from "drizzle-orm";
import { Context } from "hono";
import { validator } from "hono/validator";

import { getBaseRoute } from "./base"; // Importing the base route function
import { Environment } from "../../bindings"; // Importing the Environment type for type safety
import { initDbConnect } from "../db/index";
import { meal as mealTable, mealDish as mealDishTable } from "../db/schema"; // Importing the meal table schema

import { isValidZ } from "#schema"; // Importing the validation utility
import { createMealSchema, T_CreateMeal } from "#schema/meals"; // Importing the meal schema for validation

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

  return ctx.json({
    meals: allMeals,
  });
});

mealRoute.post(
  "/",
  validator("json", (value, c) => {
    const parsed = isValidZ(createMealSchema, value);
    if (!parsed.success) {
      return c.json(parsed.error, 400);
    }
    return parsed.data;
  }),
  async (ctx) => {
    const db = initDbConnect(ctx.env.APP_DB);
    const newMeal: T_CreateMeal = ctx.req.valid("json")!;

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

export default mealRoute;
