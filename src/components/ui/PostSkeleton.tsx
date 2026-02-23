const PostSkeleton = () => {
  return (
    <div className="rounded-3xl bg-[#0A0A0A]/50 backdrop-blur-md border border-white/[0.05] p-4 relative overflow-hidden">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-primary/10 to-transparent skew-x-[-15deg]" />
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-full bg-white/[0.06]" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-28 rounded-full bg-white/[0.06]" />
          <div className="h-2 w-16 rounded-full bg-white/[0.04]" />
        </div>
      </div>

      {/* Body lines */}
      <div className="space-y-2.5 mb-5">
        <div className="h-3 w-full rounded-full bg-white/[0.06]" />
        <div className="h-3 w-4/5 rounded-full bg-white/[0.05]" />
        <div className="h-3 w-3/5 rounded-full bg-white/[0.04]" />
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-6 pt-3 border-t border-white/[0.04]">
        <div className="h-4 w-12 rounded-full bg-white/[0.05]" />
        <div className="h-4 w-12 rounded-full bg-white/[0.05]" />
      </div>
    </div>
  );
};

export { PostSkeleton };
