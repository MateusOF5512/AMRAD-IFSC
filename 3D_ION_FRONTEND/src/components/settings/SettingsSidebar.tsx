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
    <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-border">
      <div className="p-4 md:p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 hidden md:block">
          {t('settings.title')}
        </h2>
        <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal',
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
