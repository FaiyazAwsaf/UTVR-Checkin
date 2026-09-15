"use client";

import { useQuery } from "convex/react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";

const chartConfig = {
  support: {
    label: "Support",
    color: "var(--chart-2)",
  },
  booking: {
    label: "Booking",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export const ConversationVolumeChart = ({ rangeDays = 14 }: { rangeDays?: number }) => {
  const data = useQuery(api.private.hotelReports.getConversationVolume, { rangeDays });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversation volume</CardTitle>
        <CardDescription>
          Support vs. booking conversations over the last {rangeDays} days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data === undefined ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : (
          <ChartContainer className="h-[200px] w-full" config={chartConfig}>
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                tickFormatter={(value: string) => value.slice(5)}
                tickLine={false}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="support" fill="var(--color-support)" radius={4} />
              <Bar dataKey="booking" fill="var(--color-booking)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
