"use client";

import GozaloSiteLogo, { type GozaloSiteLogoProps } from "./GozaloSiteLogo";

/** @deprecated Prefer `GozaloSiteLogo`; se mantiene para paneles dashboard / admin. */
export type LogoGProps = GozaloSiteLogoProps;

export default function LogoG(props: LogoGProps) {
  return <GozaloSiteLogo {...props} />;
}
