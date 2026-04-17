import { create } from 'zustand'

const BOARD_SIZE = 10
const SHIPS = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
] as const

export type ToolType = 'single' | 'radar' | 'crossBomb'
export type PlacementOrientation = 'horizontal' | 'vertical'
type Turn = 'player' | 'ai'
type Phase = 'placing' | 'playing' | 'player_won' | 'ai_won'

type Coord = { x: number; y: number }

interface Ship {
  id: number
  name: string
  length: number
  cells: Coord[]
  hits: number
  sunk: boolean
}

interface Cell {
  shipId: number | null
  shot: boolean
  mark: null | 'question' | 'danger'
}

interface Board {
  cells: Cell[][]
  ships: Ship[]
}

interface RadarPing {
  x: number
  y: number
  detectedShips: number
}

interface AiBrain {
  targetQueue: Coord[]
}

interface GameState {
  boardSize: number
  playerBoard: Board
  enemyBoard: Board
  phase: Phase
  turn: Turn
  selectedTool: ToolType
  playerItems: {
    radar: number
    crossBomb: number
  }
  aiItems: {
    crossBomb: number
  }
  placementOrientation: PlacementOrientation
  nextShipToPlaceIndex: number
  radarPings: RadarPing[]
  logs: string[]
  aiBrain: AiBrain
  attackEffect: {
    id: number
    board: 'player' | 'enemy'
    x: number
    y: number
    kind: 'single' | 'crossBomb'
  } | null
  effectCounter: number
  startNewGame: () => void
  setPlacementOrientation: (orientation: PlacementOrientation) => void
  placeNextShipAt: (x: number, y: number) => void
  autoPlacePlayerShips: () => void
  selectTool: (tool: ToolType) => void
  playerActionAt: (x: number, y: number) => void
  toggleEnemyMarkAt: (x: number, y: number) => void
  aiTakeTurn: () => void
}

const createEmptyBoard = (): Board => ({
  cells: Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({ shipId: null, shot: false, mark: null })),
  ),
  ships: [],
})

const isInside = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE

const cloneBoard = (board: Board): Board => ({
  cells: board.cells.map((row) => row.map((cell) => ({ ...cell }))),
  ships: board.ships.map((ship) => ({
    ...ship,
    cells: ship.cells.map((cell) => ({ ...cell })),
  })),
})

const randomInt = (max: number) => Math.floor(Math.random() * max)

const getPlacementCells = (
  startX: number,
  startY: number,
  length: number,
  orientation: PlacementOrientation,
) =>
  Array.from({ length }, (_, i) => ({
    x: orientation === 'horizontal' ? startX + i : startX,
    y: orientation === 'horizontal' ? startY : startY + i,
  }))

const canPlaceShipCells = (board: Board, cells: Coord[]) => {
  const currentCells = new Set(cells.map((cell) => `${cell.x},${cell.y}`))

  return cells.every((cell) => {
    if (!isInside(cell.x, cell.y)) {
      return false
    }

    if (board.cells[cell.y][cell.x].shipId !== null) {
      return false
    }

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = cell.x + dx
        const ny = cell.y + dy
        if (!isInside(nx, ny)) {
          continue
        }

        const neighborOccupied = board.cells[ny][nx].shipId !== null
        if (!neighborOccupied) {
          continue
        }

        const isCurrentShipCell = currentCells.has(`${nx},${ny}`)
        if (!isCurrentShipCell) {
          return false
        }
      }
    }

    return true
  })
}

const placeShipOnBoard = (
  board: Board,
  shipName: string,
  shipLength: number,
  cells: Coord[],
): Board => {
  const nextBoard = cloneBoard(board)
  const shipId = nextBoard.ships.length

  cells.forEach((cell) => {
    nextBoard.cells[cell.y][cell.x].shipId = shipId
  })

  nextBoard.ships.push({
    id: shipId,
    name: shipName,
    length: shipLength,
    cells,
    hits: 0,
    sunk: false,
  })

  return nextBoard
}

