import { Tool as ProcessTool } from "src/prototypes/tool";

import z from "zod";

export type ToolConfigByType<T extends { [key: string]: ProcessTool<any, any> }> = {
    [K in keyof T]?: T[K] extends ProcessTool<any>
        ? {
              name?: T[K]["name"];
              description?: T[K]["description"];
              toolOptions?: z.infer<T[K]["toolConfigOptionsSchema"]>;
          }
        : never;
};

export const SimpleToolConfigByTypeSchema = z.record(
    z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        toolOptions: z.any().optional(),
    }),
);