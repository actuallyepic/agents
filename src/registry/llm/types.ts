export const LLMType = {
    GPT4o: "gpt-4o",
    GPT4oMini: "gpt-4o-mini",
    Claude35Sonnet: "claude-35-sonnet",
    O1: "o1",
    O1Mini: "o1-mini",
    Flash: "flash",
    FlashThinking: "flash-thinking",
    O3Mini: "o3-mini"
} as const;
export type LLMType = (typeof LLMType)[keyof typeof LLMType];
