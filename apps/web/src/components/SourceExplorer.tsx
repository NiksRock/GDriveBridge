import React from 'react'
import Accordion from './Accordion'

type Props = {}

function SourceExplorer({ }: Props) {
    return (
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary !text-[20px]">folder_open</span>
                        Source Drive
                    </h3>
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">24 Items</span>
                </div>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 !text-[18px]">search</span>
                    <input className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow" placeholder="Search folders..." type="text" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <div className="space-y-1">
                    {/** Header Row **/}
                    <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50 mb-1">
                        <div className="w-5"></div>
                        <div>Name</div>
                        <div>Size</div>
                    </div>
                    {/** Item Row: Selected **/}
                    {/* <Accordion 
          accordionSummary={<></>} accordionDetails={<></>}/>
          <TransferAction /> */}
                    <Accordion
                        accordionSummary={<div className="group flex w-full items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-primary/20 border border-blue-100 dark:border-primary/30 cursor-pointer">
                            <div className="flex items-center justify-center w-5">
                                <span className="material-symbols-outlined text-primary !text-[20px]">check_box</span>
                            </div>
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                <span className="material-symbols-outlined text-amber-400 !text-[20px]">folder</span>
                                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">Marketing Assets 2024</span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">1.2 GB</span>
                        </div>}
                        accordionDetails={<></>}
                    />
                    <Accordion
                        accordionSummary={<div className="group flex w-full
                             items-center gap-3 p-2 
                        rounded-lg cursor-pointer">
                            <div className="flex items-center justify-center w-5">
                                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-slate-400 !text-[20px]">check_box_outline_blank</span>
                            </div>
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                                <span className="material-symbols-outlined text-slate-400 !text-[20px]">folder</span>
                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">Q3 Financial Reports</span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">45 MB</span>
                        </div>}
                        accordionDetails={<></>}
                    />
                    {/** Item Row 
                    <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border border-transparent">
                        <div className="flex items-center justify-center w-5">
                            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-slate-400 !text-[20px]">check_box_outline_blank</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-slate-400 !text-[20px]">folder</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">Q3 Financial Reports</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">45 MB</span>
                    </div>
                    {/** Item Row 
                    <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border border-transparent">
                        <div className="flex items-center justify-center w-5">
                            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 group-hover:text-slate-400 !text-[20px]">check_box_outline_blank</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-slate-400 !text-[20px]">folder</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">Design Mockups</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">890 MB</span>
                    </div>
                    {/** Item Row: Selected 
                    <div className="group flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-primary/20 border border-blue-100 dark:border-primary/30 cursor-pointer">
                        <div className="flex items-center justify-center w-5">
                            <span className="material-symbols-outlined text-primary !text-[20px]">check_box</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-amber-400 !text-[20px]">folder</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">Client Projects - Archived</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">3.4 GB</span>
                    </div>
                    {/** More mock items 
                    <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border border-transparent opacity-60">
                        <div className="flex items-center justify-center w-5">
                            <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 !text-[20px]">check_box_outline_blank</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="material-symbols-outlined text-slate-400 !text-[20px]">folder</span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">Personal Photos</span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">12 GB</span>
                    </div> **/}
                </div>
            </div>
        </div>
    )
}

export default SourceExplorer