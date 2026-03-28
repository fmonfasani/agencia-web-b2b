import AcceptInvitationForm from "@/components/invitations/AcceptInvitationForm";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function AcceptInvitationPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
          <h1 className="text-xl font-bold text-slate-900">Enlace inválido</h1>
          <p className="text-slate-500 text-sm">
            Token de invitación no encontrado en la URL.
          </p>
        </div>
      </div>
    );
  }

  return <AcceptInvitationForm token={token} />;
}
