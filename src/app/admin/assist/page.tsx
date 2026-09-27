import AssistEditor from "./assist-editor";
export const dynamic = "force-dynamic";
export default async function AssistPage({ searchParams }: {
  searchParams: Promise<{ user?: string | string[] }>;
}) {
  const query = await searchParams;
  return <AssistEditor initialUser={typeof query.user === "string" ? query.user : ""} />;
}
