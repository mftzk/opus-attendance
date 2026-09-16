"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/classes", label: "Classes" },
  { href: "/students", label: "Students" },
  { href: "/attendance", label: "Attendance" },
  { href: "/settings", label: "Settings" },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <nav className="nav">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)
        return (
          <Link key={link.href} href={link.href} className="nav-link" data-active={active}>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
