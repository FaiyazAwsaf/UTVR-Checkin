import { Badge } from "@workspace/ui/components/badge";

type RoomGridStatus = "available" | "held" | "confirmed";

export const RoomStatusBadge = ({ status }: { status: RoomGridStatus }) => {
  if (status === "available") {
    return (
      <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
        Available
      </Badge>
    );
  }

  if (status === "held") {
    return (
      <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
        Held
      </Badge>
    );
  }

  return (
    <Badge className="border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
      Booked
    </Badge>
  );
};
