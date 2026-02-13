import React from 'react'

type Props = {}

function TransferAction({ }: Props) {
    return (
        <div className="flex flex-row lg:flex-col items-center justify-center gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm w-full lg:w-64">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Transfer Options</h4>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input className="peer h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:checked:bg-primary" type="checkbox" />
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Delete source files after successful transfer</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input checked className="peer h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-700 dark:checked:bg-primary" type="checkbox" />
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Preserve sharing permissions &amp; metadata</span>
                    </label>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button className="w-full bg-primary hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                        <span>Start Transfer</span>
                        <span className="material-symbols-outlined !text-[20px]">send</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TransferAction