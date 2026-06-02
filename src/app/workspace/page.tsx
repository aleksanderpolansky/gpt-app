import { WorkspaceCenter } from "../../components/workspace/workspace-center";

export const WORKSPACE_ROUTE_CONNECTED_TO_WORKSPACE_CENTER =
  "WORKSPACE_ROUTE_CONNECTED_TO_WORKSPACE_CENTER" as const;

export default function WorkspacePage() {
  return <WorkspaceCenter />;
}
