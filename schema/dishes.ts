import * as z from "zod";

const createDishSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
const updateDishSchema = z.object({
  id: z.uuid("Invalid ID"),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
});
