import type { MiddlewareHandler } from "hono";
import {
  jwtVerify,
  JWTVerifyResult,
  createRemoteJWKSet,
  SignJWT,
  JWTPayload,
} from "jose";

const APP_JWT_ISSUER = "urn:meal.guide:issuer";
const APP_JWT_AUDIENCE = "https://api.meal.guide";

// Method to verify Auth0 access token and return user data
export async function verifyAuth0Token(
  token: string,
  auth0Audience: string,
  auth0Domain: string,
): Promise<JWTVerifyResult["payload"]> {
  const JWKS = createRemoteJWKSet(
    new URL(`https://${auth0Domain}/.well-known/jwks.json`),
  );

  const { payload }: JWTVerifyResult = await jwtVerify(token, JWKS, {
    audience: auth0Audience,
    issuer: `https://${auth0Domain}/`,
  });

  return payload;
}

export async function getAuth0User(
  token: string,
  auth0Domain: string,
): Promise<any> {
  const apiUrl = `https://${auth0Domain}/userinfo`;
  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user info from Auth0");
  }
  const userData = await response.json();
  return userData;
}

// Method to create new JWT token for the user
export async function createAppToken(
  userId: string,
  email: string,
  arrFamilyIds: string[],
  jwtSecret: string,
  auth0Audience: string,
): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);
  const alg = "HS256";
  const jwt = await new SignJWT({
    email: email,
    families: arrFamilyIds,
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setIssuer(APP_JWT_ISSUER)
    .setAudience(auth0Audience)
    .setExpirationTime("24h")
    .setSubject(userId)
    .sign(secret);

  return jwt; // In a real application, you would sign the JWT with the secret
}

export async function verifyAppToken(
  token: string,
  jwtSecret: string,
): Promise<JWTPayload> {
  const secret = new TextEncoder().encode(jwtSecret);
  const { payload }: JWTVerifyResult = await jwtVerify(token, secret, {
    issuer: APP_JWT_ISSUER,
    audience: APP_JWT_AUDIENCE,
  });

  return payload; // Return the decoded payload
}

export function validateAppTokenMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const appAccessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!appAccessToken) {
      return c.json(
        {
          message: "App access token is required",
        },
        401,
      );
    }

    const jwtSecret = await c.env.JWT_SECRET.get();
    try {
      const payload: JWTPayload = await verifyAppToken(
        appAccessToken,
        jwtSecret,
      );

      if (!payload || !payload.sub) {
        return c.json(
          {
            message: "Invalid app access token",
          },
          401,
        );
      }

      c.set("auth-user", payload);

      await next();
    } catch (error) {
      return c.json(
        {
          message: "Invalid app access token",
        },
        401,
      );
    }
  };
}
