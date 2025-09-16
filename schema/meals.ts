import * as z from "zod";

export const createOrUpdateMealSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50, "Name must be at most 50 characters"),
  dishes: z
    .array(z.uuid())
    .min(1, "At least one dish is required")
    .max(5, "No more than 5 dishes allowed"),
});

export type T_CreateOrUpdateMeal = z.infer<typeof createOrUpdateMealSchema>;
