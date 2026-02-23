import { site as baseSite } from "../data/site";
import type { AdminData, AdminSettings } from "./admin/types";

function pickSetting(value: string | undefined, fallback: string) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : fallback;
}

function mergeSettings(base: typeof baseSite, settings?: AdminSettings | null) {
  if (!settings) {
    return base;
  }
  return {
    ...base,
    city: pickSetting(settings.city, base.city),
    social: {
      label: pickSetting(settings.socialLabel, base.social.label),
      url: pickSetting(settings.socialUrl, base.social.url),
      text: pickSetting(settings.socialText, base.social.text),
    },
  };
}

export function mergeSiteData(adminData?: Partial<AdminData> | null) {
  const withSettings = mergeSettings(baseSite, adminData?.settings);
  const pricing = Array.isArray(adminData?.pricing) && adminData?.pricing?.length
    ? adminData.pricing
    : baseSite.pricing;
  return {
    ...withSettings,
    pricing,
  };
}

export type SiteContent = ReturnType<typeof mergeSiteData>;
