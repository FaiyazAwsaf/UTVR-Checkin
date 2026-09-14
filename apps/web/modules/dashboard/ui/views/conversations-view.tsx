import Image from "next/image";
import { brand } from "@workspace/ui/brand";

export const ConversationsView = () => {
  return (
    <div className="flex h-full flex-1 flex-col gap-y-4 bg-muted">
      <div className="flex flex-1 items-center justify-center gap-x-2">
        <Image alt="Logo" height={40} width={40} src={brand.logo} />
        <p className="font-semibold text-lg">{brand.name}</p>
      </div>
    </div>
  );
};
