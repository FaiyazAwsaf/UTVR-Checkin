"use client";

import { usePaginatedQuery, useMutation } from "convex/react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Doc } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { Switch } from "@workspace/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { RoomTypeFormDialog } from "../components/room-type-form-dialog";

export const HotelRoomTypesView = () => {
  const roomTypes = usePaginatedQuery(
    api.private.roomTypes.getMany,
    {},
    { initialNumItems: 10 },
  );

  const setActive = useMutation(api.private.roomTypes.setActive);

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingFirstPage,
    isLoadingMore,
  } = useInfiniteScroll({
    status: roomTypes.status,
    loadMore: roomTypes.loadMore,
    loadSize: 10,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<Doc<"roomTypes"> | null>(null);

  const handleAddClick = () => {
    setEditingRoomType(null);
    setDialogOpen(true);
  };

  const handleEditClick = (roomType: Doc<"roomTypes">) => {
    setEditingRoomType(roomType);
    setDialogOpen(true);
  };

  const handleToggleActive = async (roomType: Doc<"roomTypes">, isActive: boolean) => {
    try {
      await setActive({ roomTypeId: roomType._id, isActive });
    } catch {
      toast.error("Unable to update room type");
    }
  };

  return (
    <>
      <RoomTypeFormDialog
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        roomType={editingRoomType}
      />
      <div className="flex min-h-screen flex-col bg-muted p-8">
        <div className="mx-auto w-full max-w-screen-lg">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl">Room Types</h1>
            <p className="text-muted-foreground">
              Manage the rooms your booking assistant can offer to guests.
            </p>
          </div>

          <div className="mt-8 rounded-lg border bg-background">
            <div className="flex items-center justify-end border-b px-6 py-4">
              <Button onClick={handleAddClick}>
                <PlusIcon />
                Add Room Type
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4 font-medium">Name</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Price / night</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Occupancy</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Units</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Active</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  if (isLoadingFirstPage) {
                    return (
                      <TableRow>
                        <TableCell className="h-24 text-center" colSpan={6}>
                          Loading room types...
                        </TableCell>
                      </TableRow>
                    );
                  }

                  if (roomTypes.results.length === 0) {
                    return (
                      <TableRow>
                        <TableCell className="h-24 text-center" colSpan={6}>
                          No room types yet
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return roomTypes.results.map((roomType) => (
                    <TableRow className="hover:bg-muted/50" key={roomType._id}>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-medium">{roomType.name}</p>
                          {roomType.totalUnits === 1 && (
                            <Badge className="text-xs" variant="outline">
                              Scarce (1 unit)
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">৳{roomType.basePrice}</TableCell>
                      <TableCell className="px-6 py-4">{roomType.maxOccupancy}</TableCell>
                      <TableCell className="px-6 py-4">{roomType.totalUnits}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Switch
                          checked={roomType.isActive}
                          onCheckedChange={(checked) => void handleToggleActive(roomType, checked)}
                        />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Button
                          onClick={() => handleEditClick(roomType)}
                          size="sm"
                          variant="ghost"
                        >
                          <PencilIcon className="mr-2 size-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
            {!isLoadingFirstPage && roomTypes.results.length > 0 && (
              <div className="border-t">
                <InfiniteScrollTrigger
                  canLoadMore={canLoadMore}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={handleLoadMore}
                  ref={topElementRef}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
