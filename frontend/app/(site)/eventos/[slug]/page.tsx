import { redirect } from "next/navigation";

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  redirect(`/e/${encodeURIComponent(params.slug)}`);
}
