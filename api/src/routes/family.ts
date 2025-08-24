import { Hono, Context } from "hono";

import { Environment } from "../../bindings"; // Importing the Environment type for type safety
import { initDbConnect } from "../db/index";
import { family, familyMember } from "../db/schema"; // Importing the meal table schema
import { validateAppTokenMiddleware } from "../utils/auth"; // Importing the authentication middleware

type NewFamily = typeof family.$inferInsert;

type CreateFamilyRequest = {
  name: string;
  members: string[];
};

const familyRoute = new Hono<Environment>().basePath("/families");
familyRoute.use(validateAppTokenMiddleware());

// Create a new family
familyRoute.post("/", async (c: Context<Environment>) => {
  const db = initDbConnect(c.env.APP_DB);
  let reqBody: CreateFamilyRequest;

  try {
    reqBody = await c.req.json();
  } catch (error) {
    return c.json({ message: "Invalid JSON Request" }, 400);
  }

  const userId = c.get("auth-user")?.sub;

  if (!userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  if (!reqBody.name) {
    return c.json({ message: "Family name is required" }, 400);
  }

  const newFamily: NewFamily = {
    name: reqBody.name,
    head_of_family: userId,
  };

  const createdFamily = await db.insert(family).values(newFamily).returning();

  // add self as member
  await db
    .insert(familyMember)
    .values({ family_id: createdFamily[0].id, user_id: userId });

  return c.json(createdFamily[0], 201);
});

export default familyRoute;
