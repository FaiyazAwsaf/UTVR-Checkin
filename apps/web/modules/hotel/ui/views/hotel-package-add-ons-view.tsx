"use client";

import { usePaginatedQuery, useMutation } from "convex/react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Doc } from "@workspace/backend/_generated/dataModel";
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
import { PackageAddOnFormDialog } from "../components/package-add-on-form-dialog";

export const HotelPackageAddOnsView = () => {
  const packages = usePaginatedQuery(
    api.private.packageAddOns.getMany,
    {},
    { initialNumItems: 10 },
  );

  const setActive = useMutation(api.private.packageAddOns.setActive);

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingFirstPage,
    isLoadingMore,
  } = useInfiniteScroll({
    status: packages.status,
    loadMore: packages.loadMore,
    loadSize: 10,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Doc<"packageAddOns"> | null>(null);

  const handleAddClick = () => {
    setEditingPackage(null);
    setDialogOpen(true);
  };

  const handleEditClick = (packageAddOn: Doc<"packageAddOns">) => {
    setEditingPackage(packageAddOn);
    setDialogOpen(true);
  };

  const handleToggleActive = async (packageAddOn: Doc<"packageAddOns">, isActive: boolean) => {
    try {
      await setActive({ packageAddOnId: packageAddOn._id, isActive });
    } catch {
      toast.error("Unable to update package");
    }
  };

  return (
    <>
      <PackageAddOnFormDialog
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        packageAddOn={editingPackage}
      />
      <div className="flex min-h-screen flex-col bg-muted p-8">
        <div className="mx-auto w-full max-w-screen-md">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl">Packages &amp; Add-ons</h1>
            <p className="text-muted-foreground">
              Extras your booking assistant can offer alongside a room.
            </p>
          </div>

          <div className="mt-8 rounded-lg border bg-background">
            <div className="flex items-center justify-end border-b px-6 py-4">
              <Button onClick={handleAddClick}>
                <PlusIcon />
                Add Package
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4 font-medium">Name</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Price</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Active</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  if (isLoadingFirstPage) {
                    return (
                      <TableRow>
                        <TableCell className="h-24 text-center" colSpan={4}>
                          Loading packages...
                        </TableCell>
                      </TableRow>
                    );
                  }

                  if (packages.results.length === 0) {
                    return (
                      <TableRow>
                        <TableCell className="h-24 text-center" colSpan={4}>
                          No packages yet
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return packages.results.map((packageAddOn) => (
                    <TableRow className="hover:bg-muted/50" key={packageAddOn._id}>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-medium">{packageAddOn.name}</p>
                          <p className="text-sm text-muted-foreground">{packageAddOn.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">৳{packageAddOn.price}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Switch
                          checked={packageAddOn.isActive}
                          onCheckedChange={(checked) => void handleToggleActive(packageAddOn, checked)}
                        />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Button
                          onClick={() => handleEditClick(packageAddOn)}
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
            {!isLoadingFirstPage && packages.results.length > 0 && (
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
