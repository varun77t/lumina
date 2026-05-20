import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FileText, MessageSquare, BookOpen, Quote, ArrowRight, Sparkles } from 'lucide-react'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: 'easeOut' }
  })
}

const features = [
  {
    icon: FileText,
    title: 'Upload PDFs',
    description: 'Drag and drop your documents. We handle the rest: extraction, indexing, and embedding.'
  },
  {
    icon: MessageSquare,
    title: 'Ask Questions',
    description: 'Natural language queries about your documents. Get precise answers in seconds.'
  },
  {
    icon: BookOpen,
    title: 'AI Summaries',
    description: 'Generate concise, intelligent summaries with key takeaways from any document.'
  },
  {
    icon: Quote,
    title: 'Source Citations',
    description: 'Every answer comes with page references. Verify and trust the intelligence.'
  }
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Mesh Background */}
      <div className="mesh-bg" />

      <div
        className="fixed inset-x-0 top-0 h-[460px] pointer-events-none opacity-[0.05]"
        style={{ background: 'radial-gradient(ellipse at center top, white 0%, transparent 68%)' }}
      />

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex items-center justify-between px-8 md:px-16 py-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
            <Sparkles className="w-4 h-4 text-white/80" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Lumina AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/auth')}
            className="text-sm text-white/50 hover:text-white/80 transition-colors duration-300 px-4 py-2"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/auth')}
            className="text-sm bg-white text-black px-5 py-2.5 rounded-full font-medium hover:bg-white/90 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            Get Started
          </button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center px-8 pt-20 md:pt-24 pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-sm mb-8"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white/55 animate-pulse" />
          <span className="text-xs text-white/50 font-medium tracking-wide">AI-Powered Document Intelligence</span>
        </motion.div>

        <motion.h1
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-center max-w-5xl leading-[1.05] tracking-tight"
        >
          <span className="text-gradient">Your documents,</span>
          <br />
          <span className="text-white/90">transformed into</span>
          <br />
          <span className="text-gradient">intelligence.</span>
        </motion.h1>

        <motion.p
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-base md:text-lg text-white/35 text-center max-w-2xl mt-7 leading-relaxed font-light"
        >
          Upload any PDF. Ask anything. Get precise, cited answers powered by advanced RAG technology and Gemini AI.
        </motion.p>

        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-4 mt-9"
        >
          <button
            onClick={() => navigate('/auth')}
            className="group flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-full font-medium text-sm hover:bg-white/90 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            Start for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
          <button
            onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="px-8 py-3.5 rounded-full font-medium text-sm text-white/50 border border-white/10 hover:border-white/20 hover:text-white/70 transition-all duration-300"
          >
            Learn more
          </button>
        </motion.div>

        {/* Floating UI Preview */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-14 w-full max-w-4xl"
        >
          <div className="glass-card p-1.5 glow-md">
            <div className="bg-lumina-950 rounded-[16px] p-6 md:p-8">
              {/* Mock workspace header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white/5 rounded-lg px-4 py-1.5 text-xs text-white/30 font-mono">
                    lumina.ai/workspace
                  </div>
                </div>
              </div>
              {/* Mock content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-white/30" />
                    <span className="text-xs text-white/40 font-medium">Document Viewer</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-white/5 rounded-full w-full" />
                    <div className="h-2 bg-white/5 rounded-full w-4/5" />
                    <div className="h-2 bg-white/5 rounded-full w-3/5" />
                    <div className="h-2 bg-white/5 rounded-full w-full" />
                    <div className="h-2 bg-white/5 rounded-full w-2/3" />
                  </div>
                </div>
                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-white/30" />
                    <span className="text-xs text-white/40 font-medium">AI Chat</span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/[0.04] rounded-lg p-3 max-w-[80%]">
                      <div className="h-2 bg-white/10 rounded-full w-full mb-1.5" />
                      <div className="h-2 bg-white/10 rounded-full w-2/3" />
                    </div>
                    <div className="bg-white/[0.06] rounded-lg p-3 max-w-[85%] ml-auto">
                      <div className="h-2 bg-white/10 rounded-full w-full mb-1.5" />
                      <div className="h-2 bg-white/10 rounded-full w-4/5 mb-1.5" />
                      <div className="h-2 bg-white/10 rounded-full w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-8 md:px-16 py-28">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="text-gradient">Everything you need.</span>
          </h2>
          <p className="text-white/30 text-lg max-w-xl mx-auto">
            A complete document intelligence platform, distilled to its essence.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="glass-card-hover p-8"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-5 border border-white/5">
                <feature.icon className="w-5 h-5 text-white/50" />
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">{feature.title}</h3>
              <p className="text-sm text-white/35 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-8 md:px-16 py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="glass-card max-w-3xl mx-auto p-12 md:p-16 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-gradient">
            Ready to illuminate your documents?
          </h2>
          <p className="text-white/30 text-base mb-8 max-w-md mx-auto">
            Join Lumina AI and transform how you interact with your documents.
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="group inline-flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-full font-medium text-sm hover:bg-white/90 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            Get started now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 md:px-16 py-8 border-t border-white/5">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white/30" />
            <span className="text-sm text-white/30">Lumina AI</span>
          </div>
          <span className="text-xs text-white/20">Built with intelligence.</span>
        </div>
      </footer>
    </div>
  )
}
