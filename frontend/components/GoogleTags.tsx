import Script from "next/script";

function isGtmId(id: string) {
  return /^GTM-[A-Z0-9]+$/i.test(id);
}

function isGa4Id(id: string) {
  return /^G-[A-Z0-9]+$/i.test(id);
}

/**
 * Carga GTM y/o GA4 con `next/script` (sin @next/third-parties) para evitar
 * el chunk `third-party-capital` que en dev rompe con MODULE_NOT_FOUND y deja
 * 404 en /_next/static/... por caché .next desincronizada.
 */
export function GoogleTags() {
  const gtm = process.env.NEXT_PUBLIC_GTM_ID?.trim();
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  return (
    <>
      {gtm && isGtmId(gtm) && (
        <Script
          id="gtm-loader"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtm)});`,
          }}
        />
      )}
      {ga && isGa4Id(ga) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(ga)});`,
            }}
          />
        </>
      )}
    </>
  );
}
