import EnterprisePublicActivityPanel from "./EnterprisePublicActivityPanel";
import { getPublicEnterpriseMessages } from "@/lib/messages/enterpriseMessages.server";

type Props = {
  organizationId: string;
  organizationName: string;
  locale?: string;
  canPublish: boolean;
};

export default async function EnterprisePublicActivityContent({
  organizationId,
  organizationName,
  locale,
  canPublish,
}: Props) {
  const result = await getPublicEnterpriseMessages({
    organizationId,
    locale,
    limit: 12,
  });

  return (
    <EnterprisePublicActivityPanel
      organizationId={organizationId}
      organizationName={organizationName}
      locale={locale}
      canPublish={canPublish}
      messages={result.messages}
      errorMessage={result.errorMessage}
    />
  );
}
