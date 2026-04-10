import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-zinc-100 px-4">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-2xl font-bold text-white">
            C
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Cashflow
          </h1>
        </div>

        <p className="text-xl text-zinc-600">
          Control de caja para tu empresa.
          <br />
          Simple, transparente y open source.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-emerald-600 px-8 text-base font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Empieza gratis
          </Link>
          <a
            href="https://github.com/tu-usuario/cashflow-app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-8 text-base font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            GitHub
          </a>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-left">
            <h3 className="font-semibold text-zinc-900">Tus datos, tu control</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Los datos se guardan en tu propio Google Drive. Nosotros no almacenamos nada.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-left">
            <h3 className="font-semibold text-zinc-900">Automatizable</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Compatible con Zapier y n8n. Conecta tu banco y automatiza la entrada de datos.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-left">
            <h3 className="font-semibold text-zinc-900">12€/año</h3>
            <p className="mt-2 text-sm text-zinc-500">
              O gratis si lo montas tú. Open source, sin trucos.
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-16 pb-8 text-sm text-zinc-400">
        Open source · Hecho para emprendedores
      </footer>
    </div>
  );
}
