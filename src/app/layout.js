import './globals.css';
import AppLayout from './AppLayout';

export const metadata = {
  title: 'Accounts Online',
  description: 'Track and manage your expenses and income efficiently.',
  icons: {
    icon: '/images/LOGO.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-gray-100 min-h-screen text-gray-900">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
