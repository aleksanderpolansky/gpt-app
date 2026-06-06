import { ContextualAIColumn, getContextForRoute } from "../../../components/workspace/contextual-ai";
import {
  getValueObjectCardFixtureById,
  ValueObjectCard,
} from "../../../components/workspace/value-object-card";

type ValueObjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ValueObjectDetailPage({
  params,
}: ValueObjectDetailPageProps) {
  const { id } = await params;
  const valueObject = getValueObjectCardFixtureById(id);
  const objectDetailAIContext = getContextForRoute("/objects/detail");

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-3">
      <div className="min-w-0 xl:col-span-2">
        <ValueObjectCard valueObject={valueObject} />
      </div>

      <ContextualAIColumn
        context={objectDetailAIContext}
        className="hidden xl:flex"
      />
    </div>
  );
}
