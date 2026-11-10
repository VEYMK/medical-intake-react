import { randomInt, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import { addPatient, listPatients } from './storage.mjs'
import { validatePatientInput } from './validation.mjs'

const PORT = Number(process.env.PORT ?? 3001)
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = path.join(ROOT, 'dist')
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function createReference() {
  const year = new Date().getFullYear()
  let code = ''
  for (let index = 0; index < 5; index += 1) {
    code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)]
  }
  return `MF-${year}-${code}`
}

const app = express()
app.disable('x-powered-by')
app.use(cors())
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'medical-intake-api' })
})

app.get('/api/patients', async (_request, response, next) => {
  try {
    response.json({ ok: true, patients: await listPatients() })
  } catch (error) {
    next(error)
  }
})

app.post('/api/patients', async (request, response, next) => {
  const result = validatePatientInput(request.body)
  if (!result.ok) {
    response.status(422).json({
      ok: false,
      message: result.message ?? 'Проверьте поля анкеты.',
      fieldErrors: result.fieldErrors,
    })
    return
  }

  const patient = {
    id: randomUUID(),
    reference: createReference(),
    createdAt: new Date().toISOString(),
    ...result.patient,
  }

  try {
    await addPatient(patient)
    response.status(201).json({
      ok: true,
      reference: patient.reference,
      patient,
    })
  } catch (error) {
    next(error)
  }
})

app.use('/api', (_request, response) => {
  response.status(404).json({ ok: false, message: 'Такого метода API нет.' })
})

if (existsSync(DIST)) {
  app.use(express.static(DIST))
  app.use((request, response, next) => {
    if (request.method !== 'GET') {
      next()
      return
    }
    response.sendFile(path.join(DIST, 'index.html'))
  })
} else {
  app.get('/', (_request, response) => {
    response
      .status(200)
      .type('text/plain')
      .send('API is running. Start the UI with "npm run dev" or build it with "npm start".')
  })
}

app.use((error, _request, response, _next) => {
  if (error?.type === 'entity.parse.failed') {
    response.status(400).json({ ok: false, message: 'Некорректный JSON в теле запроса.' })
    return
  }
  if (error?.type === 'entity.too.large') {
    response.status(413).json({ ok: false, message: 'Слишком большой запрос.' })
    return
  }

  console.error(error)
  response.status(500).json({ ok: false, message: 'Внутренняя ошибка сервера.' })
})

app.listen(PORT, () => {
  console.log(`Medical intake API: http://localhost:${PORT}`)
  if (existsSync(DIST)) {
    console.log(`UI: http://localhost:${PORT}`)
  }
})
