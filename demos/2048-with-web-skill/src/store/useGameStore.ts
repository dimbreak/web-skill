import { create } from 'zustand'
import { applyMove, createInitialGrid, type Direction, type Grid } from '../game/logic'

export type GameStatus = 'ready' | 'playing' | 'won' | 'over'

export type UserAction =
  | 'move_up'
  | 'move_down'
  | 'move_left'
  | 'move_right'
  | 'restart'
  | 'undo'

interface Snapshot {
  grid: Grid
  score: number
  status: GameStatus
  moveCount: number
}

export interface SerializedGameState {
  grid: Grid
  score: number
  bestScore: number
  moveCount: number
  status: GameStatus
}

interface GameState {
  grid: Grid
  score: number
  bestScore: number
  moveCount: number
  status: GameStatus
  history: Snapshot[]
  lastAction: UserAction | null

  startNewGame: () => void
  restartGame: () => void
  move: (direction: Direction) => boolean
  moveUp: () => boolean
  moveDown: () => boolean
  moveLeft: () => boolean
  moveRight: () => boolean
  undo: () => boolean
  handleKeyboardInput: (key: string) => boolean
  handleSwipe: (deltaX: number, deltaY: number, threshold?: number) => boolean
  dispatchUserAction: (action: UserAction) => boolean

  serializeState: () => SerializedGameState
  hydrateFromState: (next: SerializedGameState) => void
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row])
}

function toSnapshot(state: Pick<GameState, 'grid' | 'score' | 'status' | 'moveCount'>): Snapshot {
  return {
    grid: cloneGrid(state.grid),
    score: state.score,
    status: state.status,
    moveCount: state.moveCount,
  }
}

const initialGrid = createInitialGrid()

export const useGameStore = create<GameState>((set, get) => ({
  grid: initialGrid,
  score: 0,
  bestScore: 0,
  moveCount: 0,
  status: 'playing',
  history: [],
  lastAction: null,

  startNewGame: () => {
    set((state) => ({
      grid: createInitialGrid(),
      score: 0,
      bestScore: Math.max(state.bestScore, state.score),
      moveCount: 0,
      status: 'playing',
      history: [],
      lastAction: 'restart',
    }))
  },

  restartGame: () => {
    get().startNewGame()
  },

  move: (direction) => {
    const current = get()

    if (current.status === 'over') {
      return false
    }

    const next = applyMove(current.grid, direction)
    if (!next.moved) {
      return false
    }

    const history = [...current.history, toSnapshot(current)].slice(-50)
    const score = current.score + next.scoreGained
    const status = next.isGameOver ? 'over' : next.reachedWinTile ? 'won' : 'playing'

    set(() => ({
      grid: next.grid,
      score,
      bestScore: Math.max(current.bestScore, score),
      moveCount: current.moveCount + 1,
      status,
      history,
      lastAction:
        direction === 'up'
          ? 'move_up'
          : direction === 'down'
            ? 'move_down'
            : direction === 'left'
              ? 'move_left'
              : 'move_right',
    }))

    return true
  },

  moveUp: () => get().move('up'),
  moveDown: () => get().move('down'),
  moveLeft: () => get().move('left'),
  moveRight: () => get().move('right'),

  undo: () => {
    const current = get()
    if (current.history.length === 0) {
      return false
    }

    const previous = current.history[current.history.length - 1]
    const history = current.history.slice(0, -1)

    set(() => ({
      grid: cloneGrid(previous.grid),
      score: previous.score,
      status: previous.status,
      moveCount: previous.moveCount,
      history,
      lastAction: 'undo',
    }))

    return true
  },

  handleKeyboardInput: (key) => {
    const actionMap: Record<string, () => boolean | void> = {
      ArrowUp: () => get().moveUp(),
      ArrowDown: () => get().moveDown(),
      ArrowLeft: () => get().moveLeft(),
      ArrowRight: () => get().moveRight(),
      w: () => get().moveUp(),
      a: () => get().moveLeft(),
      s: () => get().moveDown(),
      d: () => get().moveRight(),
      W: () => get().moveUp(),
      A: () => get().moveLeft(),
      S: () => get().moveDown(),
      D: () => get().moveRight(),
      r: () => get().restartGame(),
      R: () => get().restartGame(),
      u: () => get().undo(),
      U: () => get().undo(),
    }

    const handler = actionMap[key]
    if (!handler) {
      return false
    }

    const result = handler()
    return typeof result === 'boolean' ? result : true
  },

  handleSwipe: (deltaX, deltaY, threshold = 24) => {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (Math.max(absX, absY) < threshold) {
      return false
    }

    if (absX > absY) {
      return deltaX > 0 ? get().moveRight() : get().moveLeft()
    }

    return deltaY > 0 ? get().moveDown() : get().moveUp()
  },

  dispatchUserAction: (action) => {
    const actionMap: Record<UserAction, () => boolean> = {
      move_up: () => get().moveUp(),
      move_down: () => get().moveDown(),
      move_left: () => get().moveLeft(),
      move_right: () => get().moveRight(),
      restart: () => {
        get().restartGame()
        return true
      },
      undo: () => get().undo(),
    }

    return actionMap[action]()
  },

  serializeState: () => {
    const state = get()
    return {
      grid: cloneGrid(state.grid),
      score: state.score,
      bestScore: state.bestScore,
      moveCount: state.moveCount,
      status: state.status,
    }
  },

  hydrateFromState: (next) => {
    set((state) => ({
      grid: cloneGrid(next.grid),
      score: next.score,
      bestScore: Math.max(state.bestScore, next.bestScore, next.score),
      moveCount: next.moveCount,
      status: next.status,
      history: [],
      lastAction: null,
    }))
  },
}))

export const webSkillGameActions = {
  moveUp: () => useGameStore.getState().moveUp(),
  moveDown: () => useGameStore.getState().moveDown(),
  moveLeft: () => useGameStore.getState().moveLeft(),
  moveRight: () => useGameStore.getState().moveRight(),
  restart: () => {
    useGameStore.getState().restartGame()
    return true
  },
  undo: () => useGameStore.getState().undo(),
  dispatchUserAction: (action: UserAction) => useGameStore.getState().dispatchUserAction(action),
  getState: () => useGameStore.getState().serializeState(),
  setState: (state: SerializedGameState) => useGameStore.getState().hydrateFromState(state),
}
