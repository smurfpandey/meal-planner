import { SQL, sql } from "drizzle-orm";
import {
  AnySQLiteColumn,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { v7 as uuidv7 } from "uuid";

// custom lower function
export function lower(email: AnySQLiteColumn): SQL {
  return sql`lower(${email})`;
}

const timestamps = {
  updated_at: text()
    .notNull()
    .default(sql`(current_timestamp)`),
  created_at: text()
    .notNull()
    .default(sql`(current_timestamp)`),
  deleted_at: text(),
};

export const user = sqliteTable("user", {
  id: text()
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  email: text().notNull().unique(),
  ...timestamps,
});

export const family = sqliteTable("family", {
  id: text()
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  name: text().notNull(),
  head_of_family: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const familyMember = sqliteTable("family_member", {
  id: text()
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  family_id: text()
    .notNull()
    .references(() => family.id, { onDelete: "cascade" }),
  user_id: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const dish = sqliteTable(
  "dish",
  {
    id: text()
      .$defaultFn(() => uuidv7())
      .primaryKey(),
    name: text().notNull(),
    description: text(),
    family_id: text()
      .notNull()
      .references(() => family.id, { onDelete: "cascade" }),
    created_by: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [unique("dish_per_family").on(lower(t.name), t.family_id)],
);

export const meal = sqliteTable("meal", {
  id: text()
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  name: text().notNull(),
  meal_time: text({ mode: "json" })
    .notNull()
    .$type<string[]>()
    .default(sql`(json_array())`),
  family_id: text()
    .notNull()
    .references(() => family.id, { onDelete: "cascade" }),
  created_by: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const mealDish = sqliteTable("meal_dish", {
  id: text()
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  meal_id: text()
    .notNull()
    .references(() => meal.id, { onDelete: "cascade" }),
  dish_id: text()
    .notNull()
    .references(() => dish.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const mealPlan = sqliteTable("meal_plan", {
  id: text()
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  family_id: text()
    .notNull()
    .references(() => family.id, { onDelete: "cascade" }),
  start_date: text().notNull(),
  end_date: text().notNull(),
  ...timestamps,
});

export const mealPlanDetail = sqliteTable("meal_plan_detail", {
  id: text()
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  meal_plan_id: text()
    .notNull()
    .references(() => mealPlan.id, { onDelete: "cascade" }),
  meal_id: text()
    .notNull()
    .references(() => meal.id, { onDelete: "cascade" }),
  meal_time: text({ enum: ["breakfast", "lunch", "dinner"] }).notNull(),
  weekday: text({
    enum: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
  }).notNull(),
  ...timestamps,
});
