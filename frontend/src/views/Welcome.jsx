// GostoSAH's first screens (cloud build only, see App.jsx): the account comes first, so everything
// she logs is saved from the first set; then a short tour, once per account (S.tourDone, synced
// with the rest of the state, so a second phone does not show it again).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { AuthForm } from '../components/CloudSync.jsx'

const wrap = { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '86vh' }
const logo = <div style={{ fontSize: 54, display: 'flex', justifyContent: 'center', color: 'var(--acc)' }}><Icon name="dumbbell" /></div>

export function CloudWelcome() {
  return (
    <div className="narrow" style={wrap}>
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        {logo}
        <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.028em', margin: '10px 0 4px' }}>GostoSAH</h1>
        <div className="muted">Seu app de treino. Crie sua conta para salvar tudo desde o primeiro treino.</div>
      </div>
      <div className="card" style={{ padding: 18 }}>
        <AuthForm initial="signup" autoFocus={false} close={() => {}} />
      </div>
    </div>
  )
}

// What each step teaches, in the words and names the app shows (tab bar: Início, Plano, Começar,
// Estatísticas, Exercícios).
export const TOUR = [
  { icon: 'dumbbell', title: 'Bem-vinda ao GostoSAH!', text: 'Em um minutinho eu te mostro como usar. Dá pra pular e ver de novo depois em Configurações → Conta.' },
  { icon: 'calendar', title: 'Monte seu plano', text: 'Na aba Plano você escolhe um plano pronto ou cria seus treinos do zero, um para cada dia da semana.' },
  { icon: 'play', title: 'Comece o treino', text: 'O botão verde Começar, no meio da barra de baixo, abre o treino do dia já montado, com os pesos que você usou da última vez.' },
  { icon: 'timer', title: 'Marque cada série', text: 'Terminou uma série? Toque nela para marcar. O cronômetro de descanso começa sozinho e avisa quando é hora da próxima. Bateu recorde, o app comemora.' },
  { icon: 'figureStrength', title: 'Veja como fazer', text: 'Na aba Exercícios tem mais de 1.300 exercícios com animação. Busque pelo nome ou pelo músculo que quer treinar.' },
  { icon: 'chartLine', title: 'Acompanhe a evolução', text: 'Em Estatísticas ficam os gráficos, os recordes e o mapa dos músculos. O peso corporal você registra no Início, em Peso corporal → Registrar.' },
  { icon: 'cloud', title: 'Tudo salvo na nuvem', text: 'Cada treino vai para a sua conta automaticamente. Dica: adicione o GostoSAH à tela inicial do celular para abrir como um app.' },
]

export function Onboarding() {
  const [i, setI] = useState(0)
  const nav = useNavigate()
  const update = useStore(s => s.update)
  const done = () => { update(s => { s.tourDone = true }); nav('/home', { replace: true }) }
  const step = TOUR[i]
  const last = i === TOUR.length - 1
  return (
    <div className="narrow" style={wrap}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {!last && <Button variant="ghost" className="dim" style={{ width: 'auto' }} onClick={done}>Pular</Button>}
      </div>
      <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 64, display: 'flex', justifyContent: 'center', color: 'var(--acc)' }}><Icon name={step.icon} /></div>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', margin: '18px 0 10px' }}>{step.title}</h1>
        <div className="muted" style={{ fontSize: 17, lineHeight: 1.5 }}>{step.text}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, margin: '26px 0 18px' }} aria-label={`Passo ${i + 1} de ${TOUR.length}`}>
        {TOUR.map((_, k) => <span key={k} style={{ width: k === i ? 20 : 8, height: 8, borderRadius: 4, background: k === i ? 'var(--acc)' : 'var(--label-4)', transition: 'width .2s' }} />)}
      </div>
      <Button variant="primary" onClick={() => (last ? done() : setI(i + 1))}>{last ? 'Bora treinar!' : 'Próximo'}</Button>
      {i > 0 && <><div style={{ height: 8 }} /><Button variant="ghost" className="dim" onClick={() => setI(i - 1)}>Voltar</Button></>}
    </div>
  )
}
