"use client";

import { useQuery } from "convex/react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
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
  signups: {
    label: "Signups",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export const SignupsChart = ({ rangeDays = 14 }: { rangeDays?: number }) => {
  const data = useQuery(api.private.hotelReports.getSignupsOverTime, { rangeDays });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signups</CardTitle>
        <CardDescription>New guest sessions over the last {rangeDays} days.</CardDescription>
      </CardHeader>
      <CardContent>
        {data === undefined ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : (
          <ChartContainer className="h-[200px] w-full" config={chartConfig}>
            <AreaChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                tickFormatter={(value: string) => value.slice(5)}
                tickLine={false}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="signups"
                fill="var(--color-signups)"
                fillOpacity={0.2}
                stroke="var(--color-signups)"
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
