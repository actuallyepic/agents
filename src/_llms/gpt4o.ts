import { openai } from "@ai-sdk/openai"
import { ToolCallingLLM } from "src/prototypes/llm"
import { LLMType } from "../registry/llm/types"

export const Gpt4o = new ToolCallingLLM({
    model: openai(LLMType.GPT4o),
    name: LLMType.GPT4o
})