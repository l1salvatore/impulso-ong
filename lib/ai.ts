import 'server-only'
import { createGateway } from 'ai'

// Gateway configurado con la key del proyecto.
// El AI SDK busca AI_GATEWAY_API_KEY por defecto; acá usamos la variable
// que existe en este proyecto: VERCEL_AI_GATEWAY_KEY.
const gateway = createGateway({
  apiKey: process.env.VERCEL_AI_GATEWAY_KEY,
})

// Modelo del agente de IA de la ONG.
export const aiModel = gateway('openai/gpt-5-mini')
