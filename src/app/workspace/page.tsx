import { WorkspaceCenter } from "../../components/workspace/workspace-center";

export const WORKSPACE_ROUTE_CONNECTED_TO_WORKSPACE_CENTER =
  "WORKSPACE_ROUTE_CONNECTED_TO_WORKSPACE_CENTER" as const;

export const WORKSPACE_USES_GLOBAL_APP_SHELL =
  "WORKSPACE_USES_GLOBAL_APP_SHELL" as const;

export default function WorkspacePage() {
  return (
    <div className="p-3">
      <div className="min-w-0 overflow-hidden rounded-2xl bg-white">
        <WorkspaceCenter />
      </div>
    </div>
  );
}
