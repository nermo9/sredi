import "./globals.css";

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
