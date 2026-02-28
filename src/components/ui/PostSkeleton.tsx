const PostSkeleton = () => {
  return (
    <div className="rounded-3xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] p-4 relative overflow-hidden animate-skeleton-pulse">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.05] to-transparent skew-x-[-20deg]" />
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-white/[0.08]" />
        <div className="space-y-2.5 flex-1">
          <div className="h-3.5 w-32 rounded-full bg-white/[0.08]" />
          <div className="h-2.5 w-20 rounded-full bg-white/[0.05]" />
        </div>
      </div>

      {/* Body lines */}
      <div className="space-y-3 mb-6">
        <div className="h-3 w-full rounded-full bg-white/[0.08]" />
        <div className="h-3 w-11/12 rounded-full bg-white/[0.07]" />
        <div className="h-3 w-4/5 rounded-full bg-white/[0.05]" />
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-8 pt-4 border-t border-white/5">
        <div className="h-5 w-14 rounded-full bg-white/[0.07]" />
        <div className="h-5 w-14 rounded-full bg-white/[0.07]" />
      </div>
    </div>
  );
};

export { PostSkeleton };
