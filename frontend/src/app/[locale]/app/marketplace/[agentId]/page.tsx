"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Star, Users, ArrowLeft, ShoppingCart, Play, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageTransition } from "@/components/animations/PageTransition";
import { useToast } from "@/hooks/useToast";
import {
  getMarketplaceAgent, purchaseAgent, getAgentReviews, submitReview,
  MarketplaceAgent, Review,
} from "@/app/actions/marketplace";

const TABS = ["Descripción", "Reviews", "Precios", "Demo"] as const;
type Tab = typeof TABS[number];

function StarRating({ rating, interactive = false, onChange }: {
  rating: number; interactive?: boolean; onChange?: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => interactive && onChange?.(s)}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={interactive ? 24 : 16}
            className={(hover || rating) >= s ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="border border-gray-100 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {review.authorInitials}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">{review.authorName}</p>
            <p className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString("es-AR")}</p>
          </div>
          <StarRating rating={review.rating} />
          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{review.comment}</p>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceAgentDetailPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const { addToast } = useToast();

  const [agent, setAgent] = useState<MarketplaceAgent | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Descripción");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [agentData, reviewsData] = await Promise.all([
          getMarketplaceAgent(agentId),
          getAgentReviews(agentId, 1, 0),
        ]);
        if (agentData) setAgent(agentData);
        setReviews(reviewsData.reviews);
        setTotalReviews(reviewsData.total);
        setTotalPages(reviewsData.totalPages);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [agentId]);

  useEffect(() => {
    const loadReviews = async () => {
      const data = await getAgentReviews(agentId, page, ratingFilter);
      setReviews(data.reviews);
      setTotalReviews(data.total);
      setTotalPages(data.totalPages);
    };
    loadReviews();
  }, [agentId, page, ratingFilter]);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const result = await purchaseAgent(agentId);
      if (result.success) {
        addToast(`¡Agente comprado! ID: ${result.subscriptionId}`, "success");
      } else {
        addToast(result.error ?? "Error al comprar", "error");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      const result = await submitReview(agentId, reviewRating, reviewComment);
      if (result.success) {
        addToast("Review enviada correctamente", "success");
        setShowReviewForm(false);
        setReviewComment("");
        setReviewRating(5);
        const data = await getAgentReviews(agentId, 1, ratingFilter);
        setReviews(data.reviews);
      } else {
        addToast(result.error ?? "Error al enviar review", "error");
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-80 bg-gray-200 rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!agent) {
    return (
      <PageTransition>
        <div className="text-center py-16">
          <p className="text-gray-500">Agente no encontrado</p>
          <Link href="../marketplace" className="text-blue-600 hover:underline mt-2 block">Volver al Marketplace</Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Back */}
        <Link href="../marketplace" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} />
          Marketplace
        </Link>

        {/* Hero: 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Image */}
          <motion.div
            className="relative h-80 bg-gray-100 rounded-xl overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Image src={agent.image} alt={agent.name} fill className="object-cover" />
            <div className="absolute top-3 left-3 flex gap-2">
              {agent.isPopular && (
                <span className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Popular</span>
              )}
              {agent.isNew && (
                <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">Nuevo</span>
              )}
            </div>
          </motion.div>

          {/* Right: Info */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div>
              <p className="text-sm text-blue-600 font-medium mb-1">{agent.category}</p>
              <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <StarRating rating={agent.rating} />
              <span className="font-semibold text-gray-900">{agent.rating}</span>
              <span className="text-gray-500 text-sm">({agent.reviewCount} reviews)</span>
            </div>

            <p className="text-gray-600 leading-relaxed">{agent.description}</p>

            {/* Features */}
            <div className="flex flex-wrap gap-2">
              {agent.features.map((f, i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                  {f}
                </span>
              ))}
            </div>

            {/* Monthly users */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Users size={16} />
              <span>{agent.monthlyUsers.toLocaleString()} usuarios activos/mes</span>
            </div>

            {/* Price */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 mb-1">Precio mensual</p>
              <p className="text-4xl font-bold text-blue-600">${agent.price}<span className="text-lg text-gray-500 font-normal">/mes</span></p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <ShoppingCart size={18} />
                {purchasing ? "Comprando..." : "Comprar ahora"}
              </button>
              <button className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                <Play size={16} />
                Testear
              </button>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div>
          <div className="border-b border-gray-200 flex gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab} {tab === "Reviews" && `(${totalReviews})`}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {/* Descripción Tab */}
            {activeTab === "Descripción" && (
              <div className="border border-gray-200 rounded-lg p-6 bg-white space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Acerca de este agente</h3>
                <p className="text-gray-700 leading-relaxed">{agent.description}</p>
                <h4 className="font-semibold text-gray-900">Capacidades principales</h4>
                <ul className="space-y-2">
                  {agent.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === "Reviews" && (
              <div className="space-y-6">
                {/* Header + write review */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={agent.rating} />
                      <span className="text-2xl font-bold text-gray-900">{agent.rating}</span>
                    </div>
                    <p className="text-sm text-gray-500">{totalReviews} reviews</p>
                  </div>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    Escribir review
                  </button>
                </div>

                {/* Review form */}
                <AnimatePresence>
                  {showReviewForm && (
                    <motion.div
                      className="border border-blue-200 bg-blue-50 rounded-lg p-5 space-y-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <h4 className="font-semibold text-gray-900">Tu review</h4>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Calificación</p>
                        <StarRating rating={reviewRating} interactive onChange={setReviewRating} />
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Escribe tu experiencia con este agente..."
                        rows={4}
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleSubmitReview}
                          disabled={submittingReview || !reviewComment.trim()}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                        >
                          {submittingReview ? "Enviando..." : "Publicar"}
                        </button>
                        <button
                          onClick={() => setShowReviewForm(false)}
                          className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Filter */}
                <div className="flex gap-2">
                  {[0, 5, 4, 3].map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRatingFilter(r); setPage(1); }}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        ratingFilter === r ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-blue-300"
                      }`}
                    >
                      {r === 0 ? "Todos" : `${r}⭐+`}
                    </button>
                  ))}
                </div>

                {/* Review list */}
                <div className="space-y-4">
                  {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
                  {reviews.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No hay reviews con este filtro</p>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Precios Tab */}
            {activeTab === "Precios" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { plan: "Mensual", price: agent.price, per: "mes", desc: "Facturación mensual, cancela cuando quieras" },
                  { plan: "Anual", price: Math.round(agent.price * 10), per: "año", desc: `Ahorrás $${agent.price * 2} vs mensual — 2 meses gratis`, highlight: true },
                ].map((p) => (
                  <div
                    key={p.plan}
                    className={`border-2 rounded-xl p-6 space-y-4 ${p.highlight ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}
                  >
                    {p.highlight && (
                      <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-semibold">Recomendado</span>
                    )}
                    <h3 className="text-xl font-bold text-gray-900">{p.plan}</h3>
                    <p className="text-3xl font-bold text-blue-600">
                      ${p.price}<span className="text-base text-gray-500 font-normal">/{p.per}</span>
                    </p>
                    <p className="text-sm text-gray-600">{p.desc}</p>
                    <button
                      onClick={handlePurchase}
                      disabled={purchasing}
                      className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors ${
                        p.highlight ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-blue-600 text-blue-600 hover:bg-blue-50"
                      } disabled:opacity-50`}
                    >
                      Elegir {p.plan}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Demo Tab */}
            {activeTab === "Demo" && (
              <div className="border border-gray-200 rounded-lg p-8 bg-white text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                  <Play size={28} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Demo interactiva</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Prueba este agente con consultas de ejemplo antes de comprarlo. La demo tiene 5 consultas gratuitas.
                </p>
                <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                  Iniciar Demo Gratuita
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
