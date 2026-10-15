import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* NAV — original design unchanged */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0C2C68] rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">U</span>
          </div>
          <span className="text-xl font-bold text-[#0C2C68] tracking-tight">UnifyLine</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
          <a href="#features" className="hover:text-[#0C2C68] transition">Features</a>
          <a href="#how-it-works" className="hover:text-[#0C2C68] transition">How It Works</a>
          <a href="#pricing" className="hover:text-[#0C2C68] transition">Pricing</a>
          <a href="#verticals" className="hover:text-[#0C2C68] transition">Why UnifyLine</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-gray-500 hover:text-[#0C2C68] transition font-medium">Sign In</Link>
          <Link href="/get-started" className="bg-[#0C2C68] hover:bg-[#1A56C4] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">Request a Demo</Link>
        </div>
      </nav>

      {/* HERO — original design, updated content */}
      <section className="relative pt-32 pb-24 px-6 text-center bg-gradient-to-b from-blue-50/50 to-white overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-100/40 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 text-sm text-[#0C2C68] font-medium mb-8">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            AI receptionist for small businesses
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6 text-[#0C2C68]">
            Your Business.<br />
            <span className="bg-gradient-to-r from-[#1A56C4] to-[#0C2C68] bg-clip-text text-transparent">Answered. Around the clock.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto mb-4 leading-relaxed">
            UnifyLine gives small businesses an AI receptionist that answers every call 24/7 and sends you every lead.
          </p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            One platform for your business calls, team softphone extensions, call summaries and a daily Morning Briefing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/get-started" className="w-full sm:w-auto bg-[#0C2C68] hover:bg-[#1A56C4] text-white font-bold text-lg px-8 py-4 rounded-xl transition flex items-center justify-center gap-2">
              Request a Demo
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto border border-gray-200 hover:border-[#0C2C68] text-gray-600 hover:text-[#0C2C68] font-semibold text-lg px-8 py-4 rounded-xl transition text-center">See How It Works</a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              {value:"24/7",  label:"Answering, nights and weekends"},
              {value:"Logged", label:"Every call summarized"},
              {value:"$297",  label:"Managed from /month"},
            ].map(({value, label}) => (
              <div key={label} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                <p className="text-2xl font-black text-[#0C2C68]">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — original design, updated content */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#0C2C68]">Why UnifyLine?</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">An AI receptionist that answers your calls, takes messages, and works for your business around the clock.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon:"📞", tag:"Your Team", bg:"bg-blue-50", border:"border-blue-100", tag_color:"text-blue-600",
                title:"One Platform for Your Whole Team",
                desc:"One number. One app. One bill. Calls answered and routed to your team's softphone extensions. Your whole team works from the same system, each with their own extension.",
              },
              {
                icon:"🤖", tag:"AI-First", bg:"bg-purple-50", border:"border-purple-100", tag_color:"text-purple-600",
                title:"An Intelligent Co-Worker, Not Just a Bot",
                desc:"UnifyLine's AI answers your calls, captures each caller's details and reason for calling, and prepares your morning briefing. We tune its script and knowledge base as your business changes.",
              },
              {
                icon:"📈", tag:"Outcome-First", bg:"bg-green-50", border:"border-green-100", tag_color:"text-green-600",
                title:"Every Lead, in Your Inbox",
                desc:"Every call becomes a summary you can read. Hot leads get flagged instantly. Your team gets daily AI briefings. Every lead lands in your dashboard and your inbox.",
              },
            ].map(({icon, title, desc, tag, bg, border, tag_color}) => (
              <div key={title} className={`${bg} border ${border} rounded-2xl p-8`}>
                <div className="text-4xl mb-4">{icon}</div>
                <span className={`text-xs font-bold uppercase tracking-widest ${tag_color} mb-3 block`}>{tag}</span>
                <h3 className="text-xl font-bold text-[#0C2C68] mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — original design, updated content */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#0C2C68]">How It Works</h2>
            <p className="text-gray-500 text-lg">Your AI receptionist, set up for you.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                {step:"01", title:"Get your number", desc:"Get a local US number, or forward your existing business line. We set up and test the AI before it goes live."},
                {step:"02", title:"Tell us about your business", desc:"Share your business name, hours, services, and how you want callers handled. We set up the script and knowledge base for you."},
                {step:"03", title:"Connect your whole team", desc:"Your staff download the app and get their own extensions."},
                {step:"04", title:"Wake up to intelligence", desc:"Every morning, a briefing of who called, what they needed, which leads are hot, and what requires your attention. Your AI worked all night."},
              ].map(({step, title, desc}) => (
                <div key={step} className="flex gap-5">
                  <div className="w-12 h-12 bg-[#0C2C68] rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">{step}</div>
                  <div><h3 className="font-bold text-[#0C2C68] mb-1">{title}</h3><p className="text-gray-500 text-sm leading-relaxed">{desc}</p></div>
                </div>
              ))}
            </div>
            <div className="bg-[#0C2C68] rounded-3xl p-6 max-w-sm mx-auto shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-green-400/60" />
                <span className="text-blue-300 text-xs ml-2">Live Call</span>
                <div className="ml-auto flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs">Active</span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  {from:"Caller", msg:"Hi, I need transportation for 200 employees daily in Atlanta.", align:"left"},
                  {from:"AI",     msg:"I can help with that. What area of Atlanta and what start date?", align:"right"},
                  {from:"Caller", msg:"Midtown to Hartsfield, starting next month.", align:"left"},
                  {from:"AI",     msg:"Perfect — I'm flagging this as a priority and our fleet team will call you back shortly.", align:"right"},
                ].map((m, i) => (
                  <div key={i} className={`flex ${m.align === "right" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.align === "right" ? "bg-blue-500 text-white" : "bg-white/10 text-blue-100"}`}>
                      <span className="font-semibold block mb-0.5 opacity-70">{m.from}</span>
                      {m.msg}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-3 text-sm">
                <p className="text-green-400 font-semibold text-xs">🔥 Hot lead — emailed to the sales team.</p>
                <p className="text-blue-300 text-xs mt-0.5">Fleet inquiry · 200 employees · Midtown Atlanta</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOUND FAMILIAR — replaces industry list */}
      <section id="verticals" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#0C2C68]">Sound Familiar?</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">If your business communicates with customers — UnifyLine was built for you.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {problem:"Calls go to voicemail and leads disappear.", solution:"UnifyLine's AI answers your calls 24/7, takes the caller's details, and emails your team right away, even at 2am."},
              {problem:"Your team is spread across cities or countries.", solution:"Every team member gets an extension in the UnifyLine app."},
              {problem:"You're paying too much for a legacy phone system.", solution:"Add an AI receptionist and team extensions for a simple monthly price."},
              {problem:"You don't know what callers actually want.", solution:"Every call is transcribed, summarized by AI, and waiting in your dashboard. Your morning briefing tells you what matters."},
              {problem:"Your personal number is your business number.", solution:"Get a dedicated local US business number and keep your personal number private."},
            ].map(({problem, solution}) => (
              <div key={problem} className="bg-gray-50 border border-gray-100 rounded-xl p-6 shadow-sm">
                <p className="font-bold text-gray-800 mb-2">❌ {problem}</p>
                <p className="text-gray-500 text-sm leading-relaxed">✅ {solution}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-sm mt-10">
            Recognize any of these? <Link href="/get-started" className="text-[#0C2C68] font-semibold hover:underline">Request a demo today.</Link>
          </p>
        </div>
      </section>

      {/* PRICING — Solo hidden; Business is waitlist only */}
      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#0C2C68]">Pricing That Scales With You</h2>
            <p className="text-gray-500 text-lg max-w-3xl mx-auto">Self-serve opens later. Join the waitlist. Want it set up for you now? Managed AI Front Desk: monthly with a 3-month minimum, then month-to-month. Or prepay the year and skip setup.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                name:"Business", price:"$79", desc:"For teams of 2 to 20 people", highlight:true,
                features:["1 virtual phone number","AI receptionist 24/7","Voicemail transcription","Call summaries & logs","Mobile app","Additional numbers available","Team softphone extensions","Follow-me calling","Lead capture with instant email alerts","Morning AI briefing","Priority support"],
                cta:"Join the waitlist", href:"/get-started",
              },
              {
                name:"Enterprise", price:"Custom", desc:"For organizations that need more", highlight:false,
                features:["Custom setups for larger teams. Talk to us."],
                cta:"Contact Us", href:"mailto:hello@unifyline.com",
              },
            ].map(({name, price, desc, features, highlight, cta, href}) => (
              <div key={name} className={`relative rounded-2xl p-8 border ${highlight ? "bg-[#0C2C68] border-[#0C2C68] shadow-2xl" : "bg-white border-gray-200 shadow-sm"}`}>
                {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-black px-4 py-1 rounded-full">MOST POPULAR</div>}
                <h3 className={`font-bold text-lg mb-1 ${highlight ? "text-white" : "text-[#0C2C68]"}`}>{name}</h3>
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-4xl font-black ${highlight ? "text-white" : "text-[#0C2C68]"}`}>{price}</span>
                  {price !== "Custom" && <span className={`text-sm mb-1 ${highlight ? "text-blue-300" : "text-gray-400"}`}>/month</span>}
                </div>
                <p className={`text-sm mb-6 ${highlight ? "text-blue-200" : "text-gray-500"}`}>{desc}</p>
                <ul className="space-y-2 mb-8">
                  {features.map(f => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${highlight ? "text-blue-100" : "text-gray-600"}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={highlight ? "text-blue-300" : "text-[#0C2C68]"}><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={href} className={`block text-center font-bold py-3 rounded-xl transition text-sm ${highlight ? "bg-white text-[#0C2C68] hover:bg-blue-50" : "border border-[#0C2C68] text-[#0C2C68] hover:bg-blue-50"}`}>{cta}</a>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-sm mt-8">Join the waitlist (self-serve opens later).</p>
          <div className="max-w-3xl mx-auto mt-8 bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Coming soon</p>
            <p className="text-gray-600 text-sm leading-relaxed">Appointment booking · WhatsApp and text follow-ups to callers · CRM integration · Yoruba, French and Spanish answering · UK and Nigerian numbers.</p>
          </div>
        </div>
      </section>

      {/* CTA — original design, updated content */}
      <section className="py-24 px-6 bg-[#0C2C68]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">The communications platform<br /><span className="text-blue-300">your business deserves.</span></h2>
          <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">Give your business an AI receptionist that answers 24/7 and sends you every lead.</p>
          <Link href="/get-started" className="inline-flex items-center gap-2 bg-white text-[#0C2C68] hover:bg-blue-50 font-bold text-lg px-10 py-4 rounded-xl transition">
            Request a Demo
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <p className="text-blue-400 text-sm mt-4 max-w-2xl mx-auto leading-relaxed">Personalized walkthrough · Set up for you · Live within 7 business days of a completed intake · Monthly: 3-month minimum, then month-to-month. Or prepay the year and skip setup.</p>
        </div>
      </section>

      {/* FOOTER — original unchanged */}
      <footer className="border-t border-gray-100 py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0C2C68] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">U</span>
            </div>
            <span className="font-bold text-[#0C2C68]">UnifyLine</span>
            <span className="text-gray-400 text-sm ml-2">by IntelSys Technologies</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-[#0C2C68] transition">Privacy</a>
            <a href="#" className="hover:text-[#0C2C68] transition">Terms</a>
            <a href="mailto:hello@unifyline.com" className="hover:text-[#0C2C68] transition">Contact</a>
          </div>
          <p className="text-gray-400 text-sm">© 2026 IntelSys Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
