import useGame from '../store/useGame.js'

// Destacado contextual — mismo estilo visual que el Tip de HelpScreen.jsx
// (bg-volt-dim + borde volt + 💡), pero descartable y con memoria propia:
// aparece una sola vez por pantalla clave (ver onboarding.seenScreenTips).
export default function ScreenTip({ screenKey, children, className = 'mb-4' }) {
  const seen = useGame(s => s.onboarding.seenScreenTips[screenKey])
  const dismissScreenTip = useGame(s => s.dismissScreenTip)

  if (seen) return null

  return (
    <div className={`flex items-start gap-2.5 bg-volt-dim border border-volt rounded-lg p-3.5 ${className}`}>
      <span className="text-sm shrink-0">💡</span>
      <p className="font-data text-volt text-xs leading-relaxed flex-1">{children}</p>
      <button
        onClick={() => dismissScreenTip(screenKey)}
        aria-label="Cerrar"
        className="text-volt text-xs shrink-0 active:opacity-70"
      >
        ✕
      </button>
    </div>
  )
}
