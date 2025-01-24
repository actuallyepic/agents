import { ToolCallingLLM } from "src/prototypes/llm"
import { LLMType } from "../registry/llm/types"
import { openai } from "@ai-sdk/openai"

export const Gpt4oMini = new ToolCallingLLM({
    model: openai(LLMType.GPT4oMini),
    name: LLMType.GPT4oMini
})
