import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CustomerAccountPanel } from '../components/CustomerAccountPanel'

export function CustomerAccountPage() {
  const { customerId } = useParams()
  if (!customerId) return null
  return <div className="space-y-4"><Link to="/contacts"><Button variant="outline">Back to contacts</Button></Link><CustomerAccountPanel customerId={customerId} /></div>
}
