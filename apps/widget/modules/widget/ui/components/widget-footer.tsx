import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useAtomValue, useSetAtom } from "jotai";
import { HomeIcon, InboxIcon } from "lucide-react"
import { screenAtom } from "../../atoms/widget-atoms";
import { widgetSettingsAtom } from "../../atoms/widget-atoms";
import { brand } from "@workspace/ui/brand";

export const WidgetFooter = () => {
  const screen = useAtomValue(screenAtom);
  const settings = useAtomValue(widgetSettingsAtom);
  const setScreen = useSetAtom(screenAtom);

  return (
    <footer className="border-t bg-background">
      {settings?.showAttribution && (
        <p className="py-1.5 text-center text-[10px] text-muted-foreground">
          Powered by {brand.name}
        </p>
      )}
      <div className="flex items-center justify-between">
        <Button
          aria-current={screen === "selection" ? "page" : undefined}
          aria-label="Home"
          className="h-14 flex-1 rounded-none"
          onClick={() => setScreen("selection")}
          size="icon"
          variant="ghost"
        >
          <HomeIcon
            className={cn("size-5", screen === "selection" && "text-primary")}
          />
        </Button>
        <Button
          aria-current={screen === "inbox" ? "page" : undefined}
          aria-label="Conversation inbox"
          className="h-14 flex-1 rounded-none"
          onClick={() => setScreen("inbox")}
          size="icon"
          variant="ghost"
        >
          <InboxIcon
            className={cn("size-5", screen === "inbox" && "text-primary")}
          />
        </Button>
      </div>
    </footer>
  );
};
