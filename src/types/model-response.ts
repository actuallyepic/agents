import { z } from "zod";

/** Metadata for the language model provider */
export const LanguageModelV1ProviderMetadataSchema = z.record(z.record(z.any()));

/** A tool call in the model response */
export const ToolCallSchema = z.object({
    type: z.literal("tool-call"),
    toolCallId: z.string(),
    toolName: z.string(),
    args: z.unknown(),
    experimental_providerMetadata: LanguageModelV1ProviderMetadataSchema.optional(),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

/** A single tool call result */
export const ToolCallResultSchema = z.object({
    type: z.literal("tool-result"),
    toolCallId: z.string(),
    toolName: z.string(),
    result: z.unknown(),
    isError: z.boolean().optional(),
    experimental_providerMetadata: LanguageModelV1ProviderMetadataSchema.optional(),
});
export type ToolCallResult = z.infer<typeof ToolCallResultSchema>;

/** A single tool call result with metadata */
export const ToolCallResultsWithMetadataSchema = z.array(
    z.object({
        toolCallResult: ToolCallResultSchema,
        metadata: z.any(),
    }),
);
export type ToolCallResultsWithMetadata = z.infer<typeof ToolCallResultsWithMetadataSchema>;

/** The input to give to the model */
export const AgentInputSchema = z.union([
    z.string(),
    z.array(z.union([z.string(), ToolCallResultsWithMetadataSchema.element]))
]);
export type AgentInput = z.infer<typeof AgentInputSchema>;

/** SCHEMAS FOR MESSAGE PARTS */
/** Text schema for the model response */
const TextPartSchema = z.object({
    type: z.literal("text"),
    text: z.string(),
    experimental_providerMetadata: LanguageModelV1ProviderMetadataSchema.optional(),
});

/** Image schema for the model response */
const ImagePartSchema = z.object({
    type: z.literal("image"),
    image: z.union([z.string(), z.instanceof(URL)]),
    mimeType: z.string().optional(),
    experimental_providerMetadata: LanguageModelV1ProviderMetadataSchema.optional(),
});

/** File schema for the model response */
const FilePartSchema = z.object({
    type: z.literal("file"),
    data: z.union([z.string(), z.instanceof(URL)]),
    mimeType: z.string(),
    experimental_providerMetadata: LanguageModelV1ProviderMetadataSchema.optional(),
});

/** SCHEMAS FOR MESSAGES */
/** System message schema for the model response */
const SystemMessageSchema = z.object({
    role: z.literal("system"),
    content: z.string(),
});

/** User message schema for the model response */
const UserMessageSchema = z.object({
    role: z.literal("user"),
    content: z.union([z.string(), z.array(z.union([TextPartSchema, ImagePartSchema, FilePartSchema]))]),
});

/** Assistant message schema for the model response */
const AssistantMessageSchema = z.object({
    role: z.literal("assistant"),
    content: z.union([z.string(), z.array(z.union([TextPartSchema, ToolCallSchema]))]),
});

/** Tool message schema for the model response */
const ToolMessageSchema = z.object({
    role: z.literal("tool"),
    content: z.array(ToolCallResultSchema),
});

/** Message schema for the model response */
export const MessageSchema = z.discriminatedUnion("role", [SystemMessageSchema, UserMessageSchema, AssistantMessageSchema, ToolMessageSchema]);
export type Message = z.infer<typeof MessageSchema>;

/** Metadata schema for the model response */
export const MetadataSchema = z.object({
    usage: z.any(),
    messages: z.array(MessageSchema),
});

/** Model response schema for the model response */
export const ModelResponseSchema = z.discriminatedUnion("finishReason", [
    z.object({
        finishReason: z.literal("tool-calls"),
        metadata: z.any(),
        messages: z.array(MessageSchema),
        toolCalls: z.array(ToolCallSchema),
    }),
    z.object({
        finishReason: z.enum(["length", "unknown", "stop", "content-filter", "error", "other"]),
        metadata: z.any(),
        messages: z.array(MessageSchema),
        text: z.string(),
    }),
]);
export type ModelResponse = z.infer<typeof ModelResponseSchema>;

/** Model response schema for the model response without usage */
export const ModelReponseSchemaWithoutUsage = z.discriminatedUnion("finishReason", [
    z.object({
        finishReason: z.literal("tool-calls"),
        messages: z.array(MessageSchema),
        toolCalls: z.array(ToolCallSchema),
    }),
    z.object({
        finishReason: z.enum(["length", "unknown", "stop", "content-filter", "error", "other"]),
        messages: z.array(MessageSchema),
        text: z.string(),
    }),
]);
export type ModelResponseWithoutUsage = z.infer<typeof ModelReponseSchemaWithoutUsage>;
