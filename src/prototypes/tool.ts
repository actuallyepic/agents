import { deepCopy } from "src/utils/deepCopy";
import { z } from "zod";
import { Agent } from "./agent";
import { AgentInput } from "src/types/model-response";

// type ExecuteToolFunction<TOOL_TYPE extends string, TOOL_OPTIONS_SCHEMA extends z.ZodTypeAny = any, FUNCTION_PARAMETERS extends z.ZodTypeAny = any, RESULT_SCHEMA extends z.ZodTypeAny = any, SPAN_TYPE extends ToolSpanType = any> =
// ({ functionParameters, toolOptions, spawnAgent }:
//   { functionParameters: z.infer<FUNCTION_PARAMETERS>; toolOptions: z.infer<TOOL_OPTIONS_SCHEMA>; spawnAgent: SpawnAgentFunction }) => Promise<{ toolOutput: z.infer<RESULT_SCHEMA>, metadata: z.infer<SpanMetadataRegistry[SPAN_TYPE]> }>

type ExecuteToolFunction<
    TOOL_TYPE extends string,
    TOOL_OPTIONS_SCHEMA extends z.ZodTypeAny | undefined = undefined,
    FUNCTION_PARAMETERS extends z.ZodTypeAny = any,
    RESULT_SCHEMA extends z.ZodTypeAny = any,
> = ({
    toolParameters,
    toolConfigOptions,
    spawnAgent,
}: {
    toolParameters: z.infer<FUNCTION_PARAMETERS>;
    toolConfigOptions: TOOL_OPTIONS_SCHEMA extends z.ZodTypeAny ? z.infer<TOOL_OPTIONS_SCHEMA> : undefined;
    spawnAgent: ({ agent, input }: { agent: Agent; input: AgentInput }) => Promise<string>;
}) => Promise<z.infer<RESULT_SCHEMA>>;

export interface IToolConfig<
    TOOL_TYPE extends string,
    TOOL_OPTIONS_SCHEMA extends z.ZodTypeAny | undefined = undefined,
    FUNCTION_PARAMETERS extends z.ZodTypeAny = any,
    RESULT_SCHEMA extends z.ZodTypeAny = any,
> {
    name: string;
    type: TOOL_TYPE;
    description?: string | ((toolOptions: TOOL_OPTIONS_SCHEMA extends z.ZodTypeAny ? z.infer<TOOL_OPTIONS_SCHEMA> : never) => string);
    toolParameters: FUNCTION_PARAMETERS;
    readonly toolConfigOptionsSchema?: TOOL_OPTIONS_SCHEMA;
    readonly toolConfigOptions: TOOL_OPTIONS_SCHEMA extends z.ZodTypeAny ? z.infer<TOOL_OPTIONS_SCHEMA> : undefined;
    // toolOptions: z.infer<TOOL_OPTIONS_SCHEMA>;
    resultSchema: RESULT_SCHEMA;
    execute: ExecuteToolFunction<TOOL_TYPE, TOOL_OPTIONS_SCHEMA, FUNCTION_PARAMETERS, RESULT_SCHEMA>;
}

export class Tool<
    TOOL_TYPE extends string,
    TOOL_OPTIONS_SCHEMA extends z.ZodTypeAny = any,
    FUNCTION_PARAMETERS extends z.ZodTypeAny = any,
    RESULT_SCHEMA extends z.ZodTypeAny = any,
> {
    readonly name: string;
    readonly type: TOOL_TYPE;
    protected _description?: string | ((toolOptions: z.infer<TOOL_OPTIONS_SCHEMA>) => string);
    readonly functionParameters: FUNCTION_PARAMETERS;
    // readonly toolOptionsSchema: TOOL_OPTIONS_SCHEMA;
    // readonly toolOptions: z.infer<TOOL_OPTIONS_SCHEMA>;
    readonly toolConfigOptionsSchema?: TOOL_OPTIONS_SCHEMA;
    readonly toolConfigOptions: TOOL_OPTIONS_SCHEMA extends z.ZodTypeAny ? z.infer<TOOL_OPTIONS_SCHEMA> : undefined;

    readonly resultSchema: RESULT_SCHEMA;
    private _execute: ExecuteToolFunction<TOOL_TYPE, TOOL_OPTIONS_SCHEMA, FUNCTION_PARAMETERS, RESULT_SCHEMA>;

    constructor(config: IToolConfig<TOOL_TYPE, TOOL_OPTIONS_SCHEMA, FUNCTION_PARAMETERS, RESULT_SCHEMA>) {
        this.name = config.name;
        this.type = config.type;
        this._description = config.description;
        this.functionParameters = config.toolParameters;
        this.toolConfigOptionsSchema = config.toolConfigOptionsSchema;
        this.toolConfigOptions = config.toolConfigOptions;
        this.resultSchema = config.resultSchema;
        this._execute = config.execute;
    }

    get description() {
        return typeof this._description === "function" ? this._description(this.toolConfigOptions as z.infer<TOOL_OPTIONS_SCHEMA>) : this._description;
    }

    testTool({ toolParameters, toolConfigOptions }: { toolParameters: z.infer<FUNCTION_PARAMETERS>; toolConfigOptions: z.infer<TOOL_OPTIONS_SCHEMA> }) {
        return this._execute({ toolParameters, toolConfigOptions, spawnAgent: Agent.executeAgentLoop });
    }

    async execute({
        toolParameters: unsafeToolParameters,
        spawnAgent,
    }: {
        toolParameters: any;
        spawnAgent: ({ agent, input }: { agent: Agent; input: AgentInput }) => Promise<string>;
    }) {
        const toolParameters = this.functionParameters.safeParse(unsafeToolParameters);
        if (!toolParameters.success) {
            throw new Error(`Invalid tool parameters: ${toolParameters.error.message}`);
        }
        return this._execute({ toolParameters: toolParameters.data, toolConfigOptions: this.toolConfigOptions, spawnAgent });
    }

    configure(config?: Partial<IToolConfig<TOOL_TYPE, TOOL_OPTIONS_SCHEMA, FUNCTION_PARAMETERS, RESULT_SCHEMA>>) {
        if (!config) return this;
        return new Tool({
            name: config.name ?? this.name,
            type: config.type ?? this.type,
            description: config.description ?? this._description,
            execute: config.execute ?? this._execute,
            toolConfigOptions: config.toolConfigOptions ? deepCopy(config.toolConfigOptions) : deepCopy(this.toolConfigOptions),
            toolParameters: config.toolParameters ? deepCopy(config.toolParameters) : deepCopy(this.functionParameters),
            toolConfigOptionsSchema: config.toolConfigOptionsSchema ? deepCopy(config.toolConfigOptionsSchema) : deepCopy(this.toolConfigOptionsSchema),
            resultSchema: config.resultSchema ? deepCopy(config.resultSchema) : deepCopy(this.resultSchema),
        });
    }
}
