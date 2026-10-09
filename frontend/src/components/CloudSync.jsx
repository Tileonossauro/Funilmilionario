// GostoSAH cloud save: the Settings rows and the sign-in sheet (lib/cloud.js does the work).
import { useEffect, useRef, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { useStore } from '../store/useStore.js'
import { dateLocale } from '../lib/i18n-core.js'
import { useCloud, syncNow, signIn, signUp, signOut, resetPassword, updatePassword, cloudError } from '../lib/cloud.js'
import { Row, Button } from './ui.jsx'

const ui = () => useUI.getState()
const errStyle = { color: 'var(--red)', marginTop: 10 }
const MIN = 6

// The e-mail-and-password form: in a sheet from Settings, and as the welcome screen itself when
// the account comes first (views/Welcome.jsx). `close` runs once the account is in.
export function AuthForm({ close, initial = 'signin', autoFocus = true, title = true }) {
  const [mode, setMode] = useState(initial)   // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [sent, setSent] = useState(null)
  const ref = useRef(null)
  useEffect(() => { if (autoFocus) setTimeout(() => ref.current?.focus(), 250) }, [])
  const submit = async ev => {
    ev.preventDefault()
    if (busy) return
    const bad = !email.trim() ? 'Digite seu e-mail.'
      : mode !== 'reset' && !pw ? 'Digite sua senha.'
      : mode === 'signup' && pw.length < MIN ? `A senha precisa ter pelo menos ${MIN} caracteres.`
      : null
    if (bad) { setErr(bad); return }
    setBusy(true); setErr(null)
    try {
      if (mode === 'signin') { await signIn(email, pw); close(); ui().toast('Conectado! Seus treinos agora ficam salvos na nuvem.') }
      else if (mode === 'signup') {
        if (await signUp(email, pw)) { close(); ui().toast('Conta criada! Seus treinos agora ficam salvos na nuvem.') }
        else setSent('Enviamos um link de confirmação para ' + email.trim() + '. Abra o link neste celular e pronto.')
      } else { await resetPassword(email); setSent('Se esse e-mail tiver conta, chegou um link para criar uma senha nova.') }
    } catch (e) { setErr(cloudError(e)) }
    finally { setBusy(false) }
  }
  const heading = mode === 'signup' ? 'Criar conta' : mode === 'reset' ? 'Esqueci a senha' : 'Entrar'
  if (sent) return <>
    {title && <h3>{heading}</h3>}
    <div className="muted" style={{ marginBottom: 16 }}>{sent}</div>
    <Button variant="primary" onClick={() => { setSent(null); setMode('signin') }}>OK</Button>
  </>
  return <>
    {title && <h3>{heading}</h3>}
    <div className="muted small" style={{ marginBottom: 14 }}>
      {mode === 'reset' ? 'Mandamos um link para o seu e-mail para você criar uma senha nova.'
        : 'Com uma conta, seus treinos ficam salvos na nuvem: troque de celular ou limpe o navegador sem perder nada.'}
    </div>
    <form onSubmit={submit} noValidate>
      <input ref={ref} className="input" type="email" name="email" autoComplete="email" inputMode="email" placeholder="E-mail"
        autoCapitalize="none" autoCorrect="off" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} />
      {mode !== 'reset' && <>
        <div style={{ height: 10 }} />
        <input className="input" type="password" name="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          placeholder="Senha" value={pw} onChange={e => setPw(e.target.value)} />
        {mode === 'signup' && <div className="dim small" style={{ marginTop: 6 }}>Pelo menos {MIN} caracteres.</div>}
      </>}
      {err && <div className="small" role="alert" style={errStyle}>{err}</div>}
      <div style={{ height: 12 }} />
      <Button type="submit" variant="primary" disabled={busy}>{mode === 'signup' ? 'Criar conta' : mode === 'reset' ? 'Enviar link' : 'Entrar'}</Button>
    </form>
    <div style={{ height: 8 }} />
    {mode === 'signin' && <Button type="button" variant="ghost" className="dim" onClick={() => { setErr(null); setMode('reset') }}>Esqueci a senha</Button>}
    <Button type="button" variant="ghost" className="dim" onClick={() => { setErr(null); setMode(mode === 'signup' ? 'signin' : 'signup') }}>
      {mode === 'signup' ? 'Já tenho conta: entrar' : 'Não tenho conta: criar uma'}</Button>
  </>
}

