import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_DIR = fileURLToPath(new URL('./data/', import.meta.url))
const DATA_FILE = path.join(DATA_DIR, 'patients.json')

/** Serializes writes so two simultaneous POSTs cannot lose a record. */
let queue = Promise.resolve()

async function readFilePatients() {
  try {
    const raw = await readFile(DATA_FILE, 'utf8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    if (error instanceof SyntaxError) {
      throw new Error('Файл данных повреждён. Проверьте server/data/patients.json.')
    }
    throw error
  }
}

async function writeFilePatients(patients) {
  await mkdir(DATA_DIR, { recursive: true })
  const temporary = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, `${JSON.stringify(patients, null, 2)}\n`, 'utf8')
  await rename(temporary, DATA_FILE)
}

/** Newest first, and waits for any in-flight write. */
export async function listPatients() {
  await queue
  const patients = await readFilePatients()
  return patients.sort((left, right) =>
    String(right.createdAt).localeCompare(String(left.createdAt)),
  )
}

/** Appends one patient and returns the stored record. */
export function addPatient(patient) {
  const run = queue.then(async () => {
    const patients = await readFilePatients()
    patients.push(patient)
    await writeFilePatients(patients)
    return patient
  })

  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export const dataFile = DATA_FILE
