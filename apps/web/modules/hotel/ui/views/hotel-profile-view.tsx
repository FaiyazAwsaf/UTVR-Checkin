"use client";

import { useMutation, useQuery } from "convex/react";
import { SaveIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";

interface HotelProfileForm {
  name: string;
  description: string;
  address: string;
  checkInTime: string;
  checkOutTime: string;
  currency: string;
  amenities: string;
  policies: string;
}

const defaultForm: HotelProfileForm = {
  name: "",
  description: "",
  address: "",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  currency: "BDT",
  amenities: "",
  policies: "",
};

export const HotelProfileView = () => {
  const profile = useQuery(api.private.hotelProfiles.get);
  const saveProfile = useMutation(api.private.hotelProfiles.upsert);
  const [form, setForm] = useState(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile === undefined) {
      return;
    }

    if (profile === null) {
      setForm(defaultForm);
      return;
    }

    setForm({
      name: profile.name,
      description: profile.description,
      address: profile.address,
      checkInTime: profile.checkInTime,
      checkOutTime: profile.checkOutTime,
      currency: profile.currency,
      amenities: profile.amenities.join("\n"),
      policies: profile.policies ?? "",
    });
  }, [profile]);

  const updateField = <K extends keyof HotelProfileForm>(
    field: K,
    value: HotelProfileForm[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProfile({
        name: form.name,
        description: form.description,
        address: form.address,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime,
        currency: form.currency,
        amenities: form.amenities.split("\n"),
        policies: form.policies || undefined,
      });
      toast.success("Hotel profile saved");
    } catch {
      toast.error("Unable to save hotel profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-muted/40 p-4 md:p-8">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-medium text-primary">Hotel</p>
          <h1 className="text-3xl font-semibold tracking-tight">Hotel profile</h1>
          <p className="text-muted-foreground">
            Basic information about your hotel, shown to the booking assistant
            and used across the dashboard.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Property details</CardTitle>
            <CardDescription>
              This information is used by the AI booking assistant when talking to guests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Hotel name</Label>
                <Input
                  id="name"
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="UVTR Grand Dhaka"
                  value={form.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  onChange={(event) => updateField("currency", event.target.value)}
                  placeholder="BDT"
                  value={form.currency}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                onChange={(event) => updateField("address", event.target.value)}
                placeholder="123 Gulshan Avenue, Dhaka 1212"
                value={form.address}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                onChange={(event) => updateField("description", event.target.value)}
                rows={3}
                value={form.description}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="checkInTime">Check-in time</Label>
                <Input
                  id="checkInTime"
                  onChange={(event) => updateField("checkInTime", event.target.value)}
                  placeholder="14:00"
                  value={form.checkInTime}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOutTime">Check-out time</Label>
                <Input
                  id="checkOutTime"
                  onChange={(event) => updateField("checkOutTime", event.target.value)}
                  placeholder="12:00"
                  value={form.checkOutTime}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amenities">Amenities</Label>
              <Textarea
                id="amenities"
                onChange={(event) => updateField("amenities", event.target.value)}
                placeholder={"Free WiFi\nSwimming Pool\nFree Parking"}
                rows={4}
                value={form.amenities}
              />
              <p className="text-xs text-muted-foreground">One amenity per line.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="policies">Policies</Label>
              <Textarea
                id="policies"
                onChange={(event) => updateField("policies", event.target.value)}
                rows={3}
                value={form.policies}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button disabled={isSaving || profile === undefined} onClick={() => void handleSave()}>
              <SaveIcon />
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
