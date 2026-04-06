import { motion } from "framer-motion";

export function Skeleton({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "text" | "card";
}) {
  const baseClass = "bg-gray-200 rounded overflow-hidden";

  return (
    <motion.div
      className={`${baseClass} ${className}`}
      animate={{
        backgroundColor: ["#e5e7eb", "#f3f4f6", "#e5e7eb"],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <motion.div
      className="border border-gray-200 rounded-lg p-6 bg-white"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Skeleton className="h-6 w-1/3 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function SkeletonKPICard() {
  return (
    <motion.div
      className="border border-gray-200 rounded-lg p-6 bg-white"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Skeleton className="h-4 w-1/2 mb-4" />
      <Skeleton className="h-10 w-2/3 mb-4" />
      <Skeleton className="h-3 w-1/3" />
    </motion.div>
  );
}
