import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
import { SUPPORT_AGENT_PROMPT } from "../constants";

export const supportAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  instructions: SUPPORT_AGENT_PROMPT,
  // The underlying `ai` SDK defaults maxSteps to 1, which stops the loop
  // right after a tool call's result comes back — before the model gets a
  // chance to turn that result into a reply. Any turn that calls searchTool
  // (almost every real question) would otherwise silently produce no
  // assistant message. 5 leaves headroom for a tool call + a wrap-up reply.
  maxSteps: 5,
});
