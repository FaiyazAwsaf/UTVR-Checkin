export const DEFAULT_WIDGET_SETTINGS = {
  brandName: "UVTR Checkin",
  logoUrl: "/logo.svg",
  primaryColor: "#2563eb",
  greeting: "হ্যালো! আমি UVTR Checkin থেকে বলছি। কীভাবে আপনাকে সাহায্য করতে পারি?",
  assistantName: "Riley",
  suggestions: [],
  showAttribution: false,
};

export const isLegacyGreeting = (value: string) => {
  const greeting = value.trim().toLowerCase();

  return (
    greeting === "hi there! i am from echo" ||
    greeting === "hi there! 👋" ||
    /(?:hello|হ্যালো|hi)!?\s*আমি\s+(?:uvtr\s+)?(?:echo|checkin)\s+থেকে\s+বলছি/.test(
      greeting,
    ) ||
    /আমি\s+(?:echo|checkin)\s+থেকে\s+বলছি/.test(greeting) ||
    /\b(?:i am|i'm)\s+from\s+(?:echo|checkin)\b/.test(greeting)
  );
};

export const normalizeWidgetSettings = <
  T extends { brandName: string; greeting: string },
>(settings: T): T => ({
  ...settings,
  brandName:
    settings.brandName === "Echo" || settings.brandName === "UVTR Echo"
      ? DEFAULT_WIDGET_SETTINGS.brandName
      : settings.brandName,
  greeting: isLegacyGreeting(settings.greeting)
    ? DEFAULT_WIDGET_SETTINGS.greeting
    : settings.greeting,
});
