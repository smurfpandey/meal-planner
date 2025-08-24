import { Hono, Context } from "hono";
import { eq } from "drizzle-orm";

import { Environment } from "../../bindings";
import { initDbConnect } from "../db/index";
import { user, family, familyMember } from "../db/schema"; // Importing the meal table schema
import {
  createAppToken,
  verifyAuth0Token,
  getAuth0User,
  verifyAppToken,
} from "../utils/auth";

type NewUser = typeof user.$inferInsert;
type NewFamily = typeof family.$inferInsert;
type FamilyMember = typeof familyMember.$inferSelect;

const authRoute = new Hono<Environment>().basePath("/auth");

// Login via Auth0 Token
// Endpoint: POST /login
authRoute.post("/login", async (c: Context<Environment>) => {
  const auth0_access_token = c.req.header("Authorization")?.split(" ")[1];
  const auth0Audience = c.env.AUTH_AUDIENCE;
  const auth0Domain = c.env.AUTH0_DOMAIN;

  if (!auth0_access_token) {
    return c.json(
      {
        message: "Auth0 access token is required",
      },
      400,
    );
  }

  try {
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
  } catch (error) {
    console.debug("Error verifying Auth0 access token:", error);
    return c.json(
      {
        message: "Token verification failed. Please check your access token.",
      },
      401,
    );
  }

  const db = initDbConnect(c.env.APP_DB);

  // get user email from auth0 payload
  const auth0User = await getAuth0User(auth0_access_token, auth0Domain);

  // check if user exists in our database
  let dbUser = await db.query.user.findFirst({
    columns: {
      id: true,
      email: true,
    },
    where: eq(user.email, auth0User.email),
  });

  let isNewUser: boolean = false;
  let families: FamilyMember[] = [];
  if (!dbUser) {
    // If user does not exist, create a new user in the database
    const newUser: NewUser = {
      email: auth0User.email,
    };
    const createdUser = await db.insert(user).values(newUser).returning();

    dbUser = createdUser[0];
    isNewUser = true;
  } else {
    // get all family user is part of user
    families = await db.query.familyMember.findMany({
      where: eq(familyMember.user_id, dbUser.id),
    });
  }

  // Create JWT token for the user
  const jwtSecret = await c.env.JWT_SECRET.get();
  const jwtToken = await createAppToken(
    dbUser.id,
    dbUser.email,
    families.map((f) => f.family_id),
    jwtSecret,
    auth0Audience,
  );

  return c.json(
    {
      is_new: isNewUser,
      user: dbUser,
      access_token: jwtToken,
      families: families.map((f) => ({
        family_id: f.family_id,
      })),
    },
    200,
  );
});

// Validate App Token
// Endpoint: POST /validate
authRoute.post("/validate", async (c: Context<Environment>) => {
  const appAccessToken = c.req.header("Authorization")?.split(" ")[1];
  const jwtSecret = await c.env.JWT_SECRET.get();

  if (!appAccessToken) {
    return c.json(
      {
        message: "App access token is required",
      },
      400,
    );
  }

  try {
    const payload = await verifyAppToken(appAccessToken, jwtSecret);

    if (!payload || !payload.sub) {
      return c.json(
        {
          message: "Invalid app access token",
        },
        401,
      );
    }

    const resp = {
      user: {
        id: payload.sub,
        email: payload.email,
      },
      families: payload.families || [],
    };

    return c.json(resp, 200);
  } catch (error) {
    console.debug("Error validating app access token:", error);
    return c.json(
      {
        message: "Invalid app access token",
      },
      401,
    );
  }
});

export default authRoute;
