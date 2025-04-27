import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString: string) => {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);

  const isInvalid = isNaN(date.getTime());

  if (isInvalid) {
    return null;
  }
  // Format with ordinal suffix
  const day = date.getDate();
  const ordinal = (d: number) =>
    d +
    (["th", "st", "nd", "rd"][
      d % 10 > 3 || Math.floor((d % 100) / 10) == 1 ? 0 : d % 10
    ] || "th");

  const formattedDate = `${date.toLocaleString("en-US", {
    month: "long",
  })} ${ordinal(day)}, ${date.getFullYear()}`;

  return formattedDate;
};
