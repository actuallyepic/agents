import { Agent, Tool } from "../src";
import { z } from "zod";

// define your tools
const tool1 = new Tool({
    // unique tool identifier
    type: "simple_tool",

    // name of the tool, passed to the model
    name: "START",

    // schema for the tool config options that let you override specific tool behaviors (like description, how it executes, etc...)
    toolConfigOptionsSchema: z.object({
        startRange: z.number(),
        endRange: z.number(),
    }),

    // default config options for the tool
    toolConfigOptions: {
        startRange: 10,
        endRange: 100,
    },

    // description of the tool, passed to the model
    description: ({ startRange, endRange }) => `Provide a random number between ${startRange} and ${endRange}`,

    // schema for the tool parameters, passed to the model
    toolParameters: z.object({
        randomNumber: z.number(),
    }),

    // schema for the tool execute function return value
    resultSchema: z.object({
        toolOutput: z.string(),
    }),

    // the tool execute function
    execute: async ({ toolParameters, toolConfigOptions, spawnAgent }) => {
        return { toolOutput: `Hello, ${toolParameters.randomNumber}!` };
    },
});

// create your agent
const agent = Agent.create({
    name: "simple",
    models: ["gpt-4o"], // models available to the agent (can be narrowed at execution)
    defaultModel: "gpt-4o", // default model to use
    availableTools: [tool1.configure({ toolConfigOptions: { startRange: 100, endRange: 1000 } })], // available tools for the agent (can be narrowed at execution)
    /**
    instructions: [{
        tool: "simple_tool", // OPTIONAL: if you want to specify instructions tied to tools 
        models: ["gpt-4o"], // OPTIONAL: if you want to specify instructions tied to models
        content: "Call the start tool", // instruction content 
    }],
     */
    instructions: "Call the start tool",
    // instructions for the agent (can be a string or a more complex object based on what tools are chosed)
});

// you can execute the full agent loop
await agent.executeLoop({
    input: "Call the start tool",
});

// or you can execute a single step and control the loop yourself
await agent.execute({
    input: "Call the start tool",
    model: "gpt-4o", // optionally override model choice
    tools: ["simple_tool"], // optionally override available tools
    messages: [], // optionally override messages
});
