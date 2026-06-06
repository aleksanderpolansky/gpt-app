import { ContextualAIColumn, getContextForRoute } from "../../components/workspace/contextual-ai";
import { WorkspaceCenter } from "../../components/workspace/workspace-center";

export const WORKSPACE_ROUTE_CONNECTED_TO_WORKSPACE_CENTER =
  "WORKSPACE_ROUTE_CONNECTED_TO_WORKSPACE_CENTER" as const;

export default function WorkspacePage() {
    const workspaceAIContext = getContextForRoute("/workspace");

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <WorkspaceCenter />
      </div>

      <ContextualAIColumn
        context={workspaceAIContext}
        className="hidden xl:flex"
      />
    </div>
  );
}

