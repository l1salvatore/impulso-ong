import 'server-only'
import { createGateway } from 'ai'

// Gateway configurado con la key del proyecto.
// El AI SDK busca AI_GATEWAY_API_KEY por defecto; acá usamos la variable
// que existe en este proyecto: VERCEL_AI_GATEWAY_KEY.
const gateway = createGateway({
  apiKey: process.env.VERCEL_AI_GATEWAY_KEY,
})

// Modelo del agente de IA de la ONG.
// Usamos un modelo rápido y no-razonador: consume mucha menos cuota por
// respuesta que gpt-5-mini (que razona internamente) y tiene mejor
// disponibilidad, reduciendo los cortes por rate limit del plan gratuito.
export const aiModel = gateway('openai/gpt-4.1-mini')

// Modelo de embeddings para la búsqueda semántica (RAG). 1536 dimensiones.
export const embeddingModel = gateway.textEmbeddingModel(
  'openai/text-embedding-3-small',
)
