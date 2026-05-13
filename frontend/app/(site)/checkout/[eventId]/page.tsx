import { Suspense } from "react";
import { PurchaseFlowEmbeddedCard } from "@/components/public-event/PurchaseFlowTransition";
import { getEventCoverImageUrl } from "@/lib/eventCoverImage";
import { fetchPublicEventById } from "@/lib/publicApi";
import { CheckoutClient } from "./CheckoutClient";

function CheckoutLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <PurchaseFlowEmbeddedCard title="Preparando checkout…" subtitle="Cargando pago seguro" icon="ticket" />
    </div>
  );
}

export default async function CheckoutPage({ params }: { params: { eventId: string } }) {
  const event = await fetchPublicEventById(params.eventId);
  const initialCoverForTheme = event ? getEventCoverImageUrl(event) : null;

  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutClient eventId={params.eventId} initialCoverForTheme={initialCoverForTheme} />
    </Suspense>
  );
}
