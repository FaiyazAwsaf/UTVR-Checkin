export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "UVTR Checkin",
  logo: "/logo.svg",
  colors: {
    primary: process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR?.trim() || "#2563eb",
    gradientTo:
      process.env.NEXT_PUBLIC_BRAND_GRADIENT_COLOR?.trim() || "#1d4ed8",
  },
  greeting:
    process.env.NEXT_PUBLIC_BRAND_GREETING?.trim() ||
    "হ্যালো! আমি UVTR Checkin থেকে বলছি। কীভাবে আপনাকে সাহায্য করতে পারি?",
  welcomeMessage: "Let's get you started",
  assistantName: "Riley",
} as const;
