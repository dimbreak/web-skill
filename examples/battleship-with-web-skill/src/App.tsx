import { Fragment, useEffect } from 'react'
import {
  useGameStore,
  type ToolType,
} from './store/gameStore'

const toolLabels: Record<ToolType, string> = {
  single: 'Single Shot',
  radar: '3x3 Radar',
  crossBomb: 'X-Shaped Bomb',
}

const deploymentPlan = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
] as const

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function App() {
  const {
    boardSize,
    playerBoard,
    enemyBoard,
    playerItems,
    radarPings,
    turn,
    phase,
    selectedTool,
    placementOrientation,
    nextShipToPlaceIndex,
    attackEffect,
    logs,
    startNewGame,
    setPlacementOrientation,
    placeNextShipAt,
    autoPlacePlayerShips,
    selectTool,
    playerActionAt,
    toggleEnemyMarkAt,
    aiTakeTurn,
  } = useGameStore()

  useEffect(() => {
    if (phase !== 'playing' || turn !== 'ai') {
      return
    }

    const timer = window.setTimeout(() => {
      aiTakeTurn()
    }, 650)

    return () => window.clearTimeout(timer)
  }, [aiTakeTurn, phase, turn])

  const phaseText =
    phase === 'placing'
      ? 'Deploy your fleet'
      : phase === 'player_won'
        ? 'You won'
        : phase === 'ai_won'
          ? 'AI won'
          : turn === 'player'
            ? 'Your turn'
            : 'AI is thinking...'

  const radarLeft = playerItems.radar
  const bombLeft = playerItems.crossBomb
  const gameEnded = phase === 'player_won' || phase === 'ai_won'
  const winnerTitle = phase === 'player_won' ? 'Victory' : 'Defeat'
  const winnerSubtitle =
    phase === 'player_won'
      ? 'All enemy ships have been destroyed.'
      : 'Your fleet has been sunk.'

  const pendingShip = deploymentPlan[nextShipToPlaceIndex] ?? null
  const remainingShips = deploymentPlan.length - nextShipToPlaceIndex

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#b7e07a_0%,#8dbd44_38%,#547b24_100%)] px-4 py-6 text-[#0b2200] md:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl border-4 border-[#143100] bg-[#d4e89f]/90 p-4 shadow-[10px_10px_0_#223d0d] md:p-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#2f4f17] pb-4">
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-tight md:text-3xl">BATTLESHIP GB</h1>
            <p className="mt-1 text-sm font-semibold">{phaseText}</p>
          </div>
          <button
            className="rounded border-2 border-[#1d3b09] bg-[#9ec34c] px-4 py-2 font-mono text-sm font-bold hover:bg-[#b6d35f]"
            onClick={startNewGame}
            type="button"
          >
            New Game
          </button>
        </header>

        {phase === 'placing' && (
          <section className="mb-5 grid gap-3 border-2 border-[#2f4f17] bg-[#c5e18a] p-3 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-mono text-sm font-bold">Fleet Deployment</h2>
              <p className="mt-1 text-xs font-semibold">
                {pendingShip
                  ? `Place ${pendingShip.name} (${pendingShip.length}) on your board.`
                  : 'All ships deployed.'}
              </p>
              <p className="mt-1 text-xs font-semibold">
                Remaining ships to place: {remainingShips}
              </p>
              <p className="mt-1 text-xs">Ships must keep at least one-cell spacing (including diagonals).</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OrientationButton
                label="Horizontal"
                active={placementOrientation === 'horizontal'}
                onClick={() => setPlacementOrientation('horizontal')}
              />
              <OrientationButton
                label="Vertical"
                active={placementOrientation === 'vertical'}
                onClick={() => setPlacementOrientation('vertical')}
              />
              <button
                className="rounded border-2 border-[#1d3b09] bg-[#9ec34c] px-3 py-2 font-mono text-xs font-bold hover:bg-[#b6d35f]"
                onClick={autoPlacePlayerShips}
                type="button"
              >
                Auto Deploy
              </button>
            </div>
          </section>
        )}

        {phase !== 'placing' && (
          <section className="mb-5 grid gap-3 border-2 border-[#2f4f17] bg-[#b6d876] p-3 md:grid-cols-3">
            <ToolButton
              disabled={turn !== 'player' || phase !== 'playing'}
              active={selectedTool === 'single'}
              label={toolLabels.single}
              countLabel="Unlimited"
              onClick={() => selectTool('single')}
            />
            <ToolButton
              disabled={radarLeft <= 0 || turn !== 'player' || phase !== 'playing'}
              active={selectedTool === 'radar'}
              label={toolLabels.radar}
              countLabel={`${radarLeft}`}
              onClick={() => selectTool('radar')}
            />
            <ToolButton
              disabled={bombLeft <= 0 || turn !== 'player' || phase !== 'playing'}
              active={selectedTool === 'crossBomb'}
              label={toolLabels.crossBomb}
              countLabel={`${bombLeft}`}
              onClick={() => selectTool('crossBomb')}
            />
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-2">
          <BoardView
            title="Enemy Board"
            boardSize={boardSize}
            isEnemy
            onCellClick={playerActionAt}
            phase={phase}
            turn={turn}
            cells={enemyBoard.cells}
            radarPings={radarPings}
            attackEffect={attackEffect?.board === 'enemy' ? attackEffect : null}
            onCellRightClick={toggleEnemyMarkAt}
          />
          <BoardView
            title="Your Board"
            boardSize={boardSize}
            isEnemy={false}
            onCellClick={placeNextShipAt}
            phase={phase}
            turn={turn}
            cells={playerBoard.cells}
            radarPings={[]}
            attackEffect={attackEffect?.board === 'player' ? attackEffect : null}
            onCellRightClick={() => undefined}
          />
        </section>

        <section className="mt-5 grid gap-2 border-2 border-[#2f4f17] bg-[#c5e18a] p-3 text-xs font-semibold md:grid-cols-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-[#ff3b30]" />
            Hit
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-[#1d9bf0]" />
            Miss
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-[#6f7f8c]" />
            Unknown Water (right-click: ? / !)
          </div>
        </section>

        <section className="mt-5 border-2 border-[#2f4f17] bg-[#c5e18a] p-3">
          <h2 className="mb-2 font-mono text-sm font-bold">Battle Log</h2>
          <ul className="grid gap-1 text-xs leading-relaxed md:text-sm">
            {logs.map((log, index) => (
              <li key={`${index}-${log}`}>{log}</li>
            ))}
          </ul>
        </section>
      </div>
      {gameEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-sm rounded-xl border-4 border-[#143100] bg-[#e6f5bc] p-5 text-center shadow-[10px_10px_0_#223d0d]">
            <h2 className="font-mono text-3xl font-bold">{winnerTitle}</h2>
            <p className="mt-2 text-sm font-semibold">{winnerSubtitle}</p>
            <button
              className="mt-5 rounded border-2 border-[#1d3b09] bg-[#9ec34c] px-5 py-2 font-mono text-sm font-bold hover:bg-[#b6d35f]"
              onClick={startNewGame}
              type="button"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function OrientationButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`rounded border-2 px-3 py-2 font-mono text-xs font-bold ${
        active
          ? 'border-[#102500] bg-[#ebf8c6] shadow-[inset_0_0_0_2px_#53771d]'
          : 'border-[#37561f] bg-[#d5ec9f]'
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}

function ToolButton({
  label,
  countLabel,
  active,
  disabled,
  onClick,
}: {
  label: string
  countLabel: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`rounded border-2 px-3 py-2 text-left font-mono text-sm font-semibold ${
        active
          ? 'border-[#102500] bg-[#ebf8c6] shadow-[inset_0_0_0_2px_#53771d]'
          : 'border-[#37561f] bg-[#d5ec9f]'
      } disabled:cursor-not-allowed disabled:opacity-55`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <div>{label}</div>
      <div className="mt-1 text-xs">Left: {countLabel}</div>
    </button>
  )
}

function BoardView({
  title,
  boardSize,
  isEnemy,
  onCellClick,
  phase,
  turn,
  cells,
  radarPings,
  attackEffect,
  onCellRightClick,
}: {
  title: string
  boardSize: number
  isEnemy: boolean
  onCellClick: (x: number, y: number) => void
  phase: 'placing' | 'playing' | 'player_won' | 'ai_won'
  turn: 'player' | 'ai'
  cells: { shipId: number | null; shot: boolean; mark: null | 'question' | 'danger' }[][]
  radarPings: { x: number; y: number; detectedShips: number }[]
  attackEffect: {
    id: number
    x: number
    y: number
    kind: 'single' | 'crossBomb'
  } | null
  onCellRightClick: (x: number, y: number) => void
}) {
  const enemyClickable = isEnemy && phase === 'playing' && turn === 'player'
  const placementClickable = !isEnemy && phase === 'placing'
  const clickable = enemyClickable || placementClickable

  return (
    <div className="rounded border-2 border-[#2f4f17] bg-[#c7e290] p-3">
      <h3 className="mb-2 font-mono text-sm font-bold">{title}</h3>
      <div className="overflow-auto">
        <div
          className="grid min-w-[350px] gap-1"
          style={{ gridTemplateColumns: `22px repeat(${boardSize}, minmax(0, 1fr))` }}
        >
          <div />
          {Array.from({ length: boardSize }, (_, x) => (
            <div className="text-center font-mono text-[10px] font-bold" key={`col-${x}`}>
              {x + 1}
            </div>
          ))}

          {Array.from({ length: boardSize }, (_, y) => (
            <Fragment key={`row-wrap-${y}`}>
              <div className="flex items-center justify-center font-mono text-[10px] font-bold" key={`row-${y}`}>
                {letters[y]}
              </div>
              {Array.from({ length: boardSize }, (_, x) => {
                const cell = cells[y][x]
                const hasShip = cell.shipId !== null
                const radarCenter = radarPings.find((ping) => ping.x === x && ping.y === y)

                const isEffectCell = attackEffect?.x === x && attackEffect?.y === y
                let cellClass = 'bg-[#6f7f8c]'
                let marker = ''

                if (cell.shot && hasShip) {
                  cellClass = 'bg-[#ff3b30] text-white'
                  marker = 'X'
                } else if (cell.shot) {
                  cellClass = 'bg-[#1d9bf0] text-white'
                  marker = 'o'
                } else if (!isEnemy && hasShip) {
                  cellClass = 'bg-[#a9c66b] text-[#1d2f09]'
                }

                const content =
                  isEnemy && !cell.shot
                    ? cell.mark === 'question'
                      ? '?'
                      : cell.mark === 'danger'
                        ? '!'
                        : ''
                    : marker

                return (
                  <button
                    className={`relative aspect-square overflow-hidden rounded border border-[#486829] text-[10px] font-bold ${cellClass} ${
                      clickable ? 'hover:brightness-95' : 'cursor-default'
                    }`}
                    disabled={!clickable}
                    key={`cell-${x}-${y}`}
                    onClick={() => onCellClick(x, y)}
                    onContextMenu={(event) => {
                      if (!enemyClickable || cell.shot) {
                        return
                      }
                      event.preventDefault()
                      onCellRightClick(x, y)
                    }}
                    type="button"
                  >
                    {content}
                    {radarCenter && !cell.shot && (
                      <span className="pointer-events-none absolute left-[2px] top-[2px] rounded bg-black/70 px-[2px] text-[9px] leading-none text-[#facc15]">
                        {radarCenter.detectedShips}
                      </span>
                    )}
                    {isEffectCell && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        {attackEffect?.kind === 'crossBomb' ? (
                          <>
                            <span className="bomb-drop" key={`drop-${attackEffect.id}`} />
                            <span className="bomb-ring" key={`ring-${attackEffect.id}`} />
                          </>
                        ) : (
                          <span className="hit-flash" key={`flash-${attackEffect?.id}`} />
                        )}
                      </span>
                    )}
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {isEnemy && radarPings.length > 0 && (
        <div className="mt-2 text-[11px] font-semibold">
          Latest radar: ({radarPings[0].x + 1}, {radarPings[0].y + 1}) found{' '}
          {radarPings[0].detectedShips} ship cells
        </div>
      )}
    </div>
  )
}

export default App
