'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/squad', label: 'Squad' },
    { href: '/tactics', label: 'Tactics' },
    { href: '/fixtures', label: 'Fixtures' },
    { href: '/league', label: 'League Table' },
  ];

  return (
    <>
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 hidden md:flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold tracking-tight text-white">FM XI</h1>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {links.map(l => (
            <Link 
              key={l.href} 
              href={l.href} 
              className={`block px-4 py-2 rounded-md transition ${pathname === l.href ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-zinc-800 text-zinc-300'}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>

      <header className="md:hidden p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
        <span className="font-bold text-white">FM XI</span>
        <div className="space-x-3 text-sm flex">
          {links.map(l => (
            <Link 
              key={l.href} 
              href={l.href}
              className={`transition ${pathname === l.href ? 'text-emerald-500 font-bold' : 'text-zinc-400'}`}
            >
              {l.label.substring(0, 4)}
            </Link>
          ))}
        </div>
      </header>
    </>
  );
}
