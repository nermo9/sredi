import "./globals.css";
// Loaded at the layout level so routes outside the main page (payment result
// screens) get the shared button and card styling too.
import "./v3.css";

export const metadata = {
  title: "Sredi.ba",
  description: "Lokalna platforma za pomoć i poslove u BiH",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bs">
      <body>{children}</body>
    </html>
  );
}
