import { jwtVerify, JWTVerifyResult, createRemoteJWKSet, SignJWT } from "jose";

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
export async function createJwtToken(
  userId: string,
  email: string,
  jwtSecret: string,
  auth0Audience: string,
): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);
  const alg = "HS256";
  const jwt = await new SignJWT({
    email: email,
  })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setIssuer("urn:example:issuer")
    .setAudience(auth0Audience)
    .setExpirationTime("24h")
    .setSubject(userId)
    .sign(secret);

  return jwt; // In a real application, you would sign the JWT with the secret
}
