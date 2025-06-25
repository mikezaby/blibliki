export function ColorSchemeBlockingScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  try {
    var theme = localStorage.getItem('color-scheme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (theme === "system" && systemDark)) {
      document.documentElement.classList.add('dark');
    } 
  } catch (e) {}
})();
        `.trim(),
      }}
    />
  );
}
