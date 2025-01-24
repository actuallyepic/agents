import { Agent } from "../prototypes/agent";
import { AgentInput } from "./model-response";

export type SpawnAgentFunction = ({ agent, input }: { agent: Agent, input: AgentInput }) => Promise<string>;
