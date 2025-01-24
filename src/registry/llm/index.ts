import { LLM } from "../../prototypes/llm"
import { LLMType } from "./types";
import { Gpt4o } from "../../_llms/gpt4o";
import { Gpt4oMini } from "../../_llms/gpt4o-mini";
import { Sonnet35 } from "../../_llms/sonnet-35";
import { O1 } from "../../_llms/o1";
import { O1Mini } from "../../_llms/o1-mini";


export const LLMRegistry = {
    [LLMType.GPT4o]: Gpt4o,
    [LLMType.GPT4oMini]: Gpt4oMini,
    [LLMType.Claude35Sonnet]: Sonnet35,
    [LLMType.O1]: O1,
    [LLMType.O1Mini]: O1Mini
} as const satisfies Record<LLMType, LLM>
export type LLMRegistry = typeof LLMRegistry
