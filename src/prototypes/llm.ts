import { generateText, tool, LanguageModelV1, CoreTool, GenerateTextResult, FinishReason } from "ai";
import { Tool } from "./tool";
import { Message, AgentInput, ModelResponse, ToolCallResult } from "../types/model-response";

export abstract class LLM<T extends string = string> {
    model: LanguageModelV1;
    name: T;

    constructor({ model, name }: { model: LanguageModelV1; name: T }) {
        this.model = model;
        this.name = name;
    }

    protected createToolCall({ tools: inputTools }: { tools: Tool<any, any, any>[] }) {
        const toolCallsObject: Record<string, CoreTool<any, any>> = {};
        inputTools.forEach((inputTool) => {
            toolCallsObject[inputTool.name] = tool({
                description: inputTool.description,
                parameters: inputTool.functionParameters,
            });
        });
        return toolCallsObject;
    }

    protected async generateText({
        system,
        input,
        tools,
        messages: messagesIn,
        temperature = 0.7,
    }: {
        system?: string;
        input: AgentInput;
        tools?: Tool<any, any, any>[];
        messages?: Message[];
        temperature?: number;
    }): Promise<ModelResponse> {
        const messages = messagesIn ?? [];

        if (Array.isArray(input)) {
            // First, add all tool results
            const toolResults: ToolCallResult[] = [];
            input.forEach((single) => {
                if (typeof single !== "string") {
                    toolResults.push(single.toolCallResult);
                }
            });
            
            // Add combined tool results as a single message if there are any
            if (toolResults.length > 0) {
                messages.push({
                    role: "tool",
                    content: toolResults,
                });
            }

            // Then add all user messages
            input.forEach((single) => {
                if (typeof single === "string") {
                    messages.push({
                        role: "user",
                        content: single,
                    });
                }
            });
        } else {
            messages.push({
                role: "user",
                content: input,
            });
        }

        const result = await generateText({
            model: this.model,
            ...(system !== "" && system !== undefined ? { system } : {}),
            temperature,
            //@ts-ignore
            messages,
            ...(tools !== undefined ? { tools: this.createToolCall({ tools }) } : {}),
        });

        messages.push(...result.response.messages);

        switch (result.finishReason) {
            case "tool-calls":
                return {
                    finishReason: "tool-calls",
                    metadata: [
                        {
                            model: this.model.modelId,
                            temperature,
                            usage: result.usage,
                        },
                    ],
                    messages,
                    toolCalls: result.toolCalls,
                };
            default:
                return {
                    finishReason: result.finishReason,
                    metadata: [
                        {
                            model: this.model.modelId,
                            temperature,
                            usage: result.usage,
                        },
                    ],
                    messages,
                    text: result.text,
                };
        }
    }

    abstract call({ instructions, prompt, tools, messages }: { instructions: string; prompt: string; tools: Tool<any, any, any>[]; messages?: Message[] }): Promise<ModelResponse>;
}

export class ToolCallingLLM<T extends string> extends LLM<T> {
    private _promptRetriever: (system: string, prompt: string) => { system?: string; prompt: string };

    constructor({ model, name, promptRetriever }: { model: LanguageModelV1; name: T; promptRetriever?: (system: string, prompt: string) => { system?: string; prompt: string } }) {
        super({ model, name });
        this._promptRetriever = promptRetriever ?? ((system, prompt) => ({ system, prompt }));
    }

    async call({ instructions, prompt: input, tools, messages, temperature }: { instructions: string; prompt: AgentInput; tools: Tool<any, any>[]; messages?: Message[]; temperature?: number }) {
        // If the prompt is a string, we can use the promptRetriever to get the system and prompt - otherwise, we should use it to check if we need the system prompt
        const { system, prompt } = this._promptRetriever(instructions, typeof input === "string" ? input : "");

        // Always pass the system propmt and - if it was a string - pass the built prompt - and if it was a tool call - pass the tool call
        const result = await this.generateText({ system, input: typeof input === "string" ? prompt : input, tools, messages, temperature });
        return result;
    }
}

export class NonToolCallingLLM<T extends string> extends LLM<T> {
    private _toolModel: LLM<any>;
    private _processToolIntoPrompt: ({ tools, instructions, prompt }: { tools: Tool<any, any, any>[]; instructions: string; prompt: string }) => {
        system?: string;
        prompt: string;
    };

    constructor({
        nonToolModel,
        toolModel,
        name,
        processToolIntoPrompt,
    }: {
        nonToolModel: LanguageModelV1;
        name: T;
        toolModel: LLM<any>;
        processToolIntoPrompt: ({ tools, instructions, prompt }: { tools: Tool<any, any, any>[]; instructions: string; prompt: string }) => { system?: string; prompt: string };
    }) {
        super({ model: nonToolModel, name });
        this._toolModel = toolModel;
        this._processToolIntoPrompt = processToolIntoPrompt;
    }

    async call({ instructions, prompt: input, tools, messages, temperature }: { instructions: string; prompt: AgentInput; tools: Tool<any, any>[]; messages?: Message[]; temperature?: number }) {
        // If the prompt is a string, we should process the tool into the prompt - otherwise, we should use it to check if we need the system prompt
        const { system, prompt } = this._processToolIntoPrompt({ tools, instructions, prompt: typeof input === "string" ? input : "" });

        // Generate the text - if it's a string, we should pass the built prompt - and if it's a tool call - pass the tool call
        const result = await this.generateText({ system, input, messages, temperature });

        // If the result was not a finished response, we should return it (likely an error)
        if (result.finishReason !== "stop") {
            return result;
        }

        // Otherwise, we should use the tool model to get a tool call response
        let toolCallResponse: ModelResponse;
        toolCallResponse = await this._toolModel.call({ instructions, prompt: result.text, tools, messages });

        switch (toolCallResponse.finishReason) {
            case "tool-calls":
                return {
                    finishReason: toolCallResponse.finishReason,
                    messages: [...result.messages, ...toolCallResponse.messages],
                    metadata: [...result.metadata, ...toolCallResponse.metadata],
                    toolCalls: [...toolCallResponse.toolCalls],
                };
            default:
                return {
                    finishReason: result.finishReason,
                    messages: [...result.messages, ...toolCallResponse.messages],
                    metadata: [...result.metadata, ...toolCallResponse.metadata],
                    text: toolCallResponse.text,
                };
        }
    }
}
