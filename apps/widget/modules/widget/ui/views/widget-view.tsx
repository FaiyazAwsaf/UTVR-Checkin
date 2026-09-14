"use client";

import { useAtomValue } from "jotai";
import { WidgetAuthScreen } from "@/modules/widget/ui/screens/widget-auth-screen";
import { screenAtom } from "@/modules/widget/atoms/widget-atoms";
import { WidgetErrorScreen } from "@/modules/widget/ui/screens/widget-error-screen";
import { WidgetLoadingScreen } from "@/modules/widget/ui/screens/widget-loading-screen";
import { WidgetSelectionScreen } from "@/modules/widget/ui/screens/widget-selection-screen";
import { WidgetChatScreen } from "@/modules/widget/ui/screens/widget-chat-screen";
import { WidgetInboxScreen } from "../screens/widget-inbox-screen";
import { WidgetVoiceScreen } from "../screens/widget-voice-screen";
import { useWidgetSettings } from "../../hooks/use-widget-settings";
import { brand } from "@workspace/ui/brand";

interface Props {
  organizationId: string | null;
};

export const WidgetView = ({ organizationId }: Props) => {
  const screen = useAtomValue(screenAtom);
  const settings = useWidgetSettings();
  const primaryColor = settings?.primaryColor || brand.colors.primary;
  const gradientColor = settings
    ? "color-mix(in srgb, var(--primary) 78%, black)"
    : brand.colors.gradientTo;

  const screenComponents = {
    loading: <WidgetLoadingScreen organizationId={organizationId} />,
    error: <WidgetErrorScreen />,
    auth: <WidgetAuthScreen />,
    voice: <WidgetVoiceScreen />,
    inbox: <WidgetInboxScreen />,
    selection: <WidgetSelectionScreen />,
    chat: <WidgetChatScreen />,
    contact: <p>TODO: Contact</p>,
  }

  return (
    <main
      className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-background sm:my-6 sm:h-[calc(100dvh-3rem)] sm:rounded-[28px] sm:border sm:shadow-2xl"
      style={{
        "--primary": primaryColor,
        "--ring": primaryColor,
        "--sidebar-primary": primaryColor,
        "--sidebar-ring": primaryColor,
        "--brand-gradient-to": gradientColor,
      } as React.CSSProperties}
    >
      {screenComponents[screen]}
    </main>
  );
};
