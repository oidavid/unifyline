import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050A14] text-white overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 bg-[#050A14]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">U</span>
          </div>
          <span className="text-xl font-bold tracking-tight">UnifyLine</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
          <a href="#verticals" className="hover:text-white transition">Industries</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white transition">Sign In</Link>
          <Link href="/auth/login" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">Start Free Trial</Link>
        </div>
      </nav>

      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 rounded-full px-4 py-2 text-sm text-blue-400 mb-8">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            AI Receptionist Live on Real Phone Numbers
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6">
            Your Business.<br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">Always Answered.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            UnifyLine gives any business from Atlanta to Lagos to London enterprise-grade AI communications at a fraction of what Fortune 500 companies pay.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/auth/login" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg px-8 py-4 rounded-xl transition flex items-center justify-center gap-2">
              Start Free Trial
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto border border-white/10 hover:border-white/20 text-gray-300 font-semibold text-lg px-8 py-4 rounded-xl transition text-center">See How It Works</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[{value:"24/7",label:"Always answering"},{value:"<1s",label:"Response time"},{value:"5",label:"Languages supported"},{value:"$29",label:"Starting price"}].map(({value,label})=>(
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Why UnifyLine?</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Three things no other platform does.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {icon:"🌍",title:"One Number for Your Whole World",desc:"One number. One app. One bill. Calls, SMS, and WhatsApp routed intelligently across the US, Nigeria, UK, and Ghana. The AI speaks English, Yoruba, or French depending on who calls.",tag:"Global-First",color:"from-blue-600/20 to-blue-800/5",border:"border-blue-500/20"},
              {icon:"🌙",title:"AI Works the Night Shift",desc:"While you sleep, UnifyLine answers calls, books appointments, captures leads, and prepares your morning briefing. Wake up knowing exactly who called and what they needed.",tag:"AI-First",color:"from-purple-600/20 to-purple-800/5",border:"border-purple-500/20"},
              {icon:"💎",title:"Enterprise Comms. Human Pricing.",desc:"The same AI receptionist, analytics, and omnichannel inbox that Fortune 500 companies pay $500 per seat for, available to any business starting at $29 per month.",tag:"Value-First",color:"from-cyan-600/20 to-cyan-800/5",border:"border-cyan-500/20"},
            ].map(({icon,title,desc,tag,color,border})=>(
              <div key={title} className={`bg-gradient-to-br ${color} border ${border} rounded-2xl p-8`}>
                <div className="text-4xl mb-4">{icon}</div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 block">{tag}</span>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-6 bg-white/2">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">Live on your real phone number in minutes.</p>
          </div>
          <div className="space-y-8 max-w-2xl mx-auto">
            {[
              {step:"01",title:"Sign up and get your number",desc:"Choose a real US phone number in any area code. Your AI receptionist is live immediately."},
              {step:"02",title:"Configure your AI",desc:"Tell the AI your business name, hours, services, and how to handle callers. Takes 5 minutes."},
              {step:"03",title:"Share your number",desc:"Put it on your website, business card, Google listing. Every call is answered professionally, 24/7."},
              {step:"04",title:"Wake up to insights",desc:"Every morning, get a briefing of who called, what they needed, and what requires your attention."},
            ].map(({step,title,desc})=>(
              <div key={step} className="flex gap-5">
                <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 font-black text-sm flex-shrink-0">{step}</div>
                <div><h3 className="font-bold text-white mb-1">{title}</h3><p className="text-gray-400 text-sm leading-relaxed">{desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="verticals" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Built for Your Industry</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">UnifyLine comes pre-configured for the industries that need it most.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {icon:"⛪",name:"Churches and Ministries",desc:"Prayer lines, event notifications, pastoral scheduling"},
              {icon:"🏥",name:"Healthcare",desc:"Appointment booking, patient follow-up, after-hours triage"},
              {icon:"🏠",name:"Real Estate",desc:"Lead capture, showing scheduling, property inquiries"},
              {icon:"⚖️",name:"Legal",desc:"Client intake, appointment scheduling, case status"},
              {icon:"🌍",name:"Diaspora Business",desc:"Multi-language AI, international routing, global reach"},
              {icon:"📚",name:"Education",desc:"Parent communication, enrollment, event alerts"},
            ].map(({icon,name,desc})=>(
              <div key={name} className="bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 rounded-xl p-5 transition">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold text-white mb-1 text-sm">{name}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-6 bg-white/2">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Simple Pricing</h2>
            <p className="text-gray-400 text-lg">No contracts. No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {name:"Starter",price:"$29",desc:"Perfect for solo entrepreneurs",features:["1 phone number","500 minutes/month","AI Receptionist","200 SMS","Call summaries","Email support"],highlight:false},
              {name:"Business",price:"$79",desc:"For growing teams of 2 to 20",features:["3 phone numbers","2,000 minutes/month","Full AI suite","Conference bridge","CRM webhooks","Priority support"],highlight:true},
              {name:"Ministry",price:"$79",desc:"Flat rate for faith organizations",features:["3 phone numbers","3,000 minutes/month","Prayer line AI","Broadcast SMS","Event tools","Up to 10 users"],highlight:false},
            ].map(({name,price,desc,features,highlight})=>(
              <div key={name} className={`relative rounded-2xl p-8 border ${highlight?"bg-blue-600 border-blue-500":"bg-white/5 border-white/10"}`}>
                {highlight&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-blue-600 text-xs font-black px-4 py-1 rounded-full">MOST POPULAR</div>}
                <h3 className="font-bold text-lg mb-1">{name}</h3>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black">{price}</span>
                  <span className={`text-sm mb-1 ${highlight?"text-blue-200":"text-gray-500"}`}>/month</span>
                </div>
                <p className={`text-sm mb-6 ${highlight?"text-blue-200":"text-gray-500"}`}>{desc}</p>
                <ul className="space-y-2 mb-8">
                  {features.map(f=>(
                    <li key={f} className={`flex items-center gap-2 text-sm ${highlight?"text-blue-100":"text-gray-400"}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={highlight?"text-white":"text-blue-500"}><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/login" className={`block text-center font-bold py-3 rounded-xl transition text-sm ${highlight?"bg-white text-blue-600 hover:bg-blue-50":"border border-white/20 hover:border-white/40 text-white"}`}>Start Free Trial</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-600/30 to-blue-900/20 border border-blue-500/20 rounded-3xl p-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4">Your AI receptionist is<br /><span className="text-blue-400">one click away.</span></h2>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">Start your free trial today. No credit card required. Your number is live in under 5 minutes.</p>
            <Link href="/auth/login" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg px-10 py-4 rounded-xl transition">
              Get Started Free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <p className="text-gray-600 text-sm mt-4">No credit card · Cancel anytime · Live in 5 minutes</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">U</span>
            </div>
            <span className="font-bold text-white">UnifyLine</span>
            <span className="text-gray-600 text-sm ml-2">by IntelSys Technologies</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <a href="#" className="hover:text-gray-400 transition">Privacy</a>
            <a href="#" className="hover:text-gray-400 transition">Terms</a>
            <a href="mailto:hello@unifyline.com" className="hover:text-gray-400 transition">Contact</a>
          </div>
          <p className="text-gray-700 text-sm">2026 IntelSys Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
