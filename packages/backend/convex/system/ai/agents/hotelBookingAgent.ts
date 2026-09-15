import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
import { HOTEL_BOOKING_AGENT_PROMPT } from "../constants";

export const hotelBookingAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  instructions: HOTEL_BOOKING_AGENT_PROMPT,
  // The underlying `ai` SDK defaults maxSteps to 1, which stops the loop
  // right after a tool call's result comes back — before the model gets a
  // chance to turn that result into a reply. Every booking turn that needs a
  // tool (almost all of them) would otherwise silently produce no assistant
  // message. 5 leaves headroom for a tool call + a wrap-up reply, plus a
  // second tool call in flows like hold-then-quote.
  maxSteps: 5,
});
