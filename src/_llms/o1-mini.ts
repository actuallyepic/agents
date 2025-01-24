import { openai } from "@ai-sdk/openai"
import { NonToolCallingLLM } from "src/prototypes/llm"
import { LLMType } from "../registry/llm/types"
import { Gpt4oMini } from "./gpt4o-mini"
import { zodToJsonSchema } from "zod-to-json-schema";

export const O1Mini = new NonToolCallingLLM({
    nonToolModel: openai(LLMType.O1Mini),
    toolModel: Gpt4oMini,
    name: LLMType.O1Mini,
    processToolIntoPrompt: ({ tools, instructions, prompt }) => ({
        system: "",
        prompt: `I was given the instructions: ${instructions}
    \n\n and need help resolving this question. 
    I have the following tools available to me, with instructions on how I can use them: ${tools.map(tool => { return `${tool.name}: ${tool.description} \n\n ${JSON.stringify(zodToJsonSchema(tool.functionParameters))}` }).join("\n")} \n\n ${prompt}, 
    Given the following input information, output what I should do next, given the tools I have. A valid answer is either how I should use the tool or that I do not need to use the tool, with an answer to my question.`
    })
})