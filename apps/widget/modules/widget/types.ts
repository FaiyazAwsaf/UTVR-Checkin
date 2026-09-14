import { WIDGET_SCREENS } from "@/modules/widget/constants";

export type WidgetScreen = (typeof WIDGET_SCREENS)[number];

export interface WidgetSettings {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  greeting: string;
  assistantName: string;
  suggestions: string[];
  showAttribution: boolean;
}
