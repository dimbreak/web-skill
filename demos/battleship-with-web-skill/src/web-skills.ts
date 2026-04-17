import { createWebSkillGenerator } from 'web-skill'
import { z } from 'zod'

import {
  useGameStore,
  type PlacementOrientation,
  type ToolType,
} from './store/gameStore'

const deploymentPlan = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
] as const

const enemyCellSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  shot: z.boolean(),
  mark: z.enum(['question', 'danger']).nullable(),
  hit: z.boolean(),
})

const myCellSchema = enemyCellSchema.extend({
  hasShip: z.boolean(),
})

const radarPingSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  detectedShips: z.number().int().min(0),
})

const phaseSchema = z.enum(['placing', 'playing', 'player_won', 'ai_won'])
const turnSchema = z.enum(['player', 'ai'])
const toolSchema = z.enum(['single', 'radar', 'crossBomb'])
const orientationSchema = z.enum(['horizontal', 'vertical'])

const enemyBoardOutputSchema = z.object({
  boardSize: z.number().int().positive(),
  phase: phaseSchema,
  turn: turnSchema,
  enemyBoard: z.array(z.array(enemyCellSchema)),
  radarPings: z.array(radarPingSchema),
})

const myBoardOutputSchema = z.object({
  boardSize: z.number().int().positive(),
  phase: phaseSchema,
  turn: turnSchema,
  myBoard: z.array(z.array(myCellSchema)),
  playerItems: z.object({
    radar: z.number().int().min(0),
    crossBomb: z.number().int().min(0),
  }),
})

const historyOutputSchema = z.object({
  phase: phaseSchema,
  turn: turnSchema,
  history: z.array(z.string()),
})

const placementOutputSchema = z.object({
  phase: phaseSchema,
  placementOrientation: orientationSchema,
  nextShipToPlaceIndex: z.number().int().min(0),
  nextShipName: z.string().nullable(),
  nextShipLength: z.number().int().positive().nullable(),
  remainingShips: z.array(
    z.object({
      name: z.string(),
      length: z.number().int().positive(),
    }),
  ),
})

const actionSummarySchema = z.object({
  phase: phaseSchema,
  turn: turnSchema,
  selectedTool: toolSchema,
  playerItems: z.object({
    radar: z.number().int().min(0),
    crossBomb: z.number().int().min(0),
  }),
  placementOrientation: orientationSchema,
  nextShipToPlaceIndex: z.number().int().min(0),
  latestLog: z.string(),
})

const skillInputToolSchema = z.object({
  tool: toolSchema,
})

const skillInputOrientationSchema = z.object({
  orientation: orientationSchema,
})

const skillInputCellSchema = z.object({
  x: z.number().int().min(0).max(9),
  y: z.number().int().min(0).max(9),
})

const getPlacementState = () => {
  const state = useGameStore.getState()
  const nextShip = deploymentPlan[state.nextShipToPlaceIndex] ?? null

  return {
    phase: state.phase,
    placementOrientation: state.placementOrientation,
    nextShipToPlaceIndex: state.nextShipToPlaceIndex,
    nextShipName: nextShip?.name ?? null,
    nextShipLength: nextShip?.length ?? null,
    remainingShips: deploymentPlan.slice(state.nextShipToPlaceIndex),
  }
}

const getActionSummary = () => {
  const state = useGameStore.getState()

  return {
    phase: state.phase,
    turn: state.turn,
    selectedTool: state.selectedTool,
    playerItems: state.playerItems,
    placementOrientation: state.placementOrientation,
    nextShipToPlaceIndex: state.nextShipToPlaceIndex,
    latestLog: state.logs[0] ?? '',
  }
}

const getEnemyBoard = () => {
  const state = useGameStore.getState()

  return {
    boardSize: state.boardSize,
    phase: state.phase,
    turn: state.turn,
    enemyBoard: state.enemyBoard.cells.map((row, y) =>
      row.map((cell, x) => ({
        x,
        y,
        shot: cell.shot,
        mark: cell.mark,
        hit: cell.shot && cell.shipId !== null,
      })),
    ),
    radarPings: state.radarPings,
  }
}

const getMyBoard = () => {
  const state = useGameStore.getState()

  return {
    boardSize: state.boardSize,
    phase: state.phase,
    turn: state.turn,
    myBoard: state.playerBoard.cells.map((row, y) =>
      row.map((cell, x) => ({
        x,
        y,
        shot: cell.shot,
        mark: cell.mark,
        hit: cell.shot && cell.shipId !== null,
        hasShip: cell.shipId !== null,
      })),
    ),
    playerItems: state.playerItems,
  }
}

