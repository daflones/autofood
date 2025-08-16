 import { useEffect, useState } from 'react'

// Minimal PWA install prompt banner for Android (beforeinstallprompt)
// and iOS (manual Add to Home Screen instructions).
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null)
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const ua = window.navigator.userAgent || ''
    const iOS = /iPhone|iPad|iPod/i.test(ua)
    setIsIOS(iOS)
    // @ts-ignore
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    const onBIP = (e: any) => {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBIP as any)
    return () => window.removeEventListener('beforeinstallprompt', onBIP as any)
  }, [])

  useEffect(() => {
    // Show iOS instruction if iOS Safari and not already installed
    if (isIOS && !isStandalone) setVisible(true)
  }, [isIOS, isStandalone])

  if (!visible) return null

  const installAndroid = async () => {
    if (!deferred) return setVisible(false)
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
    // You could track choice.outcome here
  }

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-[9999] w-[calc(100%-1.5rem)] sm:w-auto max-w-md">
      <div className="af-card-elev ring-1 ring-white/10 px-4 py-3 rounded-xl shadow-lg bg-[rgba(8,12,20,0.9)] backdrop-blur">
        {isIOS && !isStandalone ? (
          <div className="text-white text-sm leading-relaxed">
            <div className="font-semibold mb-1">Instale o app</div>
            Abra no Safari e toque em <span className="font-semibold">Compartilhar</span> (ícone de seta) e depois em <span className="font-semibold">Adicionar à Tela de Início</span>.
            <div className="mt-2 flex justify-end gap-2">
              <button className="af-btn-ghost px-3 py-1.5 text-sm" onClick={() => setVisible(false)}>Agora não</button>
            </div>
          </div>
        ) : (
          <div className="text-white text-sm leading-relaxed">
            <div className="font-semibold mb-1">Instale o app</div>
            Adicione o AutomaFood à tela inicial para uma experiência completa.
            <div className="mt-2 flex justify-end gap-2">
              <button className="af-btn-ghost px-3 py-1.5 text-sm" onClick={() => setVisible(false)}>Agora não</button>
              <button className="af-btn-primary px-3 py-1.5 text-sm" onClick={installAndroid}>Instalar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