const placeShipsRandomly = (): Board => {
  let board = createEmptyBoard()

  SHIPS.forEach((shipData) => {
    let placed = false

    while (!placed) {
      const horizontal = Math.random() > 0.5
      const orientation: PlacementOrientation = horizontal ? 'horizontal' : 'vertical'
      const startX = randomInt(BOARD_SIZE)
      const startY = randomInt(BOARD_SIZE)

      const cells = getPlacementCells(startX, startY, shipData.length, orientation)

      if (!canPlaceShipCells(board, cells)) {
        continue
      }

      board = placeShipOnBoard(board, shipData.name, shipData.length, cells)
      placed = true
    }
  })

  return board
}

const appendLog = (logs: string[], message: string) => [message, ...logs].slice(0, 14)

const applySingleAttack = (board: Board, x: number, y: number) => {
  if (!isInside(x, y)) {
    return { board, valid: false, message: 'Out-of-range coordinate.', hits: [] as Coord[] }
  }

  const nextBoard = cloneBoard(board)
  const cell = nextBoard.cells[y][x]

  if (cell.shot) {
    return { board, valid: false, message: 'This cell was already attacked.', hits: [] as Coord[] }
  }

  cell.shot = true
  cell.mark = null

  if (cell.shipId === null) {
    return {
      board: nextBoard,
      valid: true,
      message: `Attack at (${x + 1}, ${y + 1}) missed.`,
      hits: [] as Coord[],
    }
  }

  const ship = nextBoard.ships[cell.shipId]
  ship.hits += 1
  if (ship.hits >= ship.length) {
    ship.sunk = true
  }

  const hitMessage = ship.sunk
    ? `Hit and sunk ${ship.name}!`
    : `Hit at (${x + 1}, ${y + 1})!`

  return {
    board: nextBoard,
    valid: true,
    message: hitMessage,
    hits: [{ x, y }],
  }
}

const getCrossPattern = (centerX: number, centerY: number) =>
  [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY - 1 },
    { x: centerX + 1, y: centerY - 1 },
    { x: centerX - 1, y: centerY + 1 },
    { x: centerX + 1, y: centerY + 1 },
  ].filter((cell) => isInside(cell.x, cell.y))

const attackWithPattern = (board: Board, pattern: Coord[]) => {
  const nextBoard = cloneBoard(board)
  const hitCoords: Coord[] = []
  let attackedCount = 0

  pattern.forEach((cell) => {
    if (!isInside(cell.x, cell.y)) {
      return
    }

    const boardCell = nextBoard.cells[cell.y][cell.x]
    if (boardCell.shot) {
      return
    }

    attackedCount += 1
    boardCell.shot = true
    boardCell.mark = null

    if (boardCell.shipId !== null) {
      const ship = nextBoard.ships[boardCell.shipId]
      ship.hits += 1
      if (ship.hits >= ship.length) {
        ship.sunk = true
      }
      hitCoords.push({ x: cell.x, y: cell.y })
    }
  })

  if (attackedCount === 0) {
    return {
      board,
      valid: false,
      message: 'No new cells to attack in range.',
      hitCoords: [] as Coord[],
    }
  }

  const sunkShips = nextBoard.ships.filter((ship) => ship.sunk && ship.hits === ship.length)
  const message =
    hitCoords.length > 0
      ? `Cross-bomb hit ${hitCoords.length} cells.`
      : 'Cross-bomb missed.'

  if (sunkShips.length > 0) {
    return {
      board: nextBoard,
      valid: true,
      message: `${message} You sank at least one ship!`,
      hitCoords,
    }
  }

  return {
    board: nextBoard,
    valid: true,
    message,
    hitCoords,
  }
}

const scanRadarArea = (board: Board, centerX: number, centerY: number) => {
  const area: Coord[] = []

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const x = centerX + dx
      const y = centerY + dy
      if (isInside(x, y)) {
        area.push({ x, y })
      }
    }
  }

  const detectedShips = area.reduce((count, cell) => {
    return board.cells[cell.y][cell.x].shipId !== null ? count + 1 : count
  }, 0)

  return { detectedShips }
}

