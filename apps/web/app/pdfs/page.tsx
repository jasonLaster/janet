import { redirect } from "next/navigation";

export default function PDFsRedirect() {
  redirect("/");
  return null;
}
