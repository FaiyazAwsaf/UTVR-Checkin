"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Doc } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

interface RoomTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomType: Doc<"roomTypes"> | null;
}

interface RoomTypeForm {
  name: string;
  description: string;
  basePrice: string;
  maxOccupancy: string;
  totalUnits: string;
  imageUrl: string;
  amenities: string;
  smokingAllowed: boolean;
}

const emptyForm: RoomTypeForm = {
  name: "",
  description: "",
  basePrice: "",
  maxOccupancy: "",
  totalUnits: "",
  imageUrl: "",
  amenities: "",
  smokingAllowed: false,
};

export const RoomTypeFormDialog = ({
  open,
  onOpenChange,
  roomType,
}: RoomTypeFormDialogProps) => {
  const createRoomType = useMutation(api.private.roomTypes.create);
  const updateRoomType = useMutation(api.private.roomTypes.update);
  const [form, setForm] = useState<RoomTypeForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (roomType) {
      setForm({
        name: roomType.name,
        description: roomType.description,
        basePrice: String(roomType.basePrice),
        maxOccupancy: String(roomType.maxOccupancy),
        totalUnits: String(roomType.totalUnits),
        imageUrl: roomType.imageUrl ?? "",
        amenities: roomType.amenities.join("\n"),
        smokingAllowed: roomType.smokingAllowed,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, roomType]);

  const updateField = <K extends keyof RoomTypeForm>(
    field: K,
    value: RoomTypeForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    const basePrice = Number(form.basePrice);
    const maxOccupancy = Number(form.maxOccupancy);
    const totalUnits = Number(form.totalUnits);

    if (!form.name.trim() || !form.description.trim()) {
      toast.error("Name and description are required");
      return;
    }

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      toast.error("Base price must be a positive number");
      return;
    }

    if (!Number.isFinite(maxOccupancy) || maxOccupancy <= 0) {
      toast.error("Max occupancy must be a positive number");
      return;
    }

    if (!Number.isFinite(totalUnits) || totalUnits <= 0) {
      toast.error("Total units must be a positive number");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        basePrice,
        maxOccupancy,
        totalUnits,
        imageUrl: form.imageUrl || undefined,
        amenities: form.amenities.split("\n"),
        smokingAllowed: form.smokingAllowed,
      };

      if (roomType) {
        await updateRoomType({ roomTypeId: roomType._id, ...payload });
        toast.success("Room type updated");
      } else {
        await createRoomType(payload);
        toast.success("Room type created");
      }

      onOpenChange(false);
    } catch {
      toast.error("Unable to save room type");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{roomType ? "Edit Room Type" : "Add Room Type"}</DialogTitle>
          <DialogDescription>
            Room types are what the booking assistant checks availability and quotes against.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rt-name">Name</Label>
              <Input
                id="rt-name"
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Deluxe King"
                value={form.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt-basePrice">Base price / night</Label>
              <Input
                id="rt-basePrice"
                inputMode="numeric"
                onChange={(e) => updateField("basePrice", e.target.value)}
                placeholder="7500"
                value={form.basePrice}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rt-description">Description</Label>
            <Textarea
              id="rt-description"
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              value={form.description}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rt-maxOccupancy">Max occupancy</Label>
              <Input
                id="rt-maxOccupancy"
                inputMode="numeric"
                onChange={(e) => updateField("maxOccupancy", e.target.value)}
                placeholder="2"
                value={form.maxOccupancy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt-totalUnits">Total units</Label>
              <Input
                id="rt-totalUnits"
                inputMode="numeric"
                onChange={(e) => updateField("totalUnits", e.target.value)}
                placeholder="5"
                value={form.totalUnits}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rt-imageUrl">
              Image URL <span className="text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="rt-imageUrl"
              onChange={(e) => updateField("imageUrl", e.target.value)}
              placeholder="https://example.com/room.jpg"
              value={form.imageUrl}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rt-amenities">Amenities</Label>
            <Textarea
              id="rt-amenities"
              onChange={(e) => updateField("amenities", e.target.value)}
              placeholder={"Free WiFi\nAir Conditioning\nTV"}
              rows={3}
              value={form.amenities}
            />
            <p className="text-xs text-muted-foreground">One amenity per line.</p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.smokingAllowed}
              id="rt-smokingAllowed"
              onCheckedChange={(checked) => updateField("smokingAllowed", checked === true)}
            />
            <Label className="font-normal" htmlFor="rt-smokingAllowed">
              Smoking allowed
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSaving} onClick={() => void handleSave()}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
