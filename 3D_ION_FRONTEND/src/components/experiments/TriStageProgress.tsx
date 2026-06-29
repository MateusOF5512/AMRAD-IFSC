'use client'

import { CheckCircle2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface StageProgress {
  name: string
  icon: string
  sections: {
    id: string
    name: string
    completed: boolean
  }[]
  completed: boolean
}

interface TriStageProgressProps {
  stages: StageProgress[]
}

export default function TriStageProgress({ stages }: TriStageProgressProps) {
  const { t } = useTranslation()
  const completedCount = stages.filter((s) => s.completed).length
  const totalStages = stages.length

  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-8">
      {/* Main Progress Track */}
      <div className="flex items-center justify-between gap-2 mb-8">
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex items-center w-full">
            {/* Stage Circle */}
            <div className="relative flex flex-col items-center flex-1">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg mb-3 transition-all ${
                  stage.completed
                    ? 'bg-green-100 text-green-700 border-2 border-green-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
                }`}
              >
                {stage.completed ? <CheckCircle2 className="w-7 h-7" /> : stage.icon}
              </div>

              {/* Stage Name */}
              <h3
                className={`text-sm font-semibold text-center ${
                  stage.completed ? 'text-green-700' : 'text-gray-700'
                }`}
              >
                {stage.name}
              </h3>

              {/* Stage Sections List */}
              <div className="mt-3 text-xs text-gray-600 text-center space-y-1">
                {stage.sections.map((section) => (
                  <div
                    key={section.id}
                    className={`${
                      section.completed ? 'text-green-600 font-medium' : 'text-gray-500'
                    }`}
                  >
                    {section.completed ? '✓' : '○'} {section.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow Connector */}
            {index < stages.length - 1 && (
              <div className="flex-shrink-0 px-3 flex justify-center">
                <div className={`p-2 rounded-full transition-all ${
                  stage.completed ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <ArrowRight
                    className={`w-10 h-10 transition-all ${
                      stage.completed ? 'text-green-600' : 'text-gray-400'
                    }`}
                    strokeWidth={2}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Summary */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{t('progress.label')}</p>
            <p className="text-lg font-bold text-gray-900">
              {completedCount}/{totalStages} {t('progress.stagesComplete', { count: completedCount })}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 mx-8">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${(completedCount / totalStages) * 100}%` }}
              />
            </div>
          </div>

          {/* Percentage */}
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">
              {Math.round((completedCount / totalStages) * 100)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
