import React from 'react'

type Props = {}

function ActiveTransferPanel({ }: Props) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 transform translate-y-0 transition-transform">
            <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 md:gap-8 md:items-center">
                {/** Info Side **/}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary animate-spin">
                                <span className="material-symbols-outlined text-[20px]">sync</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Transferring Files...</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">Current: Q3_Budget_Final.xlsx</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-bold text-primary tabular-nums">34%</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">34/120 files</p>
                        </div>
                    </div>
                    {/** Progress Bar **/}
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-2 rounded-full w-[34%] transition-all duration-500 relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                </div>
                {/** Controls Side **/}
                <div className="flex items-center justify-end gap-3 shrink-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
                    <div className="flex flex-col items-end mr-4 hidden lg:flex">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Est. Time</span>
                        <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">~12m 30s</span>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">
                        <span className="material-symbols-outlined text-[18px]">pause</span>
                        Pause
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium transition-colors">
                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                        Cancel
                    </button>
                    <button className="ml-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                        <span className="material-symbols-outlined">expand_more</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ActiveTransferPanel