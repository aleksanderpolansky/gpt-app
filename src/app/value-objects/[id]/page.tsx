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

  return <ValueObjectCard valueObject={valueObject} />;
}
