import { zValidator as honoZValidator } from '@hono/zod-validator';

export const zValidator = (target: any, schema: any) =>
  honoZValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          ok: false,
          errors: result.error.flatten().fieldErrors,
        },
        400
      );
    }
  });
