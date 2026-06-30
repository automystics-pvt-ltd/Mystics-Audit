/**
 * Opens a new browser window with the given content and triggers the print dialog.
 * This approach works even when the app is embedded inside an iframe (e.g. Replit preview),
 * where window.print() is blocked by the browser.
 *
 * @param contentHtml  The HTML string to render in the print window
 * @param title        Window/document title shown in the print dialog
 * @param extraStyles  Optional additional CSS injected after the copied stylesheets
 */
export function printViaNewWindow(
  contentHtml: string,
  title = "Print",
  extraStyles = ""
) {
  const win = window.open("", "_blank", "width=960,height=720");
  if (!win) {
    console.warn("Popup blocked — falling back to window.print()");
    window.print();
    return;
  }

  // Copy all <style> and <link rel="stylesheet"> tags from the current document
  // so Tailwind / shadcn classes render correctly in the new window.
  const headStyles = Array.from(document.head.children)
    .filter(
      (el) =>
        el.tagName === "STYLE" ||
        (el.tagName === "LINK" &&
          (el as HTMLLinkElement).rel === "stylesheet")
    )
    .map((el) => el.outerHTML)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  ${headStyles}
  <style>
    /* Reset chrome for print window */
    body { margin: 0; padding: 0; background: white !important; }
    @media screen { body { padding: 24px; } }
    /* Hide any residual scroll bars */
    ::-webkit-scrollbar { display: none; }
    ${extraStyles}
  </style>
</head>
<body>
${contentHtml}
<script>
  // Wait for all linked stylesheets to load, then print.
  var sheets = document.querySelectorAll('link[rel="stylesheet"]');
  var loaded = 0;
  if (sheets.length === 0) {
    setTimeout(function () { window.print(); }, 400);
  } else {
    sheets.forEach(function (s) {
      s.addEventListener('load', function () {
        loaded++;
        if (loaded === sheets.length) {
          setTimeout(function () { window.print(); }, 400);
        }
      });
      s.addEventListener('error', function () {
        loaded++;
        if (loaded === sheets.length) {
          setTimeout(function () { window.print(); }, 400);
        }
      });
    });
  }
<\/script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

/**
 * Convenience wrapper: grabs the outerHTML of a DOM element by id,
 * then opens a print window with it.
 */
export function printElementById(
  id: string,
  title = "Print",
  extraStyles = ""
) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`printElementById: element #${id} not found`);
    return;
  }
  printViaNewWindow(el.outerHTML, title, extraStyles);
}

/**
 * Grabs the nearest printable report content (wraps the main content area)
 * and opens it in a clean print window with all app styles.
 */
export function printReportPage(title = "Report") {
  // The Layout renders content inside <main> → <div class="max-w-7xl mx-auto">
  const main = document.querySelector("main");
  const content = main?.querySelector("div") ?? main;
  if (!content) {
    window.print();
    return;
  }
  printViaNewWindow(content.outerHTML, title);
}
