import * as z from "zod";

export function isValidZ(schema: z.ZodTypeAny, data: unknown): any {
  const result = schema.safeParse(data);
  const myResp = {
    success: result.success,
    error: null as z.ZodFlattenedError<any> | null,
    data: result.success ? result.data : null,
  };
  if (!result.success) {
    myResp.error = z.flattenError(result.error);
  }

  return myResp;
}

export const uuidSchema = z.uuid("Invalid UUID format");
export type T_UUID = z.infer<typeof uuidSchema>;
