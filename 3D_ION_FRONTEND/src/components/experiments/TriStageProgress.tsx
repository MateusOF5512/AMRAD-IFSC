'use client'

import { CheckCircle2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/Card'

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
    <Card elevated className="mb-6 sm:mb-8">
      <CardContent className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-2 mb-6 sm:mb-8">
          {stages.map((stage, index) => (
            <div key={stage.name} className="flex flex-col md:flex-row md:items-center md:w-full">
              <div className="relative flex flex-row md:flex-col items-center md:items-center gap-4 md:gap-0 md:flex-1 w-full">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-base sm:text-lg shrink-0 md:mb-3 transition-all ${
                    stage.completed
                      ? 'bg-primary-muted text-primary border-2 border-primary'
                      : 'bg-slate-100 text-muted border-2 border-border'
                  }`}
                >
                  {stage.completed ? <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" /> : stage.icon}
                </div>

                <div className="flex-1 min-w-0 md:text-center">
                  <h3
                    className={`text-sm font-semibold ${
                      stage.completed ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {stage.name}
                  </h3>

                  <div className="mt-2 md:mt-3 text-xs text-muted space-y-1">
                    {stage.sections.map((section) => (
                      <div
                        key={section.id}
                        className={section.completed ? 'text-primary font-medium' : 'text-muted'}
                      >
                        {section.completed ? '✓' : '○'} {section.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {index < stages.length - 1 && (
                <div className="hidden md:flex flex-shrink-0 px-3 justify-center">
                  <div
                    className={`p-2 rounded-full transition-all ${
                      stage.completed ? 'bg-primary-muted' : 'bg-slate-100'
                    }`}
                  >
                    <ArrowRight
                      className={`w-8 h-8 lg:w-10 lg:h-10 transition-all ${
                        stage.completed ? 'text-primary' : 'text-slate-400'
                      }`}
                      strokeWidth={2}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4 sm:pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted">{t('progress.label')}</p>
              <p className="text-base sm:text-lg font-bold text-foreground">
                {completedCount}/{totalStages}{' '}
                {t('progress.stagesComplete', { count: completedCount })}
              </p>
            </div>

            <div className="flex-1 sm:mx-6 w-full">
              <div className="w-full bg-slate-200 rounded-full h-2.5 sm:h-3">
                <div
                  className="bg-primary h-2.5 sm:h-3 rounded-full transition-all"
                  style={{ width: `${(completedCount / totalStages) * 100}%` }}
                />
              </div>
            </div>

            <div className="sm:text-right">
              <p className="text-xl sm:text-2xl font-bold text-primary">
                {Math.round((completedCount / totalStages) * 100)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
