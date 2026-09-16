import { createTool } from "@convex-dev/agent";
import z from "zod";
import { getCurrentDate } from "../../../lib/hotel/date";

export const currentDate = createTool({
  description:
    "Return today's calendar date in ISO format. Always use this tool when the guest says today, tomorrow, or asks what date it is.",
  args: z.object({}),
  handler: async (): Promise<string> => {
    return `Today's date is ${getCurrentDate()}.`;
  },
});
