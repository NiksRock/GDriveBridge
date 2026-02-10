import { useState } from 'react'
import Header from './components/Header'
import AccountCard from './components/AccountCard'
import ExplorerLayout from './Laylouts/ExplorerLayout'
import SourceExplorer from './components/SourceExplorer'
import TransferAction from './components/TransferAction'
import DestinationExplorer from './components/DestinationExplorer'
import ConnectionLayout from './Laylouts/ConnectionLayout'
import ActiveTransferPanel from './Laylouts/ActiveTransferPanel'

function App() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display selection:bg-primary/20">
      <Header />
      <main className="flex-1 p-6 max-w-[1600px] mx-auto w-full flex flex-col gap-6">
        <ConnectionLayout>
          <AccountCard />
          <div className="flex justify-center text-slate-300 dark:text-slate-600">
            <span className="material-symbols-outlined !text-3xl md:rotate-0 rotate-90">arrow_forward</span>
          </div>
          <AccountCard />
        </ConnectionLayout> 
        <ExplorerLayout>
          <SourceExplorer />
          <TransferAction />
          <DestinationExplorer />
        </ExplorerLayout>
      </main>
      <ActiveTransferPanel/>
    </div>
  )
}

export default App
