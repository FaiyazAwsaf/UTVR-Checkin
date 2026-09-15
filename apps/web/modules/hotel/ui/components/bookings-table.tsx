"use client";

import { usePaginatedQuery } from "convex/react";
import { PhoneIcon, MessageSquareIcon } from "lucide-react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";

export const BookingsTable = () => {
  const bookings = usePaginatedQuery(
    api.private.bookings.getMany,
    {},
    { initialNumItems: 10 },
  );

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingFirstPage,
    isLoadingMore,
  } = useInfiniteScroll({
    status: bookings.status,
    loadMore: bookings.loadMore,
    loadSize: 10,
  });

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>Bookings</CardTitle>
        <CardDescription>Every confirmed booking, most recent first.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 py-4 font-medium">Confirmation</TableHead>
              <TableHead className="px-6 py-4 font-medium">Guest</TableHead>
              <TableHead className="px-6 py-4 font-medium">Room</TableHead>
              <TableHead className="px-6 py-4 font-medium">Dates</TableHead>
              <TableHead className="px-6 py-4 font-medium">Total</TableHead>
              <TableHead className="px-6 py-4 font-medium">Channel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              if (isLoadingFirstPage) {
                return (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={6}>
                      Loading bookings...
                    </TableCell>
                  </TableRow>
                );
              }

              if (bookings.results.length === 0) {
                return (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={6}>
                      No bookings yet
                    </TableCell>
                  </TableRow>
                );
              }

              return bookings.results.map((booking) => (
                <TableRow className="hover:bg-muted/50" key={booking._id}>
                  <TableCell className="px-6 py-4 font-mono text-xs">
                    {booking.confirmationCode}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="space-y-0.5">
                      <p className="font-medium">{booking.guestName}</p>
                      <p className="text-xs text-muted-foreground">{booking.guestEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">{booking.roomTypeName}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                    {booking.checkInDate} &rarr; {booking.checkOutDate}
                  </TableCell>
                  <TableCell className="px-6 py-4">৳{booking.totalPrice}</TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge className="gap-1" variant="outline">
                      {booking.channel === "voice" ? (
                        <PhoneIcon className="size-3" />
                      ) : (
                        <MessageSquareIcon className="size-3" />
                      )}
                      {booking.channel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ));
            })()}
          </TableBody>
        </Table>
        {!isLoadingFirstPage && bookings.results.length > 0 && (
          <div className="border-t">
            <InfiniteScrollTrigger
              canLoadMore={canLoadMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
              ref={topElementRef}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