const hasWinner = (board: Board) => board.ships.every((ship) => ship.sunk)

const getNeighbors = (x: number, y: number) =>
  [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ].filter((cell) => isInside(cell.x, cell.y))

const keyOf = (x: number, y: number) => `${x},${y}`

const getUntouchedCells = (board: Board) => {
  const coords: Coord[] = []

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!board.cells[y][x].shot) {
        coords.push({ x, y })
      }
    }
  }

  return coords
}

const chooseAiTarget = (board: Board, brain: AiBrain): Coord | null => {
  while (brain.targetQueue.length > 0) {
    const candidate = brain.targetQueue.shift()!
    if (!board.cells[candidate.y][candidate.x].shot) {
      return candidate
    }
  }

  const untouched = getUntouchedCells(board)
  if (untouched.length === 0) {
    return null
  }

  return untouched[randomInt(untouched.length)]
}

const markAiTargetsFromHits = (brain: AiBrain, board: Board, hitCoords: Coord[]) => {
  hitCoords.forEach((hit) => {
    getNeighbors(hit.x, hit.y).forEach((neighbor) => {
      if (!board.cells[neighbor.y][neighbor.x].shot) {
        const unique = !brain.targetQueue.some(
          (queued) => keyOf(queued.x, queued.y) === keyOf(neighbor.x, neighbor.y),
        )
        if (unique) {
          brain.targetQueue.push(neighbor)
        }
      }
    })
  })
}

