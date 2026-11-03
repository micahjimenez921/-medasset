import Button from './Button'

export default function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <p className="font-semibold">Could not load data</p>
      <p className="mt-1">{message}</p>
      <p className="mt-1 text-xs text-red-700/80">
        Check that XAMPP MySQL and the Django server (python manage.py runserver) are running.
      </p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
