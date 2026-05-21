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
            "group glass border-border/50 text-foreground shadow-warm font-body",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground font-heading font-medium",
          cancelButton: "bg-muted text-muted-foreground font-heading font-medium",
          success: "!border-l-4 !border-l-emerald-500",
          error: "!border-l-4 !border-l-red-500",
          info: "!border-l-4 !border-l-blue-500",
          warning: "!border-l-4 !border-l-yellow-500",
        },
      }}
    />
  );
}
