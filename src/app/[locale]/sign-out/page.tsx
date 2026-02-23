import { signOut } from "@/lib/auth";

export default async function SignOutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Sign out</h1>
          <p className="text-sm text-slate-500">
            End your current admin session.
          </p>
        </header>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: `/${locale}/admin/dashboard` });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Confirm sign out
          </button>
        </form>
      </div>
    </main>
  );
}
