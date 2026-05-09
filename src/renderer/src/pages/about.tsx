import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import BasePage from '@renderer/components/base/base-page'

const About: React.FC = () => {
  return (
    <BasePage title="Информация">
      <div className="px-4 pb-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Что это за приложение?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Slipgate</span> — это удобная
              программа для обхода блокировок и стабильной работы интернета. Она помогает
              получить доступ к сайтам и сервисам, которые работают плохо или совсем не
              работают из-за ограничений.
            </p>
            <p>
              Внутри программы есть две главные функции:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <span className="font-semibold text-foreground">Telegram</span> — встроенный
                прокси, который заставляет Telegram (и его звонки, видео, файлы) работать
                быстро и без обрывов, даже если он у вас тормозит или не подключается.
              </li>
              <li>
                <span className="font-semibold text-foreground">Zapret</span> — обходит
                блокировки сайтов и сервисов на уровне сетевых запросов. Включаете нужную
                стратегию и работают YouTube, Discord, игры и многое другое — без VPN и без
                замедлений.
              </li>
            </ul>
            <p>
              Включить или выключить любую функцию можно одной кнопкой на её вкладке. Если
              что-то перестало работать — просто переключите тумблер ещё раз.
            </p>
            <p>
              Программа работает в фоне: можно свернуть окно в трей и забыть про неё —
              интернет продолжит работать как нужно. Все настройки лежат в разделе
              «Настройки», а если что-то сломалось — на вкладке «Логи» видно, что произошло.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Создатели приложения</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold">lazzy &amp; cherry</p>
          </CardContent>
        </Card>
      </div>
    </BasePage>
  )
}

export default About
