import { openai } from "@ai-sdk/openai"
import { ToolCallingLLM } from "src/prototypes/llm"
import { LLMType } from "../registry/llm/types"
import { zodToJsonSchema } from "zod-to-json-schema"

export const O1 = new ToolCallingLLM({
    model: openai(LLMType.O1),
    name: LLMType.O1,
})