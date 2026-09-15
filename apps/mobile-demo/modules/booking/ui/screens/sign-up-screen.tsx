"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getDefaultStore, useSetAtom } from "jotai";
import { ArrowLeftIcon } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  activeProfileIdAtom,
  customProfileAtomFamily,
  screenAtom,
} from "@/modules/booking/atoms/booking-atoms";
import { DemoProfile } from "@/modules/booking/types";

const formSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

// Lets a demo operator create a real guest on the spot (name + email typed
// live) instead of only being able to pick from the static DEMO_PROFILES
// list. Behaves identically to a canned profile after submit — same
// contactSessions row, same booking-mode conversation, same chat screen.
export const SignUpScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setActiveProfileId = useSetAtom(activeProfileIdAtom);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const profileId = `custom-${crypto.randomUUID()}`;

    const profile: DemoProfile = {
      id: profileId,
      displayName: values.displayName,
      email: values.email,
      defaultPrompt: "",
      scenario: "Signed up on the spot",
      avatarSeed: profileId,
    };

    // profileId is only known once the form is submitted, so the atomFamily
    // member can't be resolved via useSetAtom (a hook, called at render
    // time) — write through the default store instead.
    getDefaultStore().set(customProfileAtomFamily(profileId), profile);
    setActiveProfileId(profileId);
    setScreen("chat");
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 bg-gradient-to-b from-primary to-brand-gradient p-4 text-primary-foreground">
        <Button onClick={() => setScreen("profile-select")} size="icon" variant="transparent">
          <ArrowLeftIcon />
        </Button>
        <p className="font-medium">Sign up as a new guest</p>
      </header>

      <Form {...form}>
        <form
          className="flex flex-1 flex-col gap-y-4 p-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <p className="text-sm text-muted-foreground">
            Create a real guest identity and start a fresh booking conversation with the AI.
          </p>

          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. John Doe" type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. john.doe@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button disabled={form.formState.isSubmitting} size="lg" type="submit">
            Start conversation
          </Button>
        </form>
      </Form>
    </div>
  );
};
