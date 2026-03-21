import AuthButton from '@/components/AuthButton'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background text-foreground">
      <div className="z-10 max-w-5xl w-full flex flex-col items-center justify-center text-center font-mono text-sm gap-8">
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl text-blue-600">
          Omni-Brief
        </h1>
        <p className="mt-4 text-2xl text-muted-foreground">
          Multi-tenant platform for AI-powered summaries.
        </p>
        <div className="mt-8">
          <AuthButton />
        </div>
      </div>
    </main>
  );
}
