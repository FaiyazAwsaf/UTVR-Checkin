"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import type { Doc } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
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

interface PackageAddOnFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageAddOn: Doc<"packageAddOns"> | null;
}

interface PackageAddOnForm {
  name: string;
  description: string;
  price: string;
}

const emptyForm: PackageAddOnForm = {
  name: "",
  description: "",
  price: "",
};

export const PackageAddOnFormDialog = ({
  open,
  onOpenChange,
  packageAddOn,
}: PackageAddOnFormDialogProps) => {
  const createPackage = useMutation(api.private.packageAddOns.create);
  const updatePackage = useMutation(api.private.packageAddOns.update);
  const [form, setForm] = useState<PackageAddOnForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (packageAddOn) {
      setForm({
        name: packageAddOn.name,
        description: packageAddOn.description,
        price: String(packageAddOn.price),
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, packageAddOn]);

  const updateField = <K extends keyof PackageAddOnForm>(
    field: K,
    value: PackageAddOnForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    const price = Number(form.price);

    if (!form.name.trim() || !form.description.trim()) {
      toast.error("Name and description are required");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Price must be a positive number");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price,
      };

      if (packageAddOn) {
        await updatePackage({ packageAddOnId: packageAddOn._id, ...payload });
        toast.success("Package updated");
      } else {
        await createPackage(payload);
        toast.success("Package created");
      }

      onOpenChange(false);
    } catch {
      toast.error("Unable to save package");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{packageAddOn ? "Edit Package" : "Add Package"}</DialogTitle>
          <DialogDescription>
            Package add-ons the booking assistant can offer alongside a room, e.g. airport pickup or breakfast.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pkg-name">Name</Label>
            <Input
              id="pkg-name"
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Airport Pickup"
              value={form.name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pkg-description">Description</Label>
            <Textarea
              id="pkg-description"
              onChange={(e) => updateField("description", e.target.value)}
              rows={2}
              value={form.description}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pkg-price">Price (flat, once per booking)</Label>
            <Input
              id="pkg-price"
              inputMode="numeric"
              onChange={(e) => updateField("price", e.target.value)}
              placeholder="1500"
              value={form.price}
            />
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
