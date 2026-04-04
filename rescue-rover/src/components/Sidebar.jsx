import React from 'react'

const navItems = [
  { id: 'dashboard', icon: '⬡', label: 'DASHBOARD' },
  { id: 'control',   icon: '🕹', label: 'CONTROL'   },
  { id: 'map',       icon: '◎', label: 'LIVE MAP'   },
  { id: 'camera',    icon: '▣', label: 'CAMERA'     },
  { id: 'analytics', icon: '▲', label: 'ANALYTICS'  },
  { id: 'logs',      icon: '≡', label: 'DATA LOGS'  },
]

export default function Sidebar({ active, setActive }) {
  return (
    <aside className="w-16 md:w-48 bg-army-panel border-r border-army-border flex flex-col py-4 flex-shrink-0">
      <nav className="flex flex-col gap-1 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`flex items-center gap-3 px-2 py-3 rounded text-left transition-all duration-200 group
              ${active === item.id
                ? 'bg-army-accent/10 border border-army-accent/30 text-army-accent'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
              }`}
          >
            <span className="text-lg w-6 text-center flex-shrink-0">{item.icon}</span>
            <span className="hidden md:block text-xs font-bold tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto px-2">
        <div className="hidden md:block p-2 rounded bg-army-accent/5 border border-army-accent/20">
          <div className="text-xs text-gray-500 font-mono">ROVER STATUS</div>
          <div className="text-xs text-army-accent font-mono mt-1">● CONNECTED</div>
          <div className="text-xs text-gray-500 font-mono mt-1">BATT: 87%</div>
          <div className="text-xs text-gray-500 font-mono">SIG: STRONG</div>
        </div>
      </div>
    </aside>
  )
}
