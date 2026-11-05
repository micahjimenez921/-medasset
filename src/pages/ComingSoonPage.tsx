import PageHeader from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'

/** Temporary placeholder for pages we have not built yet. */
export default function ComingSoonPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="p-10 text-center text-sm text-slate-500">This page is built in the next step.</Card>
    </>
  )
}
