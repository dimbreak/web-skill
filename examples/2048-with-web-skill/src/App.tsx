import { useEffect, useMemo, useRef } from 'react'
import { useGameStore } from './store/useGameStore'

const tileStyleMap: Record<number, string> = {
  0: 'bg-stone-700/40 text-transparent',
  2: 'bg-stone-100 text-stone-700',
  4: 'bg-amber-100 text-amber-900',
  8: 'bg-orange-300 text-orange-950',
  16: 'bg-orange-400 text-white',
  32: 'bg-orange-500 text-white',
  64: 'bg-red-500 text-white',
  128: 'bg-yellow-300 text-yellow-950',
  256: 'bg-yellow-400 text-yellow-950',
  512: 'bg-yellow-500 text-yellow-950',
  1024: 'bg-emerald-400 text-emerald-950',
  2048: 'bg-emerald-500 text-white',
}

function App() {
  const grid = useGameStore((state) => state.grid)
  const score = useGameStore((state) => state.score)
  const bestScore = useGameStore((state) => state.bestScore)
  const moveCount = useGameStore((state) => state.moveCount)
  const status = useGameStore((state) => state.status)
  const lastAction = useGameStore((state) => state.lastAction)
  const restartGame = useGameStore((state) => state.restartGame)
  const undo = useGameStore((state) => state.undo)
  const handleKeyboardInput = useGameStore((state) => state.handleKeyboardInput)
  const handleSwipe = useGameStore((state) => state.handleSwipe)

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const changedCells = useMemo(() => {
    const nextChangedCells = new Set<string>()
    if (!lastAction) {
      return nextChangedCells
    }

    for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
      for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex += 1) {
        if (grid[rowIndex][colIndex] !== 0) {
          nextChangedCells.add(`${rowIndex}-${colIndex}`)
        }
      }
    }

    return nextChangedCells
  }, [grid, lastAction])

  const moveAnimationClass =
    lastAction === 'move_left'
      ? 'tile-move-left'
      : lastAction === 'move_right'
        ? 'tile-move-right'
        : lastAction === 'move_up'
          ? 'tile-move-up'
          : lastAction === 'move_down'
            ? 'tile-move-down'
            : ''

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const used = handleKeyboardInput(event.key)
      if (used) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [handleKeyboardInput])

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7f3d6,_#dfcc9c_40%,_#c8af72)] px-4 py-8 text-stone-800">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-stone-700/20 bg-stone-50/80 p-5 shadow-[0_14px_40px_rgba(50,34,0,0.25)] backdrop-blur-sm sm:p-7">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-5xl font-bold tracking-tight text-stone-900">
              2048
            </h1>
            <p className="mt-1 text-sm text-stone-700">
              Arrow keys / WASD to move, U to undo, R to restart
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-stone-700">
            <div className="rounded-xl bg-stone-800 px-3 py-2 text-stone-100">
              <div>Score</div>
              <div className="text-lg text-white">{score}</div>
            </div>
            <div className="rounded-xl bg-stone-800 px-3 py-2 text-stone-100">
              <div>Best</div>
              <div className="text-lg text-white">{bestScore}</div>
            </div>
            <div className="rounded-xl bg-stone-800 px-3 py-2 text-stone-100">
              <div>Moves</div>
              <div className="text-lg text-white">{moveCount}</div>
            </div>
          </div>
        </header>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-700"
            onClick={restartGame}
          >
            New Game
          </button>
          <button
            type="button"
            className="rounded-xl bg-stone-700 px-4 py-2 text-sm font-semibold text-stone-100 transition hover:bg-stone-600"
            onClick={undo}
          >
            Undo
          </button>
          <div className="ml-auto flex items-center text-sm font-medium text-stone-700">
            {status === 'won' && 'You reached 2048. Keep going!'}
            {status === 'over' && 'Game over. Press New Game.'}
            {status === 'playing' && 'In progress'}
          </div>
        </div>

        <div
          className="grid touch-none grid-cols-4 gap-2 rounded-2xl bg-stone-800 p-2 sm:gap-3 sm:p-3"
          onTouchStart={(event) => {
            const touch = event.touches[0]
            touchStart.current = { x: touch.clientX, y: touch.clientY }
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current
            if (!start) {
              return
            }

            const touch = event.changedTouches[0]
            handleSwipe(touch.clientX - start.x, touch.clientY - start.y)
            touchStart.current = null
          }}
        >
          {grid.flatMap((row, rowIndex) =>
            row.map((value, colIndex) => {
              const colorClass =
                tileStyleMap[value] ?? 'bg-sky-500 text-white ring-2 ring-sky-300/50 ring-inset'

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`aspect-square rounded-xl font-display text-2xl font-bold shadow-inner transition ${colorClass} ${
                    value !== 0 && changedCells.has(`${rowIndex}-${colIndex}`) && moveAnimationClass
                      ? moveAnimationClass
                      : ''
                  } flex items-center justify-center sm:text-3xl`}
                >
                  {value === 0 ? '.' : value}
                </div>
              )
            }),
          )}
        </div>
      </section>
    </main>
  )
}

export default App
