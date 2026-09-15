"use client";

import { useSetAtom } from "jotai";
import { ChevronRightIcon, UserPlusIcon } from "lucide-react";
import { brand } from "@workspace/ui/brand";
import { Button } from "@workspace/ui/components/button";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { activeProfileIdAtom, screenAtom } from "@/modules/booking/atoms/booking-atoms";
import { DEMO_PROFILES } from "@/modules/booking/data/demo-profiles";

export const ProfileSelectScreen = () => {
  const setActiveProfileId = useSetAtom(activeProfileIdAtom);
  const setScreen = useSetAtom(screenAtom);

  const handleSelect = (profileId: string) => {
    setActiveProfileId(profileId);
    setScreen("chat");
  };

  return (
    <div className="flex h-full flex-col">
      <header className="bg-gradient-to-b from-primary to-brand-gradient p-6 text-primary-foreground">
        <p className="text-sm opacity-80">{brand.name} — Booking Demo</p>
        <h1 className="mt-1 text-2xl font-semibold">Pick a guest profile</h1>
        <p className="mt-2 text-sm opacity-90">
          Each profile is its own guest with its own conversation. Run two profiles in two tabs to see the live waitlist demo.
        </p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <Button
          className="h-auto w-full justify-between py-4"
          onClick={() => setScreen("sign-up")}
          variant="outline"
        >
          <div className="flex items-center gap-3">
            <UserPlusIcon className="size-5" />
            <span>Sign up as a new guest</span>
          </div>
          <ChevronRightIcon className="size-4" />
        </Button>

        {DEMO_PROFILES.map((profile) => (
          <button
            className="flex w-full items-center gap-3 rounded-xl border bg-background p-4 text-left transition-colors hover:bg-muted/50"
            key={profile.id}
            onClick={() => handleSelect(profile.id)}
            type="button"
          >
            <DicebearAvatar seed={profile.avatarSeed} size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{profile.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{profile.scenario}</p>
            </div>
            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};
