import PurchaseConfirmationRequestCard from "@/components/commercial/PurchaseConfirmationRequestCard";

type DirectoryPurchaseConfirmationFormProps = {
  organizationId: string;
  organizationDefaultCurrency: string | null;
  locale?: string;
  className?: string;
};

export default function DirectoryPurchaseConfirmationForm({
  organizationId,
  organizationDefaultCurrency,
  locale = "en",
  className,
}: DirectoryPurchaseConfirmationFormProps) {
  return (
    <PurchaseConfirmationRequestCard
      organizationId={organizationId}
      organizationDefaultCurrency={organizationDefaultCurrency}
      locale={locale}
      className={className}
    />
  );
}
