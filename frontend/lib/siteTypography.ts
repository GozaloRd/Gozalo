/**
 * Clases para cuerpo de texto en rutas públicas `(site)` (Playfair vía layout).
 */

export const siteBodyTextClass =
  "text-[16px] font-normal leading-[1.75] text-white/72 md:text-[17px] md:leading-[1.8]";

export const siteBodyMutedClass =
  "text-[16px] font-normal leading-[1.75] text-white/60 md:text-[17px] md:leading-[1.8]";

/** Titulares de bloque en flujos (checkout, tarjetas), sin competir con el nombre del evento. Sans para alinear con resumen/importes. */
export const siteSectionTitleClass =
  "font-sans text-[18px] font-normal leading-snug text-white md:text-[19px]";

/**
 * Checkout paso 2 — dígito de cantidad (misma familia que importes RD$ en resumen).
 * El tamaño en rem va por `style.fontSize` en el cliente por fiabilidad.
 */
export const siteQtyNumberClass =
  "select-none font-sans tabular-nums antialiased tracking-wide font-normal text-white/95";

/**
 * Lista de montos en checkout (Resumen): sans del sistema para cifras claras,
 * proporciones más «redondeadas» que Playfair.
 */
export const siteCheckoutFiguresSansClass =
  "font-sans tabular-nums antialiased tracking-wide";

/** Filas numéricas del Resumen: cifras algo más compactas que el cuerpo general. */
export const siteCheckoutSummaryRowsClass =
  "text-[12px] leading-snug sm:text-[13px] md:text-[14px]";

/** Grid etiqueta + importe: columna derecha fija mínimo para alinear todas las cantidades RD$. */
export const siteCheckoutSummaryGridClass =
  "grid grid-cols-[minmax(0,1fr)_minmax(8.75rem,max-content)] items-center gap-x-5";

/** Celda derecha estándar (importes intermedios). */
export const siteCheckoutSummaryAmountCellClass =
  "text-right tabular-nums whitespace-nowrap text-white/88";

/** Celda derecha total (contraste alto). */
export const siteCheckoutSummaryTotalCellClass =
  "text-right tabular-nums whitespace-nowrap font-semibold text-white";
