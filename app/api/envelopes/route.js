import { Redis } from '@upstash/redis'

const DEFAULTS = {
  gaby:  [5,6,10,15,20,21,22,23,25,26,30,35,40,45,50,52,55,60,100],
  dani:  [1,2,3,4,5,10,11,20,25,30,40,45,50,51,55,60,65,70,80,90],
  pablo: []
}

function getRedis() {
  try {
    const url   = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    if (!url || !token) return null
    return new Redis({ url, token })
  } catch(e) {
    return null
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const person = searchParams.get('person')

  if (!person || !DEFAULTS[person]) {
    return Response.json({ error: 'Invalid person' }, { status: 400 })
  }

  try {
    const redis = getRedis()
    if (!redis) return Response.json({ person, filled: DEFAULTS[person] })
    const data = await redis.get(`envelopes_${person}`)
    const filled = data ?? DEFAULTS[person]
    return Response.json({ person, filled })
  } catch (e) {
    return Response.json({ person, filled: DEFAULTS[person] })
  }
}

export async function POST(request) {
  try {
    const { person, filled } = await request.json()

    if (!person || !DEFAULTS[person] || !Array.isArray(filled)) {
      return Response.json({ error: 'Invalid data' }, { status: 400 })
    }

    const redis = getRedis()
    if (redis) await redis.set(`envelopes_${person}`, filled)
    return Response.json({ success: true, person, filled })
  } catch (e) {
    return Response.json({ error: 'Failed to save' }, { status: 500 })
  }
}
