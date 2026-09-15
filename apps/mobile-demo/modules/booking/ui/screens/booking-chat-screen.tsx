"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useThreadMessages, toUIMessages } from "@convex-dev/agent/react";
import { Button } from "@workspace/ui/components/button";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowLeftIcon, PhoneCallIcon } from "lucide-react";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { useAction, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { brand } from "@workspace/ui/brand";
import { Form, FormField } from "@workspace/ui/components/form";
import { useEffect } from "react";
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";
import {
  AIInput,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from "@workspace/ui/components/ai/input";
import {
  AIMessage,
  AIMessageContent,
} from "@workspace/ui/components/ai/message";
import { AIResponse } from "@workspace/ui/components/ai/response";
import {
  activeProfileIdAtom,
  confirmationCodeAtom,
  customProfileAtomFamily,
  screenAtom,
} from "@/modules/booking/atoms/booking-atoms";
import { useDemoSession } from "@/modules/booking/hooks/use-demo-session";
import { DEMO_PROFILES } from "@/modules/booking/data/demo-profiles";

const formSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

export const BookingChatScreen = () => {
  const setScreen = useSetAtom(screenAtom);
  const setActiveProfileId = useSetAtom(activeProfileIdAtom);
  const setConfirmationCode = useSetAtom(confirmationCodeAtom);
  const activeProfileId = useAtomValue(activeProfileIdAtom);
  const customProfile = useAtomValue(customProfileAtomFamily(activeProfileId ?? ""));

  const profile =
    DEMO_PROFILES.find((p) => p.id === activeProfileId) ?? customProfile ?? null;
  const { isReady, contactSessionId, conversationId, organizationId } =
    useDemoSession(profile);

  const conversation = useQuery(
    api.public.conversations.getOne,
    conversationId && contactSessionId
      ? { conversationId, contactSessionId }
      : "skip",
  );

  const messages = useThreadMessages(
    api.public.messages.getMany,
    conversation?.threadId && contactSessionId
      ? { threadId: conversation.threadId, contactSessionId }
      : "skip",
    { initialNumItems: 10 },
  );

  const { topElementRef, handleLoadMore, canLoadMore, isLoadingMore } = useInfiniteScroll({
    status: messages.status,
    loadMore: messages.loadMore,
    loadSize: 10,
  });

  const latestBooking = useQuery(
    api.public.bookings.getLatestForSession,
    contactSessionId ? { contactSessionId } : "skip",
  );

  useEffect(() => {
    if (latestBooking) {
      setConfirmationCode(latestBooking.confirmationCode);
      setScreen("confirmation");
    }
  }, [latestBooking, setConfirmationCode, setScreen]);

  const uiMessages = toUIMessages(messages.results ?? []) ?? [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: profile?.defaultPrompt ?? "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({ message: profile.defaultPrompt });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const createMessage = useAction(api.public.messages.create);
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!conversation || !contactSessionId) {
      return;
    }

    form.reset({ message: "" });

    await createMessage({
      threadId: conversation.threadId,
      prompt: values.message,
      contactSessionId,
    });
  };

  const handleBack = () => {
    setActiveProfileId(null);
    setScreen("profile-select");
  };

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        No profile selected.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 bg-gradient-to-b from-primary to-brand-gradient p-4 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Button onClick={handleBack} size="icon" variant="transparent">
            <ArrowLeftIcon />
          </Button>
          <DicebearAvatar seed={profile.avatarSeed} size={32} />
          <div>
            <p className="text-sm font-medium">{profile.displayName}</p>
            <p className="text-xs opacity-80">Booking with {brand.name}</p>
          </div>
        </div>
        <Button
          onClick={() => setScreen("voice")}
          size="icon"
          variant="transparent"
        >
          <PhoneCallIcon />
        </Button>
      </header>

      {!isReady && (
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
          Starting demo session...
        </div>
      )}

      {isReady && (
        <>
          <AIConversation className="min-h-0 flex-1">
            <AIConversationContent>
              <InfiniteScrollTrigger
                canLoadMore={canLoadMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={handleLoadMore}
                ref={topElementRef}
              />
              {uiMessages.map((message) => (
                <AIMessage
                  from={message.role === "user" ? "user" : "assistant"}
                  key={message.id}
                >
                  <AIMessageContent>
                    <AIResponse>{message.content}</AIResponse>
                  </AIMessageContent>
                  {message.role === "assistant" && (
                    <DicebearAvatar imageUrl={brand.logo} seed="assistant" size={32} />
                  )}
                </AIMessage>
              ))}
            </AIConversationContent>
            <AIConversationScrollButton />
          </AIConversation>
          <Form {...form}>
            <AIInput
              className="shrink-0 rounded-none border-x-0 border-b-0"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                disabled={conversation?.status === "resolved"}
                name="message"
                render={({ field }) => (
                  <AIInputTextarea
                    disabled={conversation?.status === "resolved"}
                    onChange={field.onChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        form.handleSubmit(onSubmit)();
                      }
                    }}
                    placeholder={
                      conversation?.status === "resolved"
                        ? "This conversation has been resolved."
                        : "Type your message..."
                    }
                    value={field.value}
                  />
                )}
              />
              <AIInputToolbar>
                <AIInputTools />
                <AIInputSubmit
                  disabled={conversation?.status === "resolved" || !form.formState.isValid}
                  status="ready"
                  type="submit"
                />
              </AIInputToolbar>
            </AIInput>
          </Form>
        </>
      )}
    </div>
  );
};
