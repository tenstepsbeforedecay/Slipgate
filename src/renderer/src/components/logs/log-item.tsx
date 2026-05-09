import { Card, CardContent, CardHeader } from '@renderer/components/ui/card'
import React from 'react'

const colorMap = {
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-primary',
  debug: 'text-muted-foreground'
}
const LogItem: React.FC<ControllerLog & { index: number }> = (props) => {
  const { type, payload, time, index } = props
  return (
    <div className={`select-text px-2 pb-2 ${index === 0 ? 'pt-2' : ''}`}>
      <Card className="gap-0 py-0">
        <CardHeader className="pb-0 pt-1 px-3 gap-1">
          <div className={`mr-2 text-lg font-bold ${colorMap[type]}`}>
            {props.type.toUpperCase()}
          </div>
          <small className="text-muted-foreground">{time}</small>
        </CardHeader>
        <CardContent className="flag-emoji pt-0 text-sm px-3 pb-2">{payload}</CardContent>
      </Card>
    </div>
  )
}

export default LogItem
