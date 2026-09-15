"use client";

import { useQuery } from "convex/react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { api } from "@workspace/backend/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";

const chartConfig = {
  count: {
    label: "Bookings",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export const MostBookedChart = () => {
  const data = useQuery(api.private.hotelReports.getMostBookedRoomTypes);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most booked room types</CardTitle>
        <CardDescription>All-time booking count per room type.</CardDescription>
      </CardHeader>
      <CardContent>
        {data === undefined ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No bookings yet
          </div>
        ) : (
          <ChartContainer className="h-[200px] w-full" config={chartConfig}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid horizontal={false} />
              <XAxis dataKey="count" hide type="number" />
              <YAxis
                axisLine={false}
                dataKey="name"
                tickLine={false}
                type="category"
                width={140}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
