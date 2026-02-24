import { Toaster as Sonner } from "sonner";
import { useSettingsStore } from "@/stores/settings-store";

export function Toaster() {
  const { theme } = useSettingsStore();

  return (
    <Sonner
      theme={theme as "light" | "dark"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group border-border bg-background text-foreground shadow-lg",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
        },
      }}
    />
  );
}
