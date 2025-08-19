import { Hono, Context } from "hono";
import { eq } from "drizzle-orm";

import { Environment } from "../../bindings"; // Importing the Environment type for type safety
import { initDbConnect } from "../db/index";
import { user, family } from "../db/schema"; // Importing the meal table schema
import { createJwtToken, verifyAuth0Token, getAuth0User } from "../utils/auth";
import { access } from "fs";

type NewUser = typeof user.$inferInsert;
type NewFamily = typeof family.$inferInsert;

const userRoute = new Hono<Environment>().basePath("/users");

// Endpoint: POST /login
// This endpoint is used to log in a user by checking their auth0 access token.
// If user email exists in our database, it returns the user data. If not, it creates a new user in the database and returns the newly created user data.
// Also check if the user is part of a family, and send family detail.
userRoute.post("/login", async (c: Context<Environment>) => {
  const db = initDbConnect(c.env.APP_DB);

  const { auth0_access_token } = await c.req.json();
  const auth0Audience = c.env.AUTH0_AUDIENCE;
  const auth0Domain = c.env.AUTH0_DOMAIN;

  const auth0Payload = await verifyAuth0Token(
    auth0_access_token,
    auth0Audience,
    auth0Domain,
  );

  if (!auth0Payload.sub) {
    return c.json(
      {
        message: "Invalid Auth0 access token",
      },
      401,
    );
  }

  // get user email from auth0 payload
  const auth0User = await getAuth0User(auth0_access_token, auth0Domain);

  // check if user exists in our database
  let existingUser = await db.query.user.findFirst({
    where: eq(user.email, auth0User.email),
  });

  let dbUser;
  let isNewUser = false;
  if (!existingUser) {
    // If user does not exist, create a new user in the database
    const newUser: NewUser = {
      email: auth0User.email,
    };
    const createdUser = await db.insert(user).values(newUser).returning();
    existingUser = createdUser[0];
    dbUser = createdUser[0];
    isNewUser = true;
  } else {
    dbUser = existingUser;
  }

  // Create JWT token for the user
  const jwtSecret = await c.env.JWT_SECRET.get();
  const jwtToken = await createJwtToken(
    existingUser.id,
    existingUser.email,
    jwtSecret,
    auth0Audience,
  );

  return c.json(
    {
      is_new: isNewUser,
      user: dbUser,
      access_token: jwtToken,
    },
    200,
  );
});

export default userRoute;
