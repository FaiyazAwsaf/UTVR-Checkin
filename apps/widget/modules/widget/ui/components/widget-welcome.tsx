import { useAtomValue } from "jotai";
import { brand } from "@workspace/ui/brand";
import { widgetSettingsAtom } from "../../atoms/widget-atoms";

export const WidgetWelcome = () => {
  const settings = useAtomValue(widgetSettingsAtom);
  const greeting = settings?.greeting || brand.greeting;
  const brandName = settings?.brandName || brand.name;

  return (
    <div className="flex flex-col gap-y-4 px-2 py-1 font-semibold">
      <div className="flex items-center gap-x-3">
        <img
          alt={`${brandName} logo`}
          className="size-10 rounded-lg bg-white object-contain p-1"
          src={settings?.logoUrl || brand.logo}
        />
        <div className="leading-tight">
          <p className="text-sm">{brandName}</p>
          <p className="text-[11px] text-primary-foreground/75">Support</p>
        </div>
      </div>
      <p className="text-lg leading-tight">{greeting}</p>
    </div>
  );
};
