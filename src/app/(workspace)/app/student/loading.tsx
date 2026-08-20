export default function StudentDiscoveryLoading() {
  return (
    <main aria-busy="true" className="min-h-screen bg-[#07090d] px-4 py-4 text-white sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-[1500px] animate-pulse">
        <div className="h-16 border border-white/10 bg-white/[0.025]" />
        <section className="py-10">
          <div className="h-3 w-28 bg-[#9db2ff]/15" />
          <div className="mt-4 h-10 max-w-xl bg-white/[0.07]" />
        </section>
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div className="min-h-[300px] border border-white/10 bg-white/[0.025] p-5" key={item}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#9db2ff]/15" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 bg-white/[0.08]" />
                  <div className="h-3 w-1/3 bg-white/[0.06]" />
                </div>
              </div>
              <div className="mt-7 h-20 border-y border-white/8 py-4">
                <div className="h-4 w-1/2 bg-white/[0.08]" />
                <div className="mt-3 h-3 w-4/5 bg-white/[0.06]" />
              </div>
              <div className="mt-6 h-11 w-32 bg-[#9db2ff]/15" />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
