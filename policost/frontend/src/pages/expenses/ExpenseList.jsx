import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { expensesApi, projectsApi } from '../../api'
import { PageLoader, EmptyState, StatusBadge, formatCurrency, formatDate } from '../../components/ui'
import { Plus, Search, Filter, Calendar, FileText, CheckCircle2, AlertCircle, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([])
  const [projects, setProjects] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()
  
  // Filters
  const [status, setStatus] = useState('')
  const [projectId, setProjectId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  
  // Category-specific tabs
  const [activeCategoryTab, setActiveCategoryTab] = useState('all')

  // Equipment detail expansion state
  const [expandedEquipment, setExpandedEquipment] = useState({})

  const toggleEquipment = (id) => {
    setExpandedEquipment(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const translateState = (val) => {
    if (!val) return '—'
    const key = val.toLowerCase().replace(/ /g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return t(key, val)
  }

  const translateVal = (val) => {
    if (!val) return '—'
    const key = val.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
    return t(key, val)
  }



  useEffect(() => {
    projectsApi.list().then(res => setProjects(res.data.data.items)).catch(console.error)
    projectsApi.categories().then(res => setCategories(res.data.data)).catch(console.error)
  }, [])

  useEffect(() => {
    const loadExpenses = async () => {
      setLoading(true)
      try {
        const params = {}
        if (status) params.status = status
        if (projectId) params.project_id = projectId
        if (categoryId) params.category_id = categoryId
        if (search) params.q = search
        
        const { data } = await expensesApi.list(params)
        setExpenses(data.data.items)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    // Debounce search slightly
    const timer = setTimeout(loadExpenses, 300)
    return () => clearTimeout(timer)
  }, [status, projectId, categoryId, search])

  // Mock data matching the original CHAT_GPT html files
  const missionsData = [
    { name: 'Anna Rossi', dest: 'Bruxelles', date: '12/02/2024', desc: 'Workshop HE', amount: 1200 },
    { name: 'Luca Bianchi', dest: 'Milano', date: '05/03/2024', desc: 'Conferenza tecnica', amount: 350 },
    { name: 'Giulia Verdi', dest: 'Roma', date: '18/04/2024', desc: 'User research meeting', amount: 480 },
    { name: 'Marco Neri', dest: 'Firenze', date: '10/05/2024', desc: 'Analisi dati partner', amount: 560 },
    { name: 'Carlo Manca', dest: 'Napoli', date: '21/03/2024', desc: 'Formazione partner', amount: 300 },
    { name: 'Elena Basso', dest: 'Parigi', date: '02/04/2024', desc: 'Meeting internazionale', amount: 720 },
    { name: 'Federico Lodi', dest: 'Torino', date: '15/01/2024', desc: 'Workshop interno', amount: 100 },
    { name: 'Marta Sala', dest: 'Lione', date: '12/02/2024', desc: 'Collaborazione interuniversitaria', amount: 280 },
    { name: 'Chiara Rossi', dest: 'Bologna', date: '25/03/2024', desc: 'Supporto amministrativo', amount: 150 },
  ]

  const consumablesData = [
    { name: 'Materiali di laboratorio', amount: 2500, procedure: 'Ordine diretto', status: 'Consegnato' },
    { name: 'Licenze software', amount: 3000, procedure: 'Convenzione', status: 'In lavorazione' },
    { name: 'Servizi di stampa', amount: 1000, procedure: 'Ordine interno', status: 'Fatturato' },
  ]

  const equipmentData = [
    {
      id: 'eq1',
      name: 'Server dedicato',
      amount: 5400,
      details: {
        determina: 'Determina disponibile',
        ordine: 'Inserito',
        fattura: 'Presente',
        mandato: 'In archivio',
        quietanza: 'Contabilità',
        ddt: 'Disponibile',
        procedura: 'Specifica',
        collaudo: 'Presente',
        carico: 'BC045A',
        ammortamentoInizio: '01/06/2024',
        ammortamentoFine: '01/06/2027',
        note: 'Info aggiuntive per configurazione rack'
      }
    },
    {
      id: 'eq2',
      name: 'Stampante 3D',
      amount: 3100,
      details: {
        determina: 'Determina disponibile',
        ordine: 'Inserito',
        fattura: 'Presente',
        mandato: 'In archivio',
        quietanza: 'Contabilità',
        ddt: 'Disponibile',
        procedura: 'Specifica',
        collaudo: 'Presente',
        carico: 'BC078B',
        ammortamentoInizio: '01/06/2024',
        ammortamentoFine: '01/06/2027',
        note: 'Dipartimento DIMEAS'
      }
    }
  ]

  const subcontractsData = [
    { partner: 'DataLab SRL', amount: 36000, object: 'Supporto tecnico per elaborazione dati e visualizzazione dashboard', status: 'Pagato' },
    { partner: 'EcoAnalisi SAS', amount: 20000, object: 'Analisi ambientali e chimiche sui campioni raccolti', status: 'In corso' },
    { partner: 'ConsulForm SPA', amount: 12000, object: 'Formazione tecnica ai partner internazionali', status: 'Previsto' },
  ]

  const overheadData = [
    { item: 'Trattenute Ateneo', amount: 9000, desc: 'Percentuale su spese generali secondo policy dell\'Ateneo' },
    { item: 'Trattenute Dipartimento', amount: 6000, desc: 'Quota dipartimentale trattenuta sulle spese del progetto' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>{t('my_expenses')}</h1>
          <p>{t('manage_expenses')}</p>
        </div>
        <div className="page-header-actions">
          <Link to="/expenses/new" className="btn btn-primary">
            <Plus size={18} /> {t('new_expense')}
          </Link>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="tabs" style={{ marginBottom: 0, paddingBottom: 0 }}>
        <button className={`tab-btn ${activeCategoryTab === 'all' ? 'active' : ''}`} onClick={() => setActiveCategoryTab('all')}>
          {t('all_expenses')}
        </button>
        <button className={`tab-btn ${activeCategoryTab === 'missions' ? 'active' : ''}`} onClick={() => setActiveCategoryTab('missions')}>
          {t('missions')}
        </button>
        <button className={`tab-btn ${activeCategoryTab === 'consumables' ? 'active' : ''}`} onClick={() => setActiveCategoryTab('consumables')}>
          {t('consumables')}
        </button>
        <button className={`tab-btn ${activeCategoryTab === 'equipment' ? 'active' : ''}`} onClick={() => setActiveCategoryTab('equipment')}>
          {t('equipment')}
        </button>
        <button className={`tab-btn ${activeCategoryTab === 'subcontracts' ? 'active' : ''}`} onClick={() => setActiveCategoryTab('subcontracts')}>
          {t('subcontracts')}
        </button>
        <button className={`tab-btn ${activeCategoryTab === 'overhead' ? 'active' : ''}`} onClick={() => setActiveCategoryTab('overhead')}>
          {t('overhead')}
        </button>
      </div>

      {/* RENDER DYNAMIC EXPENSES VIEW */}
      {activeCategoryTab === 'all' && (
        <>
          <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
              <Search className="icon" size={18} />
              <input 
                type="text" 
                className="form-control" 
                placeholder={t('search_expenses')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="filter-dropdown-wrapper" style={{ width: '180px' }}>
                <select className="form-control filter-select" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="">{t('all_statuses')}</option>
                  <option value="draft">{t('status_draft')}</option>
                  <option value="submitted">{t('status_submitted')}</option>
                  <option value="under_review">{t('status_under_review')}</option>
                  <option value="pm_approved">{t('status_pm_approved')}</option>
                  <option value="admin_approved">{t('status_admin_approved')}</option>
                  <option value="approved">{t('status_approved')}</option>
                  <option value="rejected">{t('status_rejected')}</option>
                </select>
                <div className="filter-icons-right">
                  <Filter size={13} />
                  <ChevronsUpDown size={13} />
                </div>
              </div>
              
              <div className="filter-dropdown-wrapper" style={{ width: '220px' }}>
                <select className="form-control filter-select" value={projectId} onChange={e => setProjectId(e.target.value)}>
                  <option value="">{t('all_projects')}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
                <div className="filter-icons-right">
                  <Filter size={13} />
                  <ChevronsUpDown size={13} />
                </div>
              </div>

              <div className="filter-dropdown-wrapper" style={{ width: '220px' }}>
                <select className="form-control filter-select" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                  <option value="">{t('all_categories')}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {t(`category_${c.code?.toLowerCase()}`, c.name)}
                    </option>
                  ))}
                </select>
                <div className="filter-icons-right">
                  <Filter size={13} />
                  <ChevronsUpDown size={13} />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <PageLoader />
            ) : expenses.length === 0 ? (
              <EmptyState title={t('no_expenses_found')} description={t('adjust_filters')} />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('title')}</th>
                      <th>{t('project')}</th>
                      <th>{t('date')}</th>
                      <th className="th-amount">{t('amount')}</th>
                      <th>{t('status')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(exp => (
                      <tr key={exp.id}>
                        <td style={{ fontWeight: 500 }}>
                          <Link to={`/expenses/${exp.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                            {exp.title}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {t(`category_${exp.category?.code?.toLowerCase()}`, exp.category?.name)} {exp.external_reference ? `• Ref: ${exp.external_reference}` : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>{exp.project?.code}</div>
                        </td>
                        <td>{formatDate(exp.expense_date)}</td>
                        <td className="td-amount" style={{ fontWeight: 600 }}>{formatCurrency(exp.amount)}</td>
                        <td><StatusBadge status={exp.status} /></td>
                        <td>
                          <Link to={`/expenses/${exp.id}`} className="btn btn-ghost btn-sm">
                            {t('view')}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* RENDER MISSIONS VIEW */}
      {activeCategoryTab === 'missions' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('project_missions')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('missions_desc')}</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('employee')}</th>
                  <th>{t('destination')}</th>
                  <th>{t('date')}</th>
                  <th>{t('object_workshop')}</th>
                  <th className="th-amount">{t('amount')}</th>
                  <th>{t('refund_status')}</th>
                </tr>
              </thead>
              <tbody>
                {missionsData.map((m, idx) => (
                  <tr key={idx}>
                    <td><strong>{m.name}</strong></td>
                    <td>{translateVal(m.dest)}</td>
                    <td>{m.date}</td>
                    <td>{translateVal(m.desc)}</td>
                    <td className="td-amount" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(m.amount)}</td>
                    <td><span className="badge" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>{t('approvata')}</span></td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
          <div style={{ padding: '1.5rem', textAlign: 'right', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
              {t('total_missions')}: <span style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{formatCurrency(missionsData.reduce((acc, m) => acc + m.amount, 0))}</span>
            </h4>
          </div>
        </div>
      )}

      {/* RENDER CONSUMABLES VIEW */}
      {activeCategoryTab === 'consumables' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('consumables_title')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('consumables_desc')}</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('purchase_name')}</th>
                  <th className="th-amount">{t('amount')}</th>
                  <th>{t('purchase_procedure')}</th>
                  <th>{t('delivery_status')}</th>
                </tr>
              </thead>
              <tbody>
                {consumablesData.map((c, idx) => (
                  <tr key={idx}>
                    <td><strong>{translateVal(c.name)}</strong></td>
                    <td className="td-amount" style={{ fontWeight: 600 }}>{formatCurrency(c.amount)}</td>
                    <td>{translateVal(c.procedure)}</td>
                    <td>
                      <span className="badge" style={{ 
                        borderColor: c.status === 'Consegnato' ? 'var(--success)' : c.status === 'Fatturato' ? 'var(--info)' : 'var(--warning)',
                        color: c.status === 'Consegnato' ? 'var(--success)' : c.status === 'Fatturato' ? 'var(--info)' : 'var(--warning)'
                      }}>
                        {translateState(c.status)}
                      </span>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
          <div style={{ padding: '1.5rem', textAlign: 'right', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
              {t('total_consumables')}: <span style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{formatCurrency(consumablesData.reduce((acc, c) => acc + c.amount, 0))}</span>
            </h4>
          </div>
        </div>
      )}

      {/* RENDER EQUIPMENT VIEW */}
      {activeCategoryTab === 'equipment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('equipment_title')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('equipment_desc')}</p>
          </div>

          {equipmentData.map((eq) => {
            const isExpanded = !!expandedEquipment[eq.id]
            return (
              <div className="card" key={eq.id} style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                <div 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => toggleEquipment(eq.id)}
                >
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{translateVal(eq.name)}</h4>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('amount')}: <strong>{formatCurrency(eq.amount)}</strong></span>
                  </div>
                  <button className="btn btn-ghost btn-sm">
                    {isExpanded ? t('hide_details') : t('show_checklist')}
                  </button>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
                    <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1rem' }}>
                      {t('doc_status_checklist')}
                    </h5>
                    
                    <div className="grid grid-3" style={{ gap: '1rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CheckCircle2 size={16} color="var(--success)" />
                        <span>{t('determina')}: <strong>{translateState(eq.details.determina)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CheckCircle2 size={16} color="var(--success)" />
                        <span>{t('ordine')}: <strong>{translateState(eq.details.ordine)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CheckCircle2 size={16} color="var(--success)" />
                        <span>{t('fattura')}: <strong>{translateState(eq.details.fattura)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CheckCircle2 size={16} color="var(--success)" />
                        <span>{t('mandato')}: <strong>{translateState(eq.details.mandato)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CheckCircle2 size={16} color="var(--success)" />
                        <span>{t('quietanza')}: <strong>{translateState(eq.details.quietanza)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CheckCircle2 size={16} color="var(--success)" />
                        <span>{t('ddt')}: <strong>{translateState(eq.details.ddt)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CheckCircle2 size={16} color="var(--success)" />
                        <span>{t('collaudo')}: <strong>{translateState(eq.details.collaudo)}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CheckCircle2 size={16} color="var(--success)" />
                        <span>{t('carico')}: <strong>{eq.details.carico}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Calendar size={16} color="var(--primary)" />
                        <span>{t('depreciation')}: <strong>{eq.details.ammortamentoInizio} - {eq.details.ammortamentoFine}</strong></span>
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem', fontSize: '0.85rem', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      <strong>{t('notes')}:</strong> {translateVal(eq.details.note)}
                    </div>
                  </div>
                )}

              </div>
            )
          })}
          
          <div className="card" style={{ padding: '1.5rem', textAlign: 'right' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {t('total_equipment')}: <span style={{ color: 'var(--primary)', fontSize: '1.35rem' }}>{formatCurrency(equipmentData.reduce((acc, eq) => acc + eq.amount, 0))}</span>
            </h4>
          </div>
        </div>
      )}

      {/* RENDER SUBCONTRACTS VIEW */}
      {activeCategoryTab === 'subcontracts' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('subcontracts_title')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('subcontracts_desc')}</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('supplier_partner')}</th>
                  <th>{t('activity_object')}</th>
                  <th className="th-amount">{t('contract_amount')}</th>
                  <th>{t('admin_status')}</th>
                </tr>
              </thead>
              <tbody>
                {subcontractsData.map((s, idx) => (
                  <tr key={idx}>
                    <td><strong>{s.partner}</strong></td>
                    <td style={{ maxWidth: '400px', fontSize: '0.85rem' }}>{translateVal(s.object)}</td>
                    <td className="td-amount" style={{ fontWeight: 600 }}>{formatCurrency(s.amount)}</td>
                    <td>
                      <span className="badge" style={{ 
                        borderColor: s.status === 'Pagato' ? 'var(--success)' : s.status === 'In corso' ? 'var(--warning)' : 'var(--text-muted)',
                        color: s.status === 'Pagato' ? 'var(--success)' : s.status === 'In corso' ? 'var(--warning)' : 'var(--text-muted)'
                      }}>
                        {translateState(s.status)}
                      </span>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
          <div style={{ padding: '1.5rem', textAlign: 'right', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
              {t('total_subcontracts')}: <span style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{formatCurrency(subcontractsData.reduce((acc, s) => acc + s.amount, 0))}</span>
            </h4>
          </div>
        </div>
      )}

      {/* RENDER OVERHEAD VIEW */}
      {activeCategoryTab === 'overhead' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{t('overhead_title')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{t('overhead_desc')}</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('imputed_item')}</th>
                  <th>{t('description')}</th>
                  <th className="th-amount">{t('quota_amount')}</th>
                </tr>
              </thead>
              <tbody>
                {overheadData.map((o, idx) => (
                  <tr key={idx}>
                    <td><strong>{translateVal(o.item)}</strong></td>
                    <td style={{ fontSize: '0.85rem' }}>{translateVal(o.desc)}</td>
                    <td className="td-amount" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(o.amount)}</td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
          <div style={{ padding: '1.5rem', textAlign: 'right', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
              {t('total_overhead')}: <span style={{ color: 'var(--primary)', fontSize: '1.25rem' }}>{formatCurrency(overheadData.reduce((acc, o) => acc + o.amount, 0))}</span>
            </h4>
          </div>
        </div>
      )}
    </div>
  )
}
