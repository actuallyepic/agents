import { ToolCallingLLM } from "src/prototypes/llm"
import { LLMType } from "../registry/llm/types"
import { anthropic } from "@ai-sdk/anthropic"

export const Sonnet35 = new ToolCallingLLM({
    model: anthropic(LLMType.Claude35Sonnet),
    name: LLMType.Claude35Sonnet
})