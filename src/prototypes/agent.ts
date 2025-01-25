import { Tool } from "./tool";
import { LLMType } from "../registry/llm/types";
import { SimpleToolConfigByTypeSchema, ToolConfigByType } from "../types/tool-config";
import { AccessLLM } from "src/registry/llm/access";
import { Message, AgentInput, ToolCallResultsWithMetadata, ModelReponseSchemaWithoutUsage } from "../types/model-response";
import { deepCopy } from "../utils/deepCopy";
import { z } from "zod";

type ToolsToMap<T extends readonly Tool<any, any>[]> = {
    [K in T[number] as K["type"]]: Extract<T[number], { type: K["type"] }>;
};

type ExtractPropertyFromTools<T extends Tool<any, any>[], K extends keyof T[number]> = T[number][K];
type Prompt<TOOLS extends Tool<any, any>[], MODELS extends LLMType[]> = {
    tool?: ExtractPropertyFromTools<TOOLS, "type">;
    models?: MODELS;
    content: string;
}[];

type ConstructorPrompt = string | Prompt<any, any>

export interface AgentProps<MODELS extends LLMType[] = [LLMType], AVAILABLE_TOOLS extends Tool<any, any>[] = []> {
    name: string;
    models: MODELS;
    defaultModel: MODELS[number];
    availableTools: AVAILABLE_TOOLS;
    instructions: ConstructorPrompt;
    agentConfigs?: AgentConfig<MODELS, AVAILABLE_TOOLS>;
    toolConfigs?: ToolConfigByType<ToolsToMap<AVAILABLE_TOOLS>>;
}

type AgentConfig<MODELS extends LLMType[] = [LLMType], AVAILABLE_TOOLS extends Tool<any, any>[] = []> = {
    model?: MODELS[number];
    availableTools?: ExtractPropertyFromTools<AVAILABLE_TOOLS, "type">[];
    temperature?: number;
};

const SimpleAgentConfigSchema = z.object({
    model: z.nativeEnum(LLMType).optional(),
    availableTools: z.array(z.string()).optional(),
});

const SimpleConfigSchema = z
    .object({
        agentConfigs: SimpleAgentConfigSchema,
        toolConfigs: z.record(SimpleToolConfigByTypeSchema),
    })
    .partial()
    .optional();

const AgentFailureSchema = z.any();

export class Agent<MODELS extends [LLMType, ...LLMType[]] = any, AVAILABLE_TOOLS extends Tool<any>[] = any> {
    name: string;
    models: MODELS;
    private defaultModel: MODELS[number];
    private availableTools: AVAILABLE_TOOLS;
    private instructions: Prompt<AVAILABLE_TOOLS, MODELS>;
    private agentConfigs: AgentConfig<MODELS, AVAILABLE_TOOLS>;
    private toolConfigs: ToolConfigByType<ToolsToMap<AVAILABLE_TOOLS>>;
    
    private constructor(config: AgentProps<MODELS, AVAILABLE_TOOLS>) {
        this.name = config.name;
        this.models = config.models;
        this.defaultModel = config.defaultModel;
        this.availableTools = config.availableTools;
        if(typeof config.instructions === "string") {
            this.instructions = [{ content: config.instructions }];
        } else {
            this.instructions = config.instructions;
        }
        this.toolConfigs = config.toolConfigs ?? {};
        this.agentConfigs = config.agentConfigs ?? {};
    }

    async executeLoop({ input, messages, model, tools, afterToolCalls, verboseLogging = false }: { input: AgentInput, messages?: Message[], model?: MODELS[number], tools?: ExtractPropertyFromTools<AVAILABLE_TOOLS, "type">[], afterToolCalls?: (toolCalls: ToolCallResultsWithMetadata) => AgentInput, verboseLogging?: boolean }): Promise<string> {
        // First run the agent
        let currentCall = await this.execute({ input, messages, model, tools });
        if (verboseLogging) console.dir(currentCall, { depth: null });

        // Then run the tool calls
        while (currentCall.finishReason === "tool-calls") {
            // Run all the tool calls
            const calls = await Promise.all(currentCall.toolCalls.map(async (toolCall) => {
                try {
                    const call = await this.toolCall({ toolName: toolCall.toolName, toolCallId: toolCall.toolCallId, toolParameters: toolCall.args, spawnAgent: Agent.executeAgentLoop })
                    return call
                } catch (e) {
                    if (verboseLogging) console.dir(e, { depth: null });
                    return null;
                }
            }));

            if (verboseLogging) console.dir(calls, { depth: null });

            // Execute the agent again with the results of the tool calls
            const afterResults = afterToolCalls?.(calls.filter((call) => call !== null));
            const afterArray = afterResults ? (Array.isArray(afterResults) ? afterResults : [afterResults]) : [];
            currentCall = await this.execute({ 
                input: [
                    ...calls.filter(call => call !== null), 
                    ...afterArray
                ], 
                messages: currentCall.messages,
                model,
                tools
            });
            if (verboseLogging) console.dir(currentCall, { depth: null });
        }

        if (verboseLogging) console.log(currentCall.text);

        // Return the final result
        return currentCall.text
    }

    static async executeAgentLoop({ agent, input }: { agent: Agent, input: AgentInput }) {
        return agent.executeLoop({ input });
    }

    static create<MODELS extends [LLMType, ...LLMType[]], AVAILABLE_TOOLS extends Tool<any>[]>(config: Omit<AgentProps<MODELS, AVAILABLE_TOOLS>, "toolConfigs">) {
        return new Agent(config);
    }

