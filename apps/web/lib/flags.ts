import { flag } from "@vercel/flags/next";

export const useAccountSwitcher = flag({
  key: "use-account-switcher",
  decide: () => false,
});
