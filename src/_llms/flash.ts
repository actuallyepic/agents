import { google } from "@ai-sdk/google"
import { ToolCallingLLM } from "src/prototypes/llm"
import { LLMType } from "../registry/llm/types"

export const Flash = new ToolCallingLLM({
    model: google("gemini-2.0-flash-exp"),
    name: LLMType.Flash
})