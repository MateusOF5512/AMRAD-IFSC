'use client'

import { useState } from 'react'
import { User, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
      icon: <User className="h-5 w-5" />
    },
    {
      id: 'system',
      label: t('settings.sidebar.system'),
      icon: <Settings className="h-5 w-5" />
    }
  ]

  return (
    <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200">
      <div className="p-4 md:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 hidden md:block">
          {t('settings.title')}
        </h2>
        <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap md:whitespace-normal ${
                activeTab === tab.id
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
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