const createInitialState = () => ({
  boardSize: BOARD_SIZE,
  playerBoard: createEmptyBoard(),
  enemyBoard: placeShipsRandomly(),
  phase: 'placing' as Phase,
  turn: 'player' as Turn,
  selectedTool: 'single' as ToolType,
  playerItems: {
    radar: 2,
    crossBomb: 2,
  },
  aiItems: {
    crossBomb: 1,
  },
  placementOrientation: 'horizontal' as PlacementOrientation,
  nextShipToPlaceIndex: 0,
  radarPings: [] as RadarPing[],
  logs: ['Place your fleet. Start with Carrier (5).'],
  aiBrain: {
    targetQueue: [] as Coord[],
  },
  attackEffect: null,
  effectCounter: 0,
})

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  startNewGame: () => {
    set(() => ({ ...createInitialState() }))
  },

  setPlacementOrientation: (orientation) => {
    set((state) => {
      if (state.phase !== 'placing') {
        return state
      }
      return { ...state, placementOrientation: orientation }
    })
  },

  placeNextShipAt: (x, y) => {
    set((state) => {
      if (state.phase !== 'placing') {
        return state
      }

      const shipData = SHIPS[state.nextShipToPlaceIndex]
      if (!shipData) {
        return state
      }

      const placementCells = getPlacementCells(
        x,
        y,
        shipData.length,
        state.placementOrientation,
      )

      if (!canPlaceShipCells(state.playerBoard, placementCells)) {
        return {
          ...state,
          logs: appendLog(
            state.logs,
            `Cannot place ${shipData.name} there. Keep one-cell spacing from other ships.`,
          ),
        }
      }

      const nextBoard = placeShipOnBoard(
        state.playerBoard,
        shipData.name,
        shipData.length,
        placementCells,
      )

      const nextIndex = state.nextShipToPlaceIndex + 1
      const allPlaced = nextIndex >= SHIPS.length

      return {
        ...state,
        playerBoard: nextBoard,
        nextShipToPlaceIndex: nextIndex,
        phase: allPlaced ? 'playing' : 'placing',
        logs: appendLog(
          state.logs,
          allPlaced
            ? 'Fleet ready. Battle starts now.'
            : `Placed ${shipData.name}. Next: ${SHIPS[nextIndex].name} (${SHIPS[nextIndex].length}).`,
        ),
      }
    })
  },

  autoPlacePlayerShips: () => {
    set((state) => {
      if (state.phase !== 'placing') {
        return state
      }

      return {
        ...state,
        playerBoard: placeShipsRandomly(),
        nextShipToPlaceIndex: SHIPS.length,
        phase: 'playing',
        logs: appendLog(state.logs, 'Fleet auto-deployed. Battle starts now.'),
      }
    })
  },

  selectTool: (tool) => {
    set((state) => {
      if (state.phase !== 'playing' || state.turn !== 'player') {
        return state
      }

      if (tool === 'radar' && state.playerItems.radar <= 0) {
        return { ...state, logs: appendLog(state.logs, 'No radar charges left.') }
      }

      if (tool === 'crossBomb' && state.playerItems.crossBomb <= 0) {
        return { ...state, logs: appendLog(state.logs, 'No cross-bomb charges left.') }
      }

      return { ...state, selectedTool: tool }
    })
  },

  playerActionAt: (x, y) => {
    set((state) => {
      if (state.phase !== 'playing') {
        return state
      }

      if (state.turn !== 'player') {
        return { ...state, logs: appendLog(state.logs, 'Wait for the AI turn.') }
      }

      if (!isInside(x, y)) {
        return state
      }

      if (state.selectedTool === 'single') {
        const result = applySingleAttack(state.enemyBoard, x, y)
        if (!result.valid) {
          return { ...state, logs: appendLog(state.logs, result.message) }
        }

        const playerWon = hasWinner(result.board)
        return {
          ...state,
          enemyBoard: result.board,
          turn: playerWon ? 'player' : 'ai',
          phase: playerWon ? 'player_won' : 'playing',
          logs: appendLog(state.logs, `You: ${result.message}`),
          effectCounter: state.effectCounter + 1,
          attackEffect: {
            id: state.effectCounter + 1,
            board: 'enemy',
            x,
            y,
            kind: 'single',
          },
        }
      }

      if (state.selectedTool === 'radar') {
        if (state.playerItems.radar <= 0) {
          return { ...state, logs: appendLog(state.logs, 'No radar charges left.') }
        }

        const scan = scanRadarArea(state.enemyBoard, x, y)
        const radarMessage = `Radar scan (${x + 1}, ${y + 1}): ${scan.detectedShips} ship cells in a 3x3 area.`

        return {
          ...state,
          turn: 'ai',
          selectedTool: 'single',
          playerItems: {
            ...state.playerItems,
            radar: state.playerItems.radar - 1,
          },
          radarPings: [{ x, y, detectedShips: scan.detectedShips }, ...state.radarPings].slice(0, 8),
          logs: appendLog(state.logs, radarMessage),
        }
      }

      if (state.playerItems.crossBomb <= 0) {
        return { ...state, logs: appendLog(state.logs, 'No cross-bomb charges left.') }
      }

      const pattern = getCrossPattern(x, y)
      const blast = attackWithPattern(state.enemyBoard, pattern)
      if (!blast.valid) {
        return { ...state, logs: appendLog(state.logs, blast.message) }
      }

      const playerWon = hasWinner(blast.board)
      return {
        ...state,
        enemyBoard: blast.board,
        turn: playerWon ? 'player' : 'ai',
        phase: playerWon ? 'player_won' : 'playing',
        selectedTool: 'single',
        playerItems: {
          ...state.playerItems,
          crossBomb: state.playerItems.crossBomb - 1,
        },
        logs: appendLog(state.logs, `You: ${blast.message}`),
        effectCounter: state.effectCounter + 1,
        attackEffect: {
          id: state.effectCounter + 1,
          board: 'enemy',
          x,
          y,
          kind: 'crossBomb',
        },
      }
    })
  },

  toggleEnemyMarkAt: (x, y) => {
    set((state) => {
      if (!isInside(x, y)) {
        return state
      }

      if (state.phase !== 'playing' || state.turn !== 'player') {
        return state
      }

      const nextEnemyBoard = cloneBoard(state.enemyBoard)
      const cell = nextEnemyBoard.cells[y][x]
      if (cell.shot) {
        return state
      }

      const nextMark =
        cell.mark === null ? 'question' : cell.mark === 'question' ? 'danger' : null
      cell.mark = nextMark

      const label =
        nextMark === 'question' ? '?' : nextMark === 'danger' ? '!' : 'none'

      return {
        ...state,
        enemyBoard: nextEnemyBoard,
        logs: appendLog(state.logs, `Marker at (${x + 1}, ${y + 1}) set to ${label}.`),
      }
    })
  },

  aiTakeTurn: () => {
    const current = get()
    if (current.phase !== 'playing' || current.turn !== 'ai') {
      return
    }

    set((state) => {
      if (state.phase !== 'playing' || state.turn !== 'ai') {
        return state
      }

      const brain: AiBrain = {
        targetQueue: [...state.aiBrain.targetQueue],
      }

      let workingBoard = state.playerBoard
      let aiItems = { ...state.aiItems }
      let actionMessage = 'AI skipped the turn.'
      let hitCoords: Coord[] = []
      let effectX = -1
      let effectY = -1
      let effectKind: 'single' | 'crossBomb' = 'single'

      const useBomb = aiItems.crossBomb > 0 && Math.random() < 0.2
      if (useBomb) {
        const center = chooseAiTarget(workingBoard, brain)
        if (center) {
          const pattern = getCrossPattern(center.x, center.y)
          const result = attackWithPattern(workingBoard, pattern)
          if (result.valid) {
            workingBoard = result.board
            aiItems = { ...aiItems, crossBomb: aiItems.crossBomb - 1 }
            actionMessage = `AI used cross-bomb at (${center.x + 1}, ${center.y + 1}). ${result.message}`
            hitCoords = result.hitCoords
            effectX = center.x
            effectY = center.y
            effectKind = 'crossBomb'
          }
        }
      }

      if (actionMessage === 'AI skipped the turn.') {
        const target = chooseAiTarget(workingBoard, brain)
        if (target) {
          const result = applySingleAttack(workingBoard, target.x, target.y)
          if (result.valid) {
            workingBoard = result.board
            actionMessage = `AI attacked (${target.x + 1}, ${target.y + 1}). ${result.message}`
            hitCoords = result.hits
            effectX = target.x
            effectY = target.y
          }
        }
      }

      markAiTargetsFromHits(brain, workingBoard, hitCoords)

      const aiWon = hasWinner(workingBoard)

      return {
        ...state,
        playerBoard: workingBoard,
        aiItems,
        aiBrain: brain,
        turn: aiWon ? 'ai' : 'player',
        phase: aiWon ? 'ai_won' : 'playing',
        logs: appendLog(state.logs, actionMessage),
        effectCounter: state.effectCounter + 1,
        attackEffect:
          effectX >= 0 && effectY >= 0
            ? {
                id: state.effectCounter + 1,
                board: 'player',
                x: effectX,
                y: effectY,
                kind: effectKind,
              }
            : state.attackEffect,
      }
    })
  },
}))

export const webSkillGameActions = {
  startNewGame: () => useGameStore.getState().startNewGame(),
  setPlacementOrientation: (orientation: PlacementOrientation) =>
    useGameStore.getState().setPlacementOrientation(orientation),
  placeNextShipAt: (x: number, y: number) => useGameStore.getState().placeNextShipAt(x, y),
  autoPlacePlayerShips: () => useGameStore.getState().autoPlacePlayerShips(),
  selectTool: (tool: ToolType) => useGameStore.getState().selectTool(tool),
  playerActionAt: (x: number, y: number) => useGameStore.getState().playerActionAt(x, y),
  toggleEnemyMarkAt: (x: number, y: number) => useGameStore.getState().toggleEnemyMarkAt(x, y),
  aiTakeTurn: () => useGameStore.getState().aiTakeTurn(),
  getState: () => useGameStore.getState(),
}
