# `@dubdubdublabs/agent-sdk`

An SDK for quickly prototyping traditional (while loop w/ tools) agents. 

```ts
import { Agent, Tool } from "../src";
import { z } from "zod";

const tool1 = new Tool({
    name: "START",
    toolConfigOptionsSchema: z.object({
        startRange: z.number(),
        endRange: z.number(),
    }),
    toolConfigOptions: {
        startRange: 10,
        endRange: 100,
    },
    description: ({ startRange, endRange })=> `Provide a random number between ${startRange} and ${endRange}`,
    toolParameters: z.object({
        randomNumber: z.number(),
    }),
    type: "tool",
    resultSchema: z.object({
        toolOutput: z.string(),
    }),
    execute: async ({ toolParameters, toolConfigOptions, spawnAgent }) => {
        return { toolOutput: `Hello, ${toolParameters.randomNumber}!` };
    },
});

const agent = Agent.create({
    name: "simple",
    models: ["gpt-4o"],
    defaultModel: "gpt-4o",
    availableTools: [tool1.configure({ toolConfigOptions: { startRange: 100, endRange: 1000 } })],
    instructions: "Call the start tool",
});
