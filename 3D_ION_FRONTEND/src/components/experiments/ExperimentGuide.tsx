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
      <div className="bg-primary-light border border-primary/30 rounded-lg p-4">
        <p className="text-primary">
          {t('experimentGuide.welcome')}
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((section) => (
          <div key={section.id} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className="w-full flex items-center justify-between p-4 bg-background hover:bg-slate-100 transition-colors"
            >
              <h3 className="font-semibold text-foreground">{t(section.titleKey)}</h3>
              <ChevronDown
                className={`w-5 h-5 text-muted transition-transform ${
                  expandedSection === section.id ? 'rotate-180' : ''
                }`}
              />
            </button>
            {expandedSection === section.id && (
              <div className="p-4 bg-surface border-t border-border">
                <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                  {t(section.contentKey)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors"
      >
        {t('experimentGuide.buttons.start')}
      </button>
    </div>
  )
}
