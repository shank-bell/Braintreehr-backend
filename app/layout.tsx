import "./globals.css";

export const metadata = {
  title: "BrainTree HR — Admin",
  description: "BrainTree HR internal hiring portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