    duplicate(type: string) {
        return new Agent({
            name: this.name,
            models: this.models,
            defaultModel: this.defaultModel,
            availableTools: this.availableTools,
            instructions: deepCopy(this.instructions),
            toolConfigs: deepCopy(this.toolConfigs),
            agentConfigs: deepCopy(this.agentConfigs),
        });
    }

    cloneAndConfigure({ toolConfigs, agentConfigs }: { toolConfigs?: ToolConfigByType<ToolsToMap<AVAILABLE_TOOLS>>; agentConfigs?: AgentConfig<MODELS, AVAILABLE_TOOLS> }) {
        return new Agent({
            name: this.name,
            models: this.models,
            defaultModel: this.defaultModel,
            availableTools: this.availableTools,
            instructions: deepCopy(this.instructions),
            toolConfigs,
            agentConfigs,
        });
    }

    get configs() {
        return {
            toolConfigs: this.toolConfigs,
            agentConfigs: this.agentConfigs,
        };
    }

    buildInstructionsFor({ model, tools = this.availableTools.map((tool) => tool.type) }: { model: MODELS[number]; tools?: ExtractPropertyFromTools<AVAILABLE_TOOLS, "type">[] }) {
        const instructions = this.instructions.filter((instruction) => {
            if (instruction.tool) {
                return tools.includes(instruction.tool);
            }

            if (instruction.models) {
                return instruction.models.includes(model);
            }

            return true;
        });
        return instructions.map((instruction) => instruction.content).join("\n\n");
    }

    modifyInstructionsAt({ index, instructions }: { index: number; instructions: Prompt<AVAILABLE_TOOLS, MODELS>[number] }) {
        this.instructions[index] = instructions;
    }

    addInstructionsAt({ index, instructions }: { index: number; instructions: Prompt<AVAILABLE_TOOLS, MODELS>[number] }) {
        this.instructions.splice(index, 0, instructions);
    }

    private applyToolConfigs(): Tool<any>[] {
        const newTools = this.availableTools.map((tool) => {
            let retTool = tool;
            const toolConfig = this.toolConfigs[tool.type as keyof ToolConfigByType<ToolsToMap<AVAILABLE_TOOLS>>];
            if (toolConfig !== undefined && toolConfig !== null && Object.keys(toolConfig).length > 0) {
                retTool = tool.configure(toolConfig);
            }
            return retTool;
        });
        return newTools;
    }

    private getToolsWithConfigByType({ toolTypes }: { toolTypes: ExtractPropertyFromTools<AVAILABLE_TOOLS, "type">[] }): Tool<any>[] {
        const configuredTools = this.applyToolConfigs();
        return configuredTools.filter((tool) => toolTypes.includes(tool.type));
    }

    private getToolsWithConfig({ toolNames }: { toolNames: ExtractPropertyFromTools<AVAILABLE_TOOLS, "type">[] }): Tool<any>[] {
        const configuredTools = this.applyToolConfigs();
        const toolsWithConfig = toolNames.map((toolName) => {
            const foundTool = configuredTools.find((tool) => tool.name === toolName);
            if (!foundTool) {
                throw new Error(`Tool ${toolName} not found in available tools`);
            }
            return foundTool;
        });
        return toolsWithConfig;
    }

    exportToolConfigs() {
        return this.toolConfigs;
    }

    exportExecuteProps(params: Parameters<Agent<MODELS, AVAILABLE_TOOLS>["execute"]>[0]): Parameters<Agent<MODELS, AVAILABLE_TOOLS>["execute"]>[0] {
        return params;
    }

    getConfiguredTool(toolName: ExtractPropertyFromTools<AVAILABLE_TOOLS, "name"> | string) {
        return this.getToolsWithConfig({ toolNames: [toolName] })[0];
    }

    async toolCall({
        toolName,
        toolCallId,
        toolParameters,
        spawnAgent = Agent.executeAgentLoop,
    }: {
        toolName: ExtractPropertyFromTools<AVAILABLE_TOOLS, "name"> | string;
        toolCallId: string;
        toolParameters: any;
        spawnAgent?: ({ agent, input }: { agent: Agent, input: AgentInput }) => Promise<string>;
    }): Promise<ToolCallResultsWithMetadata[number]> {
        const toolWithConfig = this.getToolsWithConfig({ toolNames: [toolName] });
        if (!toolWithConfig?.[0]) {
            throw new Error(`Tool ${toolName} not found in available tools`);
        }
        const toolCall = await toolWithConfig[0].execute({ toolParameters, spawnAgent });
        return {
            toolCallResult: {
                type: "tool-result",
                toolCallId,
                toolName,
                result: toolCall,
            },
        };
    }

    async execute({
        input,
        model: possibleModel,
        tools: possibleToolTypes,
        messages,
    }: {
        input: AgentInput;
        model?: MODELS[number];
        tools?: ExtractPropertyFromTools<AVAILABLE_TOOLS, "type">[];
        messages?: Message[];
    }) {
        // Pick the right model: function argument > agent config > default model
        const model = possibleModel ?? this.agentConfigs.model ?? this.defaultModel;

        // Pick the right tools: function argument > agent config > all tools
        const toolTypes = possibleToolTypes ?? this.agentConfigs.availableTools?.map((tool) => tool.type) ?? this.availableTools.map((tool) => tool.type);

        const instructions = this.buildInstructionsFor({ model: model, tools: toolTypes });
        const toolsWithConfig = this.getToolsWithConfigByType({ toolTypes });
        const constructedModel = AccessLLM.getLLM(model ?? this.defaultModel);
        return await constructedModel.call({
            instructions,
            prompt: input,
            tools: toolsWithConfig,
            messages,
            temperature: this.agentConfigs.temperature,
        });
    }
}
