import { customAlphabet } from 'nanoid'

// Short, URL-safe, human-glanceable ids for players / squads / markers.
const nano = customAlphabet('123456789abcdefghijkmnopqrstuvwxyz', 10)

export const newId = (prefix) => `${prefix}_${nano()}`
