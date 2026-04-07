import { getPendingDocuments } from "@/app/actions/training";
import AdminTrainingPanel from "@/components/training/AdminTrainingPanel";

export default async function AdminTrainingPage() {
  const documents = await getPendingDocuments();

  // For KPIs we load all docs (getPendingDocuments returns only non-ingested/rejected)
  // so counts here are for pending docs
  const pending = documents.filter(
    (d) => !["ingested", "rejected"].includes(d.status),
  ).length;
  const byTenant = new Set(documents.map((d) => d.tenant_id)).size;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Entrenamiento — Panel Analistas
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Revisá, editá y aprobá los documentos subidos por los clientes antes
          de la ingesta al vector store.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Docs pendientes
          </p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Total cargados
          </p>
          <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Clientes
          </p>
          <p className="text-2xl font-bold text-gray-900">{byTenant}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Para revisar hoy
          </p>
          <p className="text-2xl font-bold text-blue-600">
            {
              documents.filter((d) =>
                ["uploaded", "extracted"].includes(d.status),
              ).length
            }
          </p>
        </div>
      </div>

      {/* Panel */}
      <AdminTrainingPanel initialDocuments={documents} />

      {/* Workflow */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-5">
          Flujo de trabajo del analista
        </h2>
        <div className="flex items-start gap-0">
          {[
            {
              step: "1",
              label: "Cliente sube documentos",
              desc: "PDF, TXT, CSV, DOCX → extracción + quality score automático",
              color: "bg-blue-500",
            },
            {
              step: "2",
              label: "Revisión y edición",
              desc: "Abrí el doc, editá el texto en la pestaña Procesado, ajustá la config de chunking",
              color: "bg-amber-500",
            },
            {
              step: "3",
              label: "Ingesta",
              desc: "Presioná Ingestar → chunking + embeddings + Qdrant upsert automático",
              color: "bg-purple-500",
            },
            {
              step: "4",
              label: "Agente actualizado",
              desc: "El agente del cliente ya puede usar el nuevo conocimiento en sus respuestas",
              color: "bg-emerald-500",
            },
          ].map((item, i, arr) => (
            <div key={item.step} className="flex items-start flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                >
                  {item.step}
                </div>
              </div>
              <div className="ml-3 flex-1 pb-6">
                <p className="text-sm font-semibold text-gray-800">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              {i < arr.length - 1 && (
                <svg
                  className="text-gray-200 mt-2 mx-1 shrink-0"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
