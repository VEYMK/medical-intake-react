import { formatDateTimeRu, formatShortDateRu } from '../lib/formatters'
import { maskPolicyNumber } from '../lib/payload'
import type { Patient } from '../types'

interface PatientListProps {
  patients: Patient[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}

function patientName(patient: Patient): string {
  return [patient.lastName, patient.firstName, patient.middleName]
    .filter((part): part is string => Boolean(part))
    .join(' ')
}

/**
 * Reads the other half of the REST contract: GET /api/patients.
 * Loading, error and empty states are all explicit, not just a spinner.
 */
export function PatientList({ patients, loading, error, onRefresh }: PatientListProps) {
  return (
    <section className="patients-card" aria-labelledby="patients-title">
      <div className="patients-head">
        <div>
          <h2 id="patients-title">Последние заявки</h2>
          <p className="patients-subtitle">
            Данные из <code>GET /api/patients</code>
            {!loading && error === null ? ` · всего ${patients.length}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--secondary btn--small"
          onClick={onRefresh}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Обновляем…' : 'Обновить'}
        </button>
      </div>

      {loading ? (
        <div className="patients-skeleton" role="status" aria-live="polite">
          <span className="visually-hidden">Загружаем заявки…</span>
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-line--short" />
        </div>
      ) : error ? (
        <div className="patients-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={onRefresh}
          >
            Повторить
          </button>
        </div>
      ) : patients.length === 0 ? (
        <p className="patients-empty">
          Пока нет отправленных анкет. Заполните форму — заявка появится здесь.
        </p>
      ) : (
        <ul className="patient-list">
          {patients.map((patient) => (
            <li className="patient-item" key={patient.id}>
              <div className="patient-item-head">
                <strong>{patientName(patient)}</strong>
                <span className="patient-reference">{patient.reference}</span>
              </div>
              <p className="patient-meta">
                {patient.phone} · {patient.email}
              </p>
              <p className="patient-meta">
                Приём: {formatShortDateRu(patient.preferredDate)} ·{' '}
                {patient.hasInsurance
                  ? `полис ${maskPolicyNumber(patient.policyNumber)}`
                  : 'без полиса'}
              </p>
              <p className="patient-created">
                Создана {formatDateTimeRu(new Date(patient.createdAt))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
