'use client'

import { User, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

interface Tab {
  id: string
  label: string
  icon: React.ReactNode
}

interface SettingsSidebarProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  const { t } = useTranslation()
  const tabs: Tab[] = [
    {
      id: 'personal',
      label: t('settings.sidebar.personalData'),
      icon: <User className="h-5 w-5" />,
    },
    {
      id: 'system',
      label: t('settings.sidebar.system'),
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  return (
    <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-border shrink-0">
      <div className="p-3 sm:p-4 md:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-6 hidden md:block">
          {t('settings.title')}
        </h2>
        <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal min-h-11 shrink-0 md:shrink md:w-full',
                activeTab === tab.id
                  ? 'bg-primary-light text-primary'
                  : 'text-foreground hover:bg-slate-100'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  )
}
