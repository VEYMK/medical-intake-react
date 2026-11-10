import { useEffect, useRef } from 'react'
import { formatDateRu, formatShortDateRu } from '../lib/formatters'
import { maskPolicyNumber } from '../lib/payload'
import type { Patient } from '../types'

interface SuccessPanelProps {
  patient: Patient
  reference: string
  onReset: () => void
}

export function SuccessPanel({ patient, reference, onReset }: SuccessPanelProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const fullName = [patient.lastName, patient.firstName, patient.middleName]
    .filter((part): part is string => Boolean(part))
    .join(' ')

  const rows: Array<[string, string]> = [
    ['Пациент', fullName],
    ['Дата рождения', formatShortDateRu(patient.birthDate)],
    ['Телефон', patient.phone],
    ['Email', patient.email],
    ['Желаемая дата', formatDateRu(patient.preferredDate)],
    [
      'Полис',
      patient.hasInsurance
        ? `${maskPolicyNumber(patient.policyNumber)} · ${
            patient.insurer === 'other'
              ? (patient.insurerOther ?? 'другая компания')
              : (patient.insurer ?? 'есть')
          }`
        : 'Оплата самостоятельно',
    ],
  ]

  return (
    <section className="success" aria-labelledby="success-title">
      <div className="success-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="eyebrow">Анкета отправлена</p>
      <h2 id="success-title" tabIndex={-1} ref={headingRef}>
        Спасибо! Мы получили ваши данные
      </h2>
      <p className="success-lead">
        Администратор свяжется с вами в течение рабочего дня, чтобы подтвердить дату
        и время приёма.
      </p>
      <p className="success-reference">
        Номер заявки: <strong>{reference}</strong>
      </p>
      <dl className="success-summary">
        {rows
          .filter(([, value]) => value !== '')
          .map(([label, value]) => (
            <div className="success-row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      <div className="success-actions">
        <button type="button" className="btn btn--primary" onClick={onReset}>
          Заполнить новую анкету
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => window.print()}
        >
          Распечатать
        </button>
      </div>
    </section>
  )
}
