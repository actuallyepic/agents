import { LLMRegistry } from ".";
import { LLMType } from "./types";


export class AccessLLM {
    static getLLM<T extends LLMType>(llmType: T): LLMRegistry[T] {
        return LLMRegistry[llmType];
    }
}