"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { RoomStatusBadge } from "./room-status-badge";

const formatCountdown = (expiresAt: number, now: number) => {
  const remainingMs = expiresAt - now;

  if (remainingMs <= 0) {
    return "expiring...";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const RoomStatusGrid = () => {
  const grid = useQuery(api.private.roomHolds.getActiveGrid);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Room status</CardTitle>
        <CardDescription>
          Live view of every active room type. Updates automatically as guests hold, cancel, or book.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {grid === undefined && (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading room status...</p>
        )}

        {grid !== undefined && grid.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No active room types yet.</p>
        )}

        {grid !== undefined && grid.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((entry) => (
              <div
                className="space-y-3 rounded-lg border p-4"
                key={entry.roomType._id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{entry.roomType.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ৳{entry.roomType.basePrice}/night &middot; {entry.roomType.totalUnits} unit
                      {entry.roomType.totalUnits > 1 ? "s" : ""}
                    </p>
                  </div>
                  <RoomStatusBadge status={entry.status} />
                </div>

                {entry.status === "held" && (
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Held by <span className="font-medium text-foreground">{entry.guestName}</span>
                    </p>
                    <p className="font-mono text-xs text-amber-700 dark:text-amber-400">
                      Expires in {formatCountdown(entry.expiresAt, now)}
                    </p>
                  </div>
                )}

                {entry.status === "confirmed" && (
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Booked by <span className="font-medium text-foreground">{entry.guestName}</span>
                    </p>
                    <p className="font-mono text-xs text-blue-700 dark:text-blue-400">
                      {entry.confirmationCode}
                    </p>
                  </div>
                )}

                {entry.status === "available" && (
                  <p className="text-sm text-muted-foreground">No active hold or booking.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
