import React from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import { Home as HomeIcon, ScrollText, Settings as SettingsIcon, Info as InfoIcon, PanelLeftClose, PanelLeft } from 'lucide-react'
import ZapretIcon from '@renderer/components/zapret-icon'
import TelegramIcon from '@renderer/components/telegram-icon'
import logoDark from '@renderer/assets/logo.png'
import logoLight from '@renderer/assets/logo_white.png'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@renderer/components/ui/sidebar'

const nav = [
  { key: 'home',     path: '/home',     icon: HomeIcon,     label: 'Главная' },
  { key: 'telegram', path: '/telegram', icon: TelegramIcon, label: 'Telegram' },
  { key: 'zapret',   path: '/zapret',   icon: ZapretIcon,   label: 'Zapret' },
  { key: 'logs',     path: '/logs',     icon: ScrollText,   label: 'Логи' },
  { key: 'settings', path: '/settings', icon: SettingsIcon, label: 'Настройки' },
  { key: 'about',    path: '/about',    icon: InfoIcon,     label: 'Информация' }
]

const AppSidebar: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { toggleSidebar, state } = useSidebar()
  // `useTheme` from next-themes is reactive: when the user flips light/dark
  // in Settings the hook re-renders this component immediately, swapping
  // the <img src=...> live without an app restart.
  const { resolvedTheme } = useTheme()
  const collapsed = state === 'collapsed'
  const logoSrc = resolvedTheme === 'light' ? logoLight : logoDark

  return (
    <Sidebar collapsible="icon" side="left" variant="floating">
      <SidebarHeader className="h-14.25 p-0 flex items-center justify-center shrink-0">
        <img
          src={logoSrc}
          alt="Slipgate"
          draggable={false}
          className="h-9 w-9 object-contain select-none pointer-events-none"
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      className="cursor-pointer"
                      tooltip={item.label}
                      isActive={isActive}
                      onClick={() => navigate(item.path)}
                    >
                      <Icon className="size-4" />
                      <span>{t(`sider.${item.key}`, { defaultValue: item.label })}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={collapsed ? 'Развернуть' : 'Свернуть'}
              onClick={toggleSidebar}
              className="cursor-pointer"
            >
              {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
              <span>{collapsed ? 'Развернуть' : 'Свернуть'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
