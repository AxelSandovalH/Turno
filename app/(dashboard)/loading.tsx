import { Spinner } from '@/components/ui/spinner'

export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Spinner size={28} />
    </div>
  )
}
