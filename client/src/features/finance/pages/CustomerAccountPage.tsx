import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { CustomerAccountPanel } from '../components/CustomerAccountPanel'

export function CustomerAccountPage() {
  const { t } = useTranslation(['finance', 'common'])
  const { customerId } = useParams()
  if (!customerId) return null
  return (
    <div className="space-y-4">
      <Link to="/contacts">
        <Button variant="outline">{t('finance:customerAccount.backToContacts')}</Button>
      </Link>
      <CustomerAccountPanel customerId={customerId} />
    </div>
  )
}
