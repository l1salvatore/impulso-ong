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

// Modelo multimodal para extraer texto de imágenes (OCR / descripción).
export const visionModel = gateway('openai/gpt-4o-mini')

// Modelo de embeddings para la búsqueda semántica (RAG). 1536 dimensiones.
export const embeddingModel = gateway.textEmbeddingModel(
  'openai/text-embedding-3-small',
)
