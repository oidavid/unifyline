import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
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
          <a href="#verticals" className="hover:text-[#0C2C68] transition">Industries</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-gray-500 hover:text-[#0C2C68] transition font-medium">Sign In</Link>
          <Link href="/auth/login" className="bg-[#0C2C68] hover:bg-[#1A56C4] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">Start Free Trial</Link>
        </div>
      </nav>

      <section className="relative pt-32 pb-24 px-6 text-center bg-gradient-to-b from-blue-50/50 to-white overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-100/40 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 text-sm text-[#0C2C68] font-medium mb-8">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            AI Receptionist Live on Real Phone Numbers
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6 text-[#0C2C68]">
            Your Business.<br />
            <span className="bg-gradient-to-r from-[#1A56C4] to-[#0C2C68] bg-clip-text text-transparent">Always Answered.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed">
            UnifyLine gives any business from Atlanta to Lagos to London enterprise-grade AI communications at a fraction of what Fortune 500 companies pay.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/auth/login" className="w-full sm:w-auto bg-[#0C2C68] hover:bg-[#1A56C4] text-white font-bold text-lg px-8 py-4 rounded-xl transition flex items-center justify-center gap-2">
              Start Free Trial
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto border border-gray-200 hover:border-[#0C2C68] text-gray-600 hover:text-[#0C2C68] font-semibold text-lg px-8 py-4 rounded-xl transition text-center">See How It Works</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[{value:"24/7",label:"Always answering"},{value:"5+",label:"Languages supported"},{value:"100%",label:"Calls captured"},{value:"$29",label:"Starting price"}].map(({value,label})=>(
              <div key={label} className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                <p className="text-2xl font-black text-[#0C2C68]">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-gray-50 py-4 overflow-hidden">
        <div className="flex gap-12 whitespace-nowrap text-sm text-gray-400 justify-center flex-wrap px-4">
          {["Churches & Ministries","Insurance Agencies","Healthcare Practices","Real Estate Brokers","Diaspora Businesses","Law Firms","Consulting Firms","Educational Institutions"].map(v=>(
            <span key={v} className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0C2C68]" />{v}
            </span>
          ))}
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#0C2C68]">Why UnifyLine?</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Three things no other platform does.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {icon:"🌍",title:"One Number for Your Whole World",desc:"One number. One app. One bill. Calls, SMS, and WhatsApp routed intelligently across the US, Nigeria, UK, and Ghana. The AI speaks English, Yoruba, or French depending on who calls.",tag:"Global-First",bg:"bg-blue-50",border:"border-blue-100",tag_color:"text-blue-600"},
              {icon:"🌙",title:"AI Works the Night Shift",desc:"While you sleep, UnifyLine answers calls, books appointments, captures leads, and prepares your morning briefing. Wake up knowing exactly who called and what they needed.",tag:"AI-First",bg:"bg-purple-50",border:"border-purple-100",tag_color:"text-purple-600"},
              {icon:"💎",title:"Enterprise Comms. Human Pricing.",desc:"The same AI receptionist, analytics, and omnichannel inbox that Fortune 500 companies pay $500 per seat for, available to any business starting at $29 per month.",tag:"Value-First",bg:"bg-green-50",border:"border-green-100",tag_color:"text-green-600"},
            ].map(({icon,title,desc,tag,bg,border,tag_color})=>(
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

      <section id="how-it-works" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#0C2C68]">How It Works</h2>
            <p className="text-gray-500 text-lg">Live on your real phone number in minutes.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                {step:"01",title:"Sign up and get your number",desc:"Choose a real US phone number in any area code. Your AI receptionist is live immediately."},
                {step:"02",title:"Configure your AI",desc:"Tell the AI your business name, hours, services, and how to handle callers. Takes 5 minutes."},
                {step:"03",title:"Share your number",desc:"Put it on your website, business card, Google listing. Every call is answered professionally, 24/7."},
                {step:"04",title:"Wake up to insights",desc:"Every morning, get a briefing of who called, what they needed, and what requires your attention."},
              ].map(({step,title,desc})=>(
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
                  {from:"Caller",msg:"Hi, I need to speak with someone about your services.",align:"left"},
                  {from:"AI",msg:"Thank you for calling! Our team is currently unavailable. May I take a message and have someone call you back?",align:"right"},
                  {from:"Caller",msg:"Yes please, my name is John.",align:"left"},
                  {from:"AI",msg:"Thank you John. Is 678-923-5637 the best number to reach you?",align:"right"},
                ].map((m,i)=>(
                  <div key={i} className={`flex ${m.align==="right"?"justify-end":"justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.align==="right"?"bg-blue-500 text-white":"bg-white/10 text-blue-100"}`}>
                      <span className="font-semibold block mb-0.5 opacity-70">{m.from}</span>
                      {m.msg}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-3 text-sm">
                <p className="text-green-400 font-semibold text-xs">Message saved to dashboard</p>
                <p className="text-blue-300 text-xs mt-0.5">John — Service inquiry · Callback: 678-923-5637</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="verticals" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#0C2C68]">Built for Your Industry</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">UnifyLine comes pre-configured for the industries that need it most.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {icon:"⛪",name:"Churches & Ministries",desc:"Prayer lines, event notifications, pastoral scheduling"},
              {icon:"🏥",name:"Healthcare",desc:"Appointment booking, patient follow-up, after-hours triage"},
              {icon:"🏠",name:"Real Estate",desc:"Lead capture, showing scheduling, property inquiries"},
              {icon:"⚖️",name:"Legal",desc:"Client intake, appointment scheduling, case status"},
              {icon:"🌍",name:"Diaspora Business",desc:"Multi-language AI, international routing, global reach"},
              {icon:"📚",name:"Education",desc:"Parent communication, enrollment, event alerts"},
            ].map(({icon,name,desc})=>(
              <div key={name} className="bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-xl p-5 transition cursor-default shadow-sm">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold text-[#0C2C68] mb-1 text-sm">{name}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#0C2C68]">Simple Pricing</h2>
            <p className="text-gray-500 text-lg">No contracts. No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {name:"Starter",price:"$29",desc:"Perfect for solo entrepreneurs",features:["1 phone number","500 minutes/month","AI Receptionist","200 SMS","Call summaries","Email support"],highlight:false},
              {name:"Business",price:"$79",desc:"For growing teams of 2 to 20",features:["3 phone numbers","2,000 minutes/month","Full AI suite","Conference bridge","CRM webhooks","Priority support"],highlight:true},
              {name:"Ministry",price:"$79",desc:"Flat rate for faith organizations",features:["3 phone numbers","3,000 minutes/month","Prayer line AI","Broadcast SMS","Event tools","Up to 10 users"],highlight:false},
            ].map(({name,price,desc,features,highlight})=>(
              <div key={name} className={`relative rounded-2xl p-8 border ${highlight?"bg-[#0C2C68] border-[#0C2C68] shadow-2xl":"bg-white border-gray-200 shadow-sm"}`}>
                {highlight&&<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-black px-4 py-1 rounded-full">MOST POPULAR</div>}
                <h3 className={`font-bold text-lg mb-1 ${highlight?"text-white":"text-[#0C2C68]"}`}>{name}</h3>
                <div className="flex items-end gap-1 mb-1">
                  <span className={`text-4xl font-black ${highlight?"text-white":"text-[#0C2C68]"}`}>{price}</span>
                  <span className={`text-sm mb-1 ${highlight?"text-blue-300":"text-gray-400"}`}>/month</span>
                </div>
                <p className={`text-sm mb-6 ${highlight?"text-blue-200":"text-gray-500"}`}>{desc}</p>
                <ul className="space-y-2 mb-8">
                  {features.map(f=>(
                    <li key={f} className={`flex items-center gap-2 text-sm ${highlight?"text-blue-100":"text-gray-600"}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={highlight?"text-blue-300":"text-[#0C2C68]"}><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/login" className={`block text-center font-bold py-3 rounded-xl transition text-sm ${highlight?"bg-white text-[#0C2C68] hover:bg-blue-50":"border border-[#0C2C68] text-[#0C2C68] hover:bg-blue-50"}`}>Start Free Trial</Link>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-sm mt-8">Enterprise plans with custom pricing and white-label available. <a href="mailto:hello@unifyline.com" className="text-[#0C2C68] hover:underline font-medium">Contact us</a></p>
        </div>
      </section>

      <section className="py-24 px-6 bg-[#0C2C68]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white">Your AI receptionist is<br /><span className="text-blue-300">one click away.</span></h2>
          <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">Start your free trial today. No credit card required. Your number is live in under 5 minutes.</p>
          <Link href="/auth/login" className="inline-flex items-center gap-2 bg-white text-[#0C2C68] hover:bg-blue-50 font-bold text-lg px-10 py-4 rounded-xl transition">
            Get Started Free
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <p className="text-blue-400 text-sm mt-4">No credit card · Cancel anytime · Live in 5 minutes</p>
        </div>
      </section>

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
          <p className="text-gray-400 text-sm">2026 IntelSys Technologies. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
