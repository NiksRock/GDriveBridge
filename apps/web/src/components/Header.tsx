import React from 'react'

type Props = {}

function Header({ }: Props) {
    return (
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <div className="size-8 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined !text-3xl">cloud_sync</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">GDriveBridge</h1>
            </div>
            <div className="flex items-center gap-4">
                {/**System Status Badge **/}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-100 dark:border-green-800">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">System Operational</span>
                </div>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                {/**Dark Mode Toggle (Mock) **/}
                <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined !text-[20px]">dark_mode</span>
                </button>
                {/**User Profile **/}
                <button className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                    <span className="text-sm font-medium hidden sm:block">Admin User</span>
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined !text-[20px]">person</span>
                    </div>
                </button>
            </div>
        </header>
    )
}

export default Header