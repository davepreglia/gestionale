import { useState, useRef, useEffect } from 'react'
import { Play, Database, AlertCircle, CheckCircle, HelpCircle, Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

export default function DataIntegration() {
  const { t } = useTranslation()
  const [integrationRunning, setIntegrationRunning] = useState(false)
  const [pipelinePhase, setPipelinePhase] = useState(0)
  
  // Set initial logs based on default selected language
  const [logs, setLogs] = useState([])
  const consoleEndRef = useRef(null)

  useEffect(() => {
    setLogs([
      `[${new Date().toLocaleTimeString()}] ${t('log_ready')}`
    ])
  }, [t])

  const sources = [
    { name: 'PITER', records: 7, status: 'ok', last: `${t('today')} 02:15`, details: t('piter_details') },
    { name: 'U-GOV', records: 7, status: 'ok', last: `${t('today')} 03:45`, details: t('ugov_details') },
    { name: 'HR Suite', records: 10, status: 'ok', last: t('yesterday'), details: t('hr_details') },
    { name: 'Timesheet', records: 45, status: 'warning', last: `${t('hours_ago')} — 3 ${t('invalid_records')}`, details: t('timesheet_details') },

    { name: 'PEPS', records: 0, status: 'error', last: t('timeout_conn'), details: t('peps_details') },
    { name: 'Sito Web', records: 7, status: 'ok', last: `${t('today')} 06:00`, details: t('sito_web_details') },
  ]

  const pipelineSteps = [
    { id: 1, label: t('phase_ingestion', 'Ingestione'), desc: t('phase_ingestion_desc', 'Connettori PITER, U-GOV, HR, TS') },
    { id: 2, label: t('phase_bronze', 'Bronze Layer'), desc: t('phase_bronze_desc', 'Raw data immutabile (Ingest-only)') },
    { id: 3, label: t('phase_cleaning', 'Cleaning'), desc: t('phase_cleaning_desc', 'Normalizzazione e pulizia formati') },
    { id: 4, label: t('phase_entity_resolution', 'Entity Resolution'), desc: t('phase_entity_resolution_desc', 'Record Linkage & Deduplica ML') },
    { id: 5, label: t('phase_golden_record', 'Golden Record'), desc: t('phase_golden_record_desc', 'Unificazione fonti e confidence rating') },
    { id: 6, label: t('phase_gold_layer', 'Gold Layer'), desc: t('phase_gold_layer_desc', 'KPI aggregati pronti per il Reporting') },
  ]

  const dataQualityMetrics = [
    { label: t('completeness'), value: 94, desc: t('completeness_desc', 'Campi valorizzati su totale atteso'), color: 'var(--success)' },
    { label: t('accuracy'), value: 97, desc: t('accuracy_desc', 'Valori nel range atteso (validazione regole)'), color: 'var(--success)' },
    { label: t('consistency'), value: 89, desc: t('consistency_desc', 'Coerenza cross-sorgente'), color: 'var(--warning)' },
    { label: t('timeliness'), value: 91, desc: t('timeliness_desc', 'Record aggiornati entro le SLA previste'), color: 'var(--success)' },
  ]

  const appendLog = (text, type = 'info') => {
    const time = new Date().toLocaleTimeString()
    const prefix = type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'
    setLogs(prev => [...prev, `[${time}] ${prefix} ${text}`])
    setTimeout(() => {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  const runPipeline = async () => {
    if (integrationRunning) return
    setIntegrationRunning(true)
    setPipelinePhase(1)
    setLogs([])

    const simulationSteps = [
      { delay: 400, phase: 1, type: 'info', text: t('log_start_etl') },
      { delay: 1000, phase: 1, type: 'success', text: t('log_piter_conn') },
      { delay: 1600, phase: 1, type: 'success', text: t('log_ugov_conn') },
      { delay: 2200, phase: 1, type: 'success', text: t('log_hr_conn') },
      { delay: 2800, phase: 1, type: 'warning', text: t('log_peps_timeout') },
      { delay: 3400, phase: 2, type: 'success', text: t('log_ingest_complete') },
      { delay: 4000, phase: 3, type: 'info', text: t('log_cleaning_start') },
      { delay: 4600, phase: 3, type: 'info', text: t('log_cleaning_rossi') },
      { delay: 5200, phase: 3, type: 'info', text: t('log_cleaning_cup') },
      { delay: 5800, phase: 4, type: 'info', text: t('log_er_start') },
      { delay: 6400, phase: 4, type: 'success', text: t('log_er_match') },
      { delay: 7000, phase: 4, type: 'warning', text: t('log_er_timesheet_warning') },
      { delay: 7600, phase: 5, type: 'success', text: t('log_golden_record_complete') },
      { delay: 8200, phase: 6, type: 'success', text: t('log_gold_layer_sync') },
      { delay: 8800, phase: 6, type: 'success', text: t('log_pipeline_complete') }
    ]

    for (const step of simulationSteps) {
      await new Promise(resolve => setTimeout(resolve, step.delay - (simulationSteps[simulationSteps.indexOf(step) - 1]?.delay || 0)))
      setPipelinePhase(step.phase)
      appendLog(step.text, step.type)
    }

    setIntegrationRunning(false)
    toast.success(t('toast_pipeline_complete'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>{t('integration_quality')}</h1>
          <p>{t('integration_desc')}</p>
        </div>
        <div className="page-header-actions">
          <button 
            className="btn btn-primary" 
            onClick={runPipeline} 
            disabled={integrationRunning}
            style={{ minWidth: '180px' }}
          >
            <Play size={16} /> {integrationRunning ? t('pipeline_running') : t('start_etl_pipeline')}
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} /> {t('monitored_data_sources')}
        </h3>
        <div className="grid grid-3" style={{ gap: '1.5rem' }}>
          {sources.map(src => (
            <div 
              key={src.name} 
              className="card" 
              style={{ 
                padding: '1.5rem', 
                position: 'relative', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{src.name}</strong>
                <span 
                  className="badge" 
                  style={{ 
                    borderColor: src.status === 'ok' ? 'var(--success)' : src.status === 'warning' ? 'var(--warning)' : 'var(--danger)',
                    color: src.status === 'ok' ? 'var(--success)' : src.status === 'warning' ? 'var(--warning)' : 'var(--danger)',
                    fontSize: '11px', 
                    padding: '2px 8px' 
                  }}
                >
                  {src.status === 'ok' ? t('source_status_ok') : src.status === 'warning' ? t('source_status_warning') : t('source_status_error')}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{src.details}</p>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-body)' }}>{src.records} {t('records_loaded')}</span>
                <span style={{ color: 'var(--text-muted)' }}>{src.last}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ETL Pipeline Steps Visualizer */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>{t('pipeline_status_phases')}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {pipelineSteps.map((step, idx) => {
            const stepNum = idx + 1
            const isCompleted = pipelinePhase > stepNum || pipelinePhase === 6
            const isActive = pipelinePhase === stepNum
            const statusColor = isCompleted ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-muted)'
            const bgColor = isCompleted ? 'rgba(31,138,101,0.08)' : isActive ? 'var(--primary-glow)' : 'var(--bg-surface)'
            const borderColor = isCompleted ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--border)'

            return (
              <div 
                key={step.id} 
                style={{ 
                  flex: 1, 
                  minWidth: '150px', 
                  background: bgColor, 
                  border: `1px solid ${borderColor}`,
                  borderRadius: 'var(--radius)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: statusColor, fontWeight: 700 }}>
                    {t('phase_title')} 0{step.id}
                  </span>
                  {isCompleted && <CheckCircle size={16} color="var(--success)" />}
                  {isActive && <Activity size={16} className="spinner" style={{ color: 'var(--primary)' }} />}
                </div>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{step.label}</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{step.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Entity Resolution & Data Quality */}
      <div className="grid grid-2" style={{ gap: '1.5rem' }}>
        {/* Probabilistic Linkage Demo */}
        <div className="card card-glass" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ai-cyan)', boxShadow: '0 0 8px var(--ai-cyan)' }}></span>
            {t('entity_resolution_simulator')}
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, padding: '1rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>📥 {t('record_piter')}</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mario Rossi</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t('fiscal_code_label')}: RSSMRA75H15F205X</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('department_label')}: DAUIN</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span className="badge" style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--primary)', borderColor: 'var(--ai-cyan)', fontWeight: 700, fontSize: '11px', boxShadow: '0 0 6px rgba(0, 229, 255, 0.15)' }}>
                  97% Match
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Jaro-Winkler</span>
                <div style={{ fontSize: '14px', color: 'var(--ai-purple)', fontWeight: 'bold' }}>➔</div>
              </div>
              <div style={{ flex: 1, padding: '1rem', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>📤 {t('record_hr_suite')}</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Rossi Mario</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t('fiscal_code_label')}: RSSMRA75H15F205X</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('qualification_label')}: Prof. Associato</div>
              </div>
            </div>

            <div style={{ background: 'rgba(138, 43, 226, 0.05)', border: '1px solid rgba(138, 43, 226, 0.25)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--ai-purple)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ai-purple)' }}></span>
                {t('unified_golden_record')}
              </div>
              <div className="grid grid-2" style={{ gap: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
                <div>{t('name_label')}: <strong>Rossi Mario</strong></div>
                <div>{t('fiscal_code_label')}: <strong style={{ fontFamily: 'var(--font-mono)' }}>RSSMRA75H15F205X</strong></div>
                <div>{t('department_label')}: <strong>DAUIN</strong></div>
                <div>{t('qualification_label')}: <strong>Professore Associato</strong></div>
                <div style={{ gridColumn: 'span 2' }}>{t('connected_sources')}: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>PITER · U-GOV · HR Suite</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Quality Report */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>{t('data_quality_metrics')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {dataQualityMetrics.map(metric => (
              <div key={metric.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{metric.label}</span>
                  <span style={{ fontWeight: 700, color: metric.color }}>{metric.value}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${metric.value}%`, 
                      background: metric.color 
                    }} 
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{metric.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Log Console */}
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('log_pipeline_console')}</h3>
          <span className="badge" style={{ color: 'var(--primary)', borderColor: 'var(--primary)', fontSize: '10px' }}>LIVE STREAM</span>
        </div>
        <div 
          style={{ 
            background: 'var(--text-primary)', 
            color: '#a3e635', 
            fontFamily: 'var(--font-mono)', 
            padding: '1.5rem', 
            borderRadius: 'var(--radius)', 
            height: '220px', 
            overflowY: 'auto',
            fontSize: '0.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            border: '1px solid var(--border-strong)'
          }}
        >
          {logs.map((log, index) => (
            <div key={index} style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{log}</div>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  )
}
