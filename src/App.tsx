import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchPatients } from './api/patients'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ErrorSummary } from './components/ErrorSummary'
import { FormField } from './components/FormField'
import { PatientList } from './components/PatientList'
import { SubmitButton } from './components/SubmitButton'
import { SuccessPanel } from './components/SuccessPanel'
import { useIntakeForm } from './hooks/useIntakeForm'
import { prefersReducedMotion } from './lib/a11y'
import { fieldAnchorId } from './lib/fieldIds'
import { formatDateTimeRu, formatTimeRu } from './lib/formatters'
import { SECTIONS, getField, isRequired, isVisible } from './schema'
import type { FieldName, Patient } from './types'

const CLINIC_PHONE = '+7 (495) 123-45-67'

export default function App() {
  const form = useIntakeForm()
  const [activeSection, setActiveSection] = useState<string>(
    SECTIONS[0]?.id ?? 'personal',
  )
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientsLoading, setPatientsLoading] = useState(true)
  const [patientsError, setPatientsError] = useState<string | null>(null)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const summaryRef = useRef<HTMLDivElement | null>(null)

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true)
    setPatientsError(null)
    try {
      setPatients(await fetchPatients())
    } catch (error) {
      setPatientsError(
        error instanceof Error ? error.message : 'Не удалось загрузить заявки.',
      )
    } finally {
      setPatientsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPatients()
  }, [loadPatients])

  // Highlights the section that is currently in the viewport.
  useEffect(() => {
    if (form.status === 'success') return
    if (typeof IntersectionObserver === 'undefined') return

    const elements = SECTIONS.map((section) =>
      document.getElementById(`section-${section.id}`),
    ).filter((element): element is HTMLElement => element !== null)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]
        if (visible) {
          setActiveSection(visible.target.id.replace('section-', ''))
        }
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.1, 0.5] },
    )

    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [form.status])

  const focusField = useCallback((name: FieldName) => {
    const field = getField(name)
    if (!field) return
    const element = document.getElementById(fieldAnchorId(field))
    element?.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
    if (element instanceof HTMLElement) element.focus({ preventScroll: true })
  }, [])

  const focusFirstField = useCallback(() => {
    window.setTimeout(() => {
      const element = document.getElementById('field-lastName')
      if (element instanceof HTMLElement) element.focus()
    }, 0)
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = await form.submit()

    if (result.ok) {
      void loadPatients()
      return
    }

    if (result.reason === 'validation') {
      window.setTimeout(() => {
        summaryRef.current?.focus({ preventScroll: true })
        summaryRef.current?.scrollIntoView({
          block: 'center',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
      }, 0)
    }
  }

  const handleReset = () => {
    setClearDialogOpen(false)
    form.reset()
    focusFirstField()
  }

  const percent =
    form.progress.total === 0
      ? 0
      : Math.round((form.progress.filled / form.progress.total) * 100)

  const draftStatusText = (() => {
    if (!form.draftAvailable) {
      return 'Автосохранение недоступно: браузер блокирует локальное хранилище.'
    }
    if (!form.draftEnabled) return 'Автосохранение выключено.'
    switch (form.draftStatus) {
      case 'saving':
        return 'Сохраняем черновик…'
      case 'saved':
        return form.lastSavedAt
          ? `Черновик сохранён в ${formatTimeRu(form.lastSavedAt)}`
          : 'Черновик сохранён.'
      case 'error':
        return 'Не удалось сохранить черновик: локальное хранилище переполнено.'
      default:
        return 'Автосохранение включено'
    }
  })()

  const draftStatusClass =
    form.draftStatus === 'saving'
      ? 'is-saving'
      : form.draftStatus === 'saved'
        ? 'is-saved'
        : form.draftStatus === 'error' || form.draftStatus === 'unavailable'
          ? 'is-error'
          : form.draftStatus === 'disabled'
            ? 'is-info'
            : ''

  return (
    <>
      <a className="skip-link" href="#intake-form">
        Перейти к анкете
      </a>

      <header className="site-header">
        <div className="container header-inner">
          <a
            className="brand"
            href="#main"
            aria-label="Медцентр «Здоровье» — к началу страницы"
          >
            <svg
              className="brand-mark"
              viewBox="0 0 48 48"
              aria-hidden="true"
              focusable="false"
            >
              <rect width="48" height="48" rx="14" fill="#0f766e" />
              <path
                d="M24 11v26M11 24h26"
                stroke="#fff"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
            <span className="brand-text">
              <strong>Медцентр «Здоровье»</strong>
              <span>Предварительная регистрация</span>
            </span>
          </a>
          <div className="header-contact">
            <span className="header-hours">Пн–Сб, 8:00–20:00</span>
            <a className="header-phone" href="tel:+74951234567">
              {CLINIC_PHONE}
            </a>
          </div>
        </div>
      </header>

      <main id="main" className="container layout">
        <aside className="intro" aria-labelledby="page-title">
          <p className="eyebrow">Онлайн-анкета · около 5 минут</p>
          <h1 id="page-title">Заполните анкету перед первым визитом</h1>
          <p className="lead">
            Врач увидит ваши данные до приёма и сможет подготовиться. Все обязательные
            поля отмечены звёздочкой, а черновик сохраняется автоматически.
          </p>

          <ul className="assurance-list">
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M12 3l7 3v6c0 4.4-3 7.5-7 9-4-1.5-7-4.6-7-9V6l7-3z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M9 12l2 2 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Данные передаются только сотрудникам медцентра</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M4 7h16M4 12h16M4 17h10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span>Черновик сохраняется на этом устройстве</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle
                  cx="12"
                  cy="12"
                  r="8.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 7v5l3 2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span>Администратор свяжется с вами в течение рабочего дня</span>
            </li>
          </ul>

          <nav className="section-nav" aria-label="Разделы анкеты">
            <p className="section-nav-title">Разделы</p>
            <ol>
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#section-${section.id}`}
                    aria-current={
                      activeSection === section.id ? 'true' : undefined
                    }
                    onClick={() => {
                      setActiveSection(section.id)
                      window.setTimeout(() => {
                        const heading = document.getElementById(
                          `section-${section.id}-title`,
                        )
                        if (heading instanceof HTMLElement) {
                          heading.focus({ preventScroll: true })
                        }
                      }, 0)
                    }}
                  >
                    <span className="nav-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="progress-card">
            <div className="progress-head">
              <span>Заполнение</span>
              <span>
                {form.progress.filled} из {form.progress.total}
              </span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-labelledby="progress-label"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-valuetext={`Заполнено ${form.progress.filled} из ${form.progress.total} обязательных полей`}
            >
              <div className="progress-bar" style={{ width: `${percent}%` }} />
            </div>
            <p className="progress-hint" id="progress-label">
              Обязательные поля отмечены звёздочкой.
            </p>
          </div>

          <div className="help-card">
            <h2>Нужна помощь?</h2>
            <p>
              Позвоните администратору — подскажем, какие документы взять на первый
              визит.
            </p>
            <a href="tel:+74951234567">{CLINIC_PHONE}</a>
          </div>
        </aside>

        <div className="form-column">
          {form.restoredAt && form.status !== 'success' ? (
            <div className="banner banner--info" role="status">
              <div>
                <strong>Черновик восстановлен.</strong>{' '}
                <span>
                  Данные от {formatDateTimeRu(form.restoredAt)}. Проверьте их и
                  продолжите заполнение.
                </span>
              </div>
              <div className="banner-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setClearDialogOpen(true)}
                >
                  Очистить черновик
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={form.dismissRestored}
                >
                  Скрыть
                </button>
              </div>
            </div>
          ) : null}

          {form.status === 'success' &&
          form.savedPatient &&
          form.reference ? (
            <SuccessPanel
              patient={form.savedPatient}
              reference={form.reference}
              onReset={handleReset}
            />
          ) : (
            <>
              <ErrorSummary
                errors={form.errors}
                onFocusField={focusField}
                summaryRef={summaryRef}
              />

              {form.status === 'error' && form.submitError ? (
                <div className="banner banner--error" role="alert">
                  <div>
                    <strong>Не удалось отправить анкету.</strong>{' '}
                    <span>{form.submitError}</span>
                  </div>
                </div>
              ) : null}

              <form
                id="intake-form"
                noValidate
                aria-labelledby="page-title"
                onSubmit={handleSubmit}
              >
                {SECTIONS.map((section) => (
                  <section
                    className="form-section"
                    id={`section-${section.id}`}
                    key={section.id}
                    aria-labelledby={`section-${section.id}-title`}
                  >
                    <div className="section-head">
                      <h2
                        id={`section-${section.id}-title`}
                        tabIndex={-1}
                      >
                        {section.title}
                      </h2>
                      <p className="section-description">{section.description}</p>
                    </div>

                    <div className="field-grid">
                      {section.fields.map((field) => {
                        if (!isVisible(field, form.values)) return null
                        return (
                          <FormField
                            key={field.name}
                            field={field}
                            value={form.values[field.name]}
                            error={form.errors[field.name]}
                            required={isRequired(field, form.values)}
                            disabled={form.status === 'submitting'}
                            onChange={form.change}
                            onBlur={form.blur}
                          />
                        )
                      })}
                    </div>
                  </section>
                ))}

                <div className="form-actions">
                  <SubmitButton isSubmitting={form.status === 'submitting'} />
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={form.saveDraftNow}
                    disabled={!form.draftAvailable || !form.draftEnabled}
                  >
                    Сохранить черновик
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setClearDialogOpen(true)}
                  >
                    Очистить
                  </button>
                  <span
                    className={`save-status ${draftStatusClass}`}
                    role="status"
                    aria-live="polite"
                  >
                    {draftStatusText}
                  </span>
                </div>

                <label className="draft-toggle">
                  <input
                    type="checkbox"
                    checked={form.draftEnabled}
                    disabled={!form.draftAvailable}
                    onChange={(event) => form.setDraftEnabled(event.target.checked)}
                  />
                  <span>Сохранять черновик в этом браузере</span>
                </label>

                <p className="privacy-note">
                  Нажимая «Отправить анкету», вы подтверждаете согласие на обработку
                  персональных данных.
                </p>
                <details className="privacy-details">
                  <summary>Политика обработки данных</summary>
                  <p>
                    Это демонстрационный проект. В реальном медицинском учреждении
                    анкета должна отправляться по защищённому каналу, а доступ к
                    данным — иметь только уполномоченные сотрудники.
                  </p>
                  <ul>
                    <li>
                      Данные используются исключительно для записи на приём и
                      подготовки врача.
                    </li>
                    <li>
                      Черновик хранится локально в вашем браузере и удаляется после
                      отправки.
                    </li>
                    <li>
                      Согласие на обработку данных не сохраняется в черновике — его
                      нужно подтвердить заново.
                    </li>
                    <li>Вы можете очистить черновик в любой момент.</li>
                  </ul>
                </details>
              </form>
            </>
          )}

          <PatientList
            patients={patients}
            loading={patientsLoading}
            error={patientsError}
            onRefresh={() => void loadPatients()}
          />
        </div>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p>© 2026 Медцентр «Здоровье». Демонстрационный проект.</p>
          <p>
            <a href="tel:+74951234567">{CLINIC_PHONE}</a>
            <span aria-hidden="true"> · </span>
            <span>React + TypeScript + REST API</span>
          </p>
        </div>
      </footer>

      <ConfirmDialog
        open={clearDialogOpen}
        title="Очистить анкету?"
        description="Все введённые данные и сохранённый черновик будут удалены. Это действие нельзя отменить."
        confirmLabel="Очистить"
        onCancel={() => setClearDialogOpen(false)}
        onConfirm={handleReset}
      />
    </>
  )
}
