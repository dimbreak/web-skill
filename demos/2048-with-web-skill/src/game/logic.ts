export const GRID_SIZE = 4
export const WIN_TILE = 2048

export type Grid = number[][]
export type Direction = 'up' | 'down' | 'left' | 'right'

function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row])
}

function getEmptyCells(grid: Grid): Array<{ row: number; col: number }> {
  const empty: Array<{ row: number; col: number }> = []

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (grid[row][col] === 0) {
        empty.push({ row, col })
      }
    }
  }

  return empty
}

function insertRandomTile(grid: Grid, rng: () => number = Math.random): Grid {
  const next = cloneGrid(grid)
  const empty = getEmptyCells(next)

  if (empty.length === 0) {
    return next
  }

  const pick = empty[Math.floor(rng() * empty.length)]
  next[pick.row][pick.col] = rng() < 0.9 ? 2 : 4

  return next
}

function slideAndMergeLine(line: number[]): {
  line: number[]
  moved: boolean
  scoreGained: number
} {
  const compact = line.filter((value) => value !== 0)
  const merged: number[] = []
  let scoreGained = 0

  for (let i = 0; i < compact.length; i += 1) {
    const current = compact[i]
    const next = compact[i + 1]

    if (next !== undefined && current === next) {
      const value = current * 2
      merged.push(value)
      scoreGained += value
      i += 1
      continue
    }

    merged.push(current)
  }

  while (merged.length < GRID_SIZE) {
    merged.push(0)
  }

  const moved = merged.some((value, index) => value !== line[index])

  return { line: merged, moved, scoreGained }
}

function hasWinningTile(grid: Grid): boolean {
  return grid.some((row) => row.some((value) => value >= WIN_TILE))
}

function canAnyMove(grid: Grid): boolean {
  if (getEmptyCells(grid).length > 0) {
    return true
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const current = grid[row][col]
      const right = grid[row][col + 1]
      const down = grid[row + 1]?.[col]

      if (current === right || current === down) {
        return true
      }
    }
  }

  return false
}

function moveLeft(grid: Grid): { grid: Grid; moved: boolean; scoreGained: number } {
  const next = cloneGrid(grid)
  let moved = false
  let scoreGained = 0

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const result = slideAndMergeLine(next[row])
    next[row] = result.line
    moved = moved || result.moved
    scoreGained += result.scoreGained
  }

  return { grid: next, moved, scoreGained }
}

function moveRight(grid: Grid): { grid: Grid; moved: boolean; scoreGained: number } {
  const next = cloneGrid(grid)
  let moved = false
  let scoreGained = 0

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const reversed = [...next[row]].reverse()
    const result = slideAndMergeLine(reversed)
    next[row] = result.line.reverse()
    moved = moved || result.moved
    scoreGained += result.scoreGained
  }

  return { grid: next, moved, scoreGained }
}

function moveUp(grid: Grid): { grid: Grid; moved: boolean; scoreGained: number } {
  const next = cloneGrid(grid)
  let moved = false
  let scoreGained = 0

  for (let col = 0; col < GRID_SIZE; col += 1) {
    const column = Array.from({ length: GRID_SIZE }, (_, row) => next[row][col])
    const result = slideAndMergeLine(column)

    for (let row = 0; row < GRID_SIZE; row += 1) {
      next[row][col] = result.line[row]
    }

    moved = moved || result.moved
    scoreGained += result.scoreGained
  }

  return { grid: next, moved, scoreGained }
}

function moveDown(grid: Grid): { grid: Grid; moved: boolean; scoreGained: number } {
  const next = cloneGrid(grid)
  let moved = false
  let scoreGained = 0

  for (let col = 0; col < GRID_SIZE; col += 1) {
    const column = Array.from({ length: GRID_SIZE }, (_, row) => next[row][col]).reverse()
    const result = slideAndMergeLine(column)
    const restored = result.line.reverse()

    for (let row = 0; row < GRID_SIZE; row += 1) {
      next[row][col] = restored[row]
    }

    moved = moved || result.moved
    scoreGained += result.scoreGained
  }

  return { grid: next, moved, scoreGained }
}

export function createInitialGrid(rng: () => number = Math.random): Grid {
  let grid = createEmptyGrid()
  grid = insertRandomTile(grid, rng)
  grid = insertRandomTile(grid, rng)
  return grid
}

export function applyMove(
  grid: Grid,
  direction: Direction,
  rng: () => number = Math.random,
): {
  grid: Grid
  moved: boolean
  scoreGained: number
  reachedWinTile: boolean
  isGameOver: boolean
} {
  const result =
    direction === 'left'
      ? moveLeft(grid)
      : direction === 'right'
        ? moveRight(grid)
        : direction === 'up'
          ? moveUp(grid)
          : moveDown(grid)

  if (!result.moved) {
    return {
      grid,
      moved: false,
      scoreGained: 0,
      reachedWinTile: hasWinningTile(grid),
      isGameOver: !canAnyMove(grid),
    }
  }

  const withRandomTile = insertRandomTile(result.grid, rng)

  return {
    grid: withRandomTile,
    moved: true,
    scoreGained: result.scoreGained,
    reachedWinTile: hasWinningTile(withRandomTile),
    isGameOver: !canAnyMove(withRandomTile),
  }
}