const getHistory = () => {
  const state = useGameStore.getState()

  return {
    phase: state.phase,
    turn: state.turn,
    history: state.logs,
  }
}

const runAction = <TInput,>(fn: (input: TInput) => void, input: TInput) => {
  fn(input)
  return getActionSummary()
}

export const webSkills = createWebSkillGenerator()

const battleshipSkill = webSkills.newSkill({
  name: 'battleshipGame',
  title: 'Battleship game API with deployment and combat actions',
  description:
    'Expose task-level Battleship actions backed by Zustand, including pre-battle fleet deployment and split board/history reads.',
})

battleshipSkill.addFunction(
  () => getEnemyBoard(),
  'getEnemyBoard',
  {
    description: 'Return enemy board visibility state plus radar ping records.',
    inputSchema: z.object({}).default({}),
    outputSchema: enemyBoardOutputSchema,
  },
)

battleshipSkill.addFunction(
  () => getMyBoard(),
  'getMyBoard',
  {
    description: 'Return your own board state and remaining item counts.',
    inputSchema: z.object({}).default({}),
    outputSchema: myBoardOutputSchema,
  },
)

battleshipSkill.addFunction(
  () => getHistory(),
  'getHistory',
  {
    description: 'Return battle log history ordered from latest to oldest.',
    inputSchema: z.object({}).default({}),
    outputSchema: historyOutputSchema,
  },
)

battleshipSkill.addFunction(
  () => getPlacementState(),
  'getPlacementState',
  {
    description: 'Return current deployment progress and the next ship requirement.',
    inputSchema: z.object({}).default({}),
    outputSchema: placementOutputSchema,
  },
)

battleshipSkill.addFunction(
  () => {
    useGameStore.getState().startNewGame()
    return getActionSummary()
  },
  'startNewGame',
  {
    description: 'Reset game session to deployment phase.',
    inputSchema: z.object({}).default({}),
    outputSchema: actionSummarySchema,
  },
)

battleshipSkill.addFunction(
  (input) =>
    runAction(
      (payload: { orientation: PlacementOrientation }) =>
        useGameStore.getState().setPlacementOrientation(payload.orientation),
      input,
    ),
  'setPlacementOrientation',
  {
    description: 'Set deployment orientation to horizontal or vertical.',
    inputSchema: skillInputOrientationSchema,
    outputSchema: actionSummarySchema,
  },
)

battleshipSkill.addFunction(
  (input) =>
    runAction(
      (payload: { x: number; y: number }) =>
        useGameStore.getState().placeNextShipAt(payload.x, payload.y),
      input,
    ),
  'placeNextShipAt',
  {
    description:
      'Place the next required ship at coordinates during deployment (0-based).',
    inputSchema: skillInputCellSchema,
    outputSchema: actionSummarySchema,
  },
)

battleshipSkill.addFunction(
  () => {
    useGameStore.getState().autoPlacePlayerShips()
    return getActionSummary()
  },
  'autoPlacePlayerShips',
  {
    description: 'Auto-deploy all player ships and start battle phase.',
    inputSchema: z.object({}).default({}),
    outputSchema: actionSummarySchema,
  },
)

battleshipSkill.addFunction(
  (input) =>
    runAction(
      (payload: { tool: ToolType }) => useGameStore.getState().selectTool(payload.tool),
      input,
    ),
  'selectTool',
  {
    description: 'Select a combat tool before running playerActionAt.',
    inputSchema: skillInputToolSchema,
    outputSchema: actionSummarySchema,
  },
)

battleshipSkill.addFunction(
  (input) =>
    runAction(
      (payload: { x: number; y: number }) =>
        useGameStore.getState().playerActionAt(payload.x, payload.y),
      input,
    ),
  'playerActionAt',
  {
    description: 'Execute the currently selected tool at target coordinates (0-based).',
    inputSchema: skillInputCellSchema,
    outputSchema: actionSummarySchema,
  },
)

battleshipSkill.addFunction(
  (input) =>
    runAction(
      (payload: { x: number; y: number }) =>
        useGameStore.getState().toggleEnemyMarkAt(payload.x, payload.y),
      input,
    ),
  'toggleEnemyMarkAt',
  {
    description: 'Cycle enemy-cell marker (none -> ? -> ! -> none) for planning.',
    inputSchema: skillInputCellSchema,
    outputSchema: actionSummarySchema,
  },
)
