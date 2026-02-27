import { useContext } from "react";
import { AlertContext } from "./AlertContext";

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (ctx) return ctx;

  // Provider 밖에서도 크래시 방지 fallback
  return {
    open: async (opt) => {
      const type = opt?.type ?? "info";
      const msg = opt?.message ?? "";

      if (type === "confirm") return window.confirm(msg);
      
      if (type === "choice") {
        const actions = opt?.actions ?? [];
        const guide = actions
          .map((a, idx) => `${idx + 1}. ${a.label}`)
          .join("\n");
        const input = window.prompt(`${msg}\n\n${guide}`, "1");
        const picked = actions[Number(input) - 1];
        return picked?.key ?? null;
      }

      window.alert(msg);
      return true;
    },

    close: () => {},
    info: async (message) => {
      window.alert(message ?? "");
      return true;
    },
    success: async (message) => {
      window.alert(message ?? "");
      return true;
    },
    warning: async (message) => {
      window.alert(message ?? "");
      return true;
    },
    error: async (message) => {
      window.alert(message ?? "");
      return true;
    },
    choice: async (message, title, actions = []) => {
      const guide = actions.map((a, idx) => `${idx + 1}. ${a.label}`).join("\n");
      const input = window.prompt(`${title ? `${title}\n\n` : ""}${message}\n\n${guide}`, "1");
      const picked = actions[Number(input) - 1];
      return picked?.key ?? null;
    },
  };
}
