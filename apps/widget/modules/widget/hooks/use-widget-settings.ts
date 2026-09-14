import { useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { api } from "@workspace/backend/_generated/api";
import {
  contactSessionIdAtomFamily,
  organizationIdAtom,
  widgetSettingsAtom,
} from "../atoms/widget-atoms";

export const useWidgetSettings = () => {
  const organizationId = useAtomValue(organizationIdAtom);
  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || ""),
  );
  const settings = useQuery(
    api.public.widgetSettings.get,
    organizationId && contactSessionId
      ? { organizationId, contactSessionId }
      : "skip",
  );
  const storedSettings = useAtomValue(widgetSettingsAtom);
  const setStoredSettings = useSetAtom(widgetSettingsAtom);

  useEffect(() => {
    if (settings) {
      setStoredSettings(settings);
    }
  }, [settings, setStoredSettings]);

  useEffect(() => {
    if (!organizationId || !contactSessionId) {
      setStoredSettings(null);
    }
  }, [contactSessionId, organizationId, setStoredSettings]);

  return storedSettings ?? settings ?? null;
};
