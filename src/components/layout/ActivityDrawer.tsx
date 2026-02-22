import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActivityDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Activity</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8">
          <p className="text-sm text-muted-foreground text-center py-8">
            No new activity
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
