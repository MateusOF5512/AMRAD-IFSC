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
    <Card elevated className="mb-8">
      <CardContent>
        <div className="flex items-center justify-between gap-2 mb-8">
          {stages.map((stage, index) => (
            <div key={stage.name} className="flex items-center w-full">
              <div className="relative flex flex-col items-center flex-1">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg mb-3 transition-all ${
                    stage.completed
                      ? 'bg-primary-muted text-primary border-2 border-primary'
                      : 'bg-slate-100 text-muted border-2 border-border'
                  }`}
                >
                  {stage.completed ? <CheckCircle2 className="w-7 h-7" /> : stage.icon}
                </div>

                <h3
                  className={`text-sm font-semibold text-center ${
                    stage.completed ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {stage.name}
                </h3>

                <div className="mt-3 text-xs text-muted text-center space-y-1">
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

              {index < stages.length - 1 && (
                <div className="flex-shrink-0 px-3 flex justify-center">
                  <div
                    className={`p-2 rounded-full transition-all ${
                      stage.completed ? 'bg-primary-muted' : 'bg-slate-100'
                    }`}
                  >
                    <ArrowRight
                      className={`w-10 h-10 transition-all ${
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

        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">{t('progress.label')}</p>
              <p className="text-lg font-bold text-foreground">
                {completedCount}/{totalStages}{' '}
                {t('progress.stagesComplete', { count: completedCount })}
              </p>
            </div>

            <div className="flex-1 mx-8">
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${(completedCount / totalStages) * 100}%` }}
                />
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {Math.round((completedCount / totalStages) * 100)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
