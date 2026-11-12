/**
 * Inline script that runs before first paint to prevent a flash of
 * wrong theme. Reads the `theme` cookie, resolves system preference
 * if needed, and sets the `dark` class and `data-theme` attribute
 * on <html>.
 *
 * This is a Server Component — it renders a <script> tag with an IIFE
 * that executes synchronously before React hydrates.
 */

export function ThemeScript() {
  const script = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);var t=m?m[1]:"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}

