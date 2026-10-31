import Script from 'next/script'

/**
 * Google Tag (gtag.js) para Google Ads / Analytics. Se carga con `afterInteractive` para no bloquear el render.
 * El ID viene de NEXT_PUBLIC_GOOGLE_TAG_ID (G-XXXX o AW-XXXX); sin ID no se carga nada.
 */
export function GoogleTag() {
  const id = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID
  if (!id) return null
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-tag" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', '${id}');
      `}</Script>
    </>
  )
}
