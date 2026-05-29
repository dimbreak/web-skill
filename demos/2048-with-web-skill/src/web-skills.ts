import { createWebSkillGenerator } from 'web-skill'
import { z } from 'zod'
import { useGameStore } from './store/useGameStore'

const gridRowSchema = z.array(z.number().int().nonnegative()).length(4)
const gridSchema = z.array(gridRowSchema).length(4)
const gameStatusSchema = z.enum(['ready', 'playing', 'won', 'over'])
const serializedGameStateSchema = z.object({
  grid: gridSchema,
  score: z.number().int().nonnegative(),
  bestScore: z.number().int().nonnegative(),
  moveCount: z.number().int().nonnegative(),
  status: gameStatusSchema,
})

export const webSkills = createWebSkillGenerator()

const game2048Skill = webSkills.newSkill({
  name: 'game2048',
  title: '2048 game actions for move control and state synchronization',
  description:
    'Expose task-level actions from the 2048 Zustand store so agents can move tiles, restart, undo, and sync game state without DOM clicks.',
})

game2048Skill.addFunction(
  () => {
    useGameStore.getState().restartGame()
    return true
  },
  'restart',
  {
    description: 'Restart the current 2048 game with a new random grid.',
    inputSchema: z.object({}).default({}),
    outputSchema: z.boolean(),
  },
)

game2048Skill.addFunction(() => useGameStore.getState().moveUp(), 'moveUp', {
  description: 'Move tiles upward.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.boolean(),
})

game2048Skill.addFunction(() => useGameStore.getState().moveDown(), 'moveDown', {
  description: 'Move tiles downward.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.boolean(),
})

game2048Skill.addFunction(() => useGameStore.getState().moveLeft(), 'moveLeft', {
  description: 'Move tiles to the left.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.boolean(),
})

game2048Skill.addFunction(() => useGameStore.getState().moveRight(), 'moveRight', {
  description: 'Move tiles to the right.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.boolean(),
})

game2048Skill.addFunction(() => useGameStore.getState().undo(), 'undo', {
  description: 'Undo the previous successful move.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.boolean(),
})

game2048Skill.addFunction(() => useGameStore.getState().serializeState(), 'getState', {
  description: 'Get the current serializable game state.',
  inputSchema: z.object({}).default({}),
  outputSchema: serializedGameStateSchema,
})
