"use client";

import Script from "next/script";

/**
 * Loads icon fonts (Material Symbols + Font Awesome) asynchronously
 * after the page becomes interactive, removing them from the critical
 * render-blocking path and improving FCP/LCP scores.
 */
export function FontLoader() {
  return (
    <Script
      id="icon-fonts-loader"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  function addStylesheet(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
  addStylesheet('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');
  addStylesheet('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
})();
        `.trim(),
      }}
    />
  );
}
