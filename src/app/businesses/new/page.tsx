import { redirect } from "next/navigation";

export default function NewBusinessRedirectPage() {
  redirect("/organizations/new");
}