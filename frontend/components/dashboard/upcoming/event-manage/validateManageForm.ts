import type { ManageFormState } from "@/components/dashboard/upcoming/event-manage/buildUpdateBody";

export type CheckKey =
  | "name"
  | "datetime"
  | "cover"
  | "banner"
  | "description"
  | "tickets"
  | "capacity"
  | "location";

export function validateManageForm(form: ManageFormState): {
  checks: Record<CheckKey, boolean>;
  missingCount: number;
  readyToPublish: boolean;
} {
  const hasTickets = form.ticketRows.some(
    (r) => r.active && r.name.trim() && parseFloat(r.price) >= 0
  );
  const checks: Record<CheckKey, boolean> = {
    name: form.title.trim().length > 1,
    datetime:
      !!form.startAt &&
      !!form.endAt &&
      !Number.isNaN(new Date(form.startAt).getTime()) &&
      !Number.isNaN(new Date(form.endAt).getTime()) &&
      new Date(form.startAt).getTime() < new Date(form.endAt).getTime(),
    cover: !!form.coverImageUrl.trim(),
    banner: !!form.bannerUrl.trim() || form.galleryImages.length > 0,
    description: (form.description?.trim().length ?? 0) > 15,
    tickets: hasTickets,
    capacity: !!form.maxCapacity.trim() && parseInt(form.maxCapacity, 10) > 0,
    location: (form.city?.trim().length ?? 0) > 1,
  };

  const missingCount = (Object.keys(checks) as CheckKey[]).filter((k) => !checks[k]).length;
  const readyToPublish = missingCount === 0;

  return { checks, missingCount, readyToPublish };
}
