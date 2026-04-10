'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { type User } from '@supabase/supabase-js'
import { type Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Building2, LayoutDashboard, Users, LogOut, KeyRound, ChevronDown } from 'lucide-react'

const adminNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/benutzer', label: 'Benutzer', icon: Users },
]

const approverNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

interface AppHeaderProps {
  user: User
  profile: Profile | null
}

export function AppHeader({ user, profile }: AppHeaderProps) {
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin'
  const navItems = isAdmin ? adminNavItems : approverNavItems

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? 'U'

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="bg-indigo-600 rounded-lg p-1.5">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-slate-800 hidden sm:block">
                Rechnungsworkflow
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:block">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium text-slate-700 leading-none">
                    {profile?.display_name ?? user.email}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={`hidden sm:inline-flex text-xs ${
                    isAdmin
                      ? 'border-indigo-200 text-indigo-700 bg-indigo-50'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'Freigeber'}
                </Badge>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.display_name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/konto/passwort" className="flex items-center gap-2 cursor-pointer">
                  <KeyRound className="h-4 w-4" />
                  Passwort ändern
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
