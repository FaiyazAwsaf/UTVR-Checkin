"use client";

import { BookingsTable } from "../components/bookings-table";
import { ConversationVolumeChart } from "../components/conversation-volume-chart";
import { MostBookedChart } from "../components/most-booked-chart";
import { RoomStatusGrid } from "../components/room-status-grid";
import { SignupsChart } from "../components/signups-chart";

export const HotelReportsView = () => {
  return (
    <div className="min-h-full bg-muted/40 p-4 md:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-medium text-primary">Hotel</p>
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Live room status, signups, conversation volume, and booking activity for this organization.
          </p>
        </div>

        <RoomStatusGrid />

        <div className="grid gap-6 lg:grid-cols-2">
          <SignupsChart />
          <ConversationVolumeChart />
        </div>

        <MostBookedChart />

        <BookingsTable />
      </div>
    </div>
  );
};