function NewPasswordSheet({ close }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const submit = async ev => {
    ev.preventDefault()
    if (busy) return
    if (pw.length < MIN) { setErr(`A senha precisa ter pelo menos ${MIN} caracteres.`); return }
    setBusy(true); setErr(null)
    try { await updatePassword(pw); useCloud.setState({ recovering: false }); close(); ui().toast('Senha nova salva!') }
    catch (e) { setErr(cloudError(e)) }
    finally { setBusy(false) }
  }
  return <>
    <h3>Senha nova</h3>
    <form onSubmit={submit} noValidate>
      <input className="input" type="password" name="new-password" autoComplete="new-password" placeholder="Senha nova"
        value={pw} onChange={e => setPw(e.target.value)} autoFocus />
      {err && <div className="small" role="alert" style={errStyle}>{err}</div>}
      <div style={{ height: 12 }} />
      <Button type="submit" variant="primary" disabled={busy}>Salvar senha</Button>
    </form>
  </>
}

export const openCloudSignIn = (mode = 'signin') => ui().openSheet(close => <AuthForm close={close} initial={mode} />)

// Mounted once (App.jsx): asks for the new password when the app was opened from the reset e-mail.
export function CloudWatcher() {
  const recovering = useCloud(s => s.recovering)
  useEffect(() => {
    if (recovering) ui().openSheet(close => <NewPasswordSheet close={() => { useCloud.setState({ recovering: false }); close() }} />)
  }, [recovering])
  return null
}

const when = ms => new Date(ms).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })

export function cloudSummary(c) {
  if (!c.email) return { title: 'Seus dados', sub: 'Só neste celular. Entre para salvar na nuvem.' }
  const sub = c.status === 'ok' ? 'Salvo na nuvem' + (c.lastSynced ? ' às ' + when(c.lastSynced) : '')
    : c.status === 'syncing' ? 'Sincronizando…'
    : c.status === 'offline' ? 'Sem internet: salvo neste celular, sobe quando voltar'
    : c.status === 'error' ? 'Não deu para sincronizar. Toque para tentar de novo.'
    : 'Salvo na nuvem'
  return { title: c.email, sub }
}

export function CloudRows() {
  const c = useCloud()
  if (!c.ready) return null
  if (!c.email) return <>
    <Row icon="cloud" iconTint="var(--acc)" title="Salvar na nuvem" subtitle="Crie uma conta e não perca seus treinos se trocar de celular." accessory="chevron"
      onClick={() => openCloudSignIn('signup')} />
    <Row icon="key" iconTint="var(--blue)" title="Já tenho conta: entrar" accessory="chevron" onClick={() => openCloudSignIn('signin')} />
  </>
  const { sub } = cloudSummary(c)
  return <>
    <Row icon="cloud" iconTint={c.status === 'error' ? 'var(--red)' : 'var(--acc)'} title={c.email} subtitle={sub} />
    <Row icon="reset" iconTint="var(--blue)" title="Sincronizar agora" accessory="chevron"
      onClick={async () => { await syncNow(); const s = useCloud.getState(); ui().toast(s.status === 'ok' ? 'Tudo salvo na nuvem' : cloudSummary(s).sub) }} />
    <Row icon="info" iconTint="var(--acc)" title="Ver o tutorial de novo" accessory="chevron"
      onClick={() => useStore.getState().update(s => { s.tourDone = false })} />
    <Row icon="signOut" iconTint="var(--red)" title="Sair da conta" subtitle="Os dados continuam neste celular." danger
      onClick={async () => { await signOut(); ui().toast('Você saiu da conta') }} />
  </>
}
