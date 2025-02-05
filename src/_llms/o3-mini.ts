import { openai } from "@ai-sdk/openai"
import { ToolCallingLLM } from "src/prototypes/llm"
import { LLMType } from "../registry/llm/types"

export const O3Mini = new ToolCallingLLM({
    model: openai(LLMType.O3Mini),
    name: LLMType.O3Mini
})