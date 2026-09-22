import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CloseSessionScreen } from '../components/CloseSessionScreen'
import { usePosSession } from '../hooks/usePos'

export function PosSessionClosePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const session = usePosSession(id)
  if (session.isPending) return <div className="grid min-h-72 place-items-center text-sm text-muted-foreground">Loading session…</div>
  if (session.isError || !session.data) return <div className="grid min-h-72 place-items-center gap-3 text-sm text-destructive"><p>{session.error?.message ?? 'Session not found.'}</p><Button variant="outline" onClick={() => navigate('/pos')}>Back to sessions</Button></div>
  return <CloseSessionScreen session={session.data} onCancel={() => navigate('/pos')} onClosed={(report) => navigate(`/pos/z-reports/${report.id}`)} />
}
