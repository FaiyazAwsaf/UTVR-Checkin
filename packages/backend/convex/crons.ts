import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sweep expired room holds",
  { minutes: 1 },
  internal.system.hotel.scheduling.sweepExpiredHolds,
  {},
);

export default crons;
