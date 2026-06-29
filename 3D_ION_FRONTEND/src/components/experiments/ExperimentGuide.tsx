'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ExperimentGuideProps {
  onNext: () => void
}

export default function ExperimentGuide({ onNext }: ExperimentGuideProps) {
  const { t } = useTranslation()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const sections = [
    {
      id: 'flow',
      titleKey: 'experimentGuide.sections.flow.title',
      contentKey: 'experimentGuide.sections.flow.content'
    },
    {
      id: 'material',
      titleKey: 'experimentGuide.sections.material.title',
      contentKey: 'experimentGuide.sections.material.content'
    },
    {
      id: 'sample',
      titleKey: 'experimentGuide.sections.sample.title',
      contentKey: 'experimentGuide.sections.sample.content'
    },
    {
      id: 'infill',
      titleKey: 'experimentGuide.sections.infill.title',
      contentKey: 'experimentGuide.sections.infill.content'
    },
    {
      id: 'mechanical',
      titleKey: 'experimentGuide.sections.mechanical.title',
      contentKey: 'experimentGuide.sections.mechanical.content'
    },
    {
      id: 'attenuation',
      titleKey: 'experimentGuide.sections.attenuation.title',
      contentKey: 'experimentGuide.sections.attenuation.content'
    },
    {
      id: 'beam',
      titleKey: 'experimentGuide.sections.beam.title',
      contentKey: 'experimentGuide.sections.beam.content'
    }
  ]

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-900">
          {t('experimentGuide.welcome')}
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">{t(section.titleKey)}</h3>
              <ChevronDown
                className={`w-5 h-5 text-gray-600 transition-transform ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`}
              />
            </button>
            {expandedSection === section.id && (
              <div className="p-4 bg-white border-t border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {t(section.contentKey)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
      >
        {t('experimentGuide.buttons.start')}
      </button>
    </div>
  )
}
