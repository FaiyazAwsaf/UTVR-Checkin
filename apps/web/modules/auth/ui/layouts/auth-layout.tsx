import Image from "next/image";
import { brand } from "@workspace/ui/brand";

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return ( 
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-5 bg-muted/30 p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Image alt="" height={28} src={brand.logo} width={28} />
        <span>{brand.name}</span>
      </div>
      {children}
    </div>
  );
};
