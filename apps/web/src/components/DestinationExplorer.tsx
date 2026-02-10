import React from 'react'

type Props = {}

function DestinationExplorer({}: Props) {
  return (
     <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary !text-[20px]">drive_folder_upload</span>
                            Destination Path
                        </h3>
                    </div>
                    {/** Breadcrumbs **/}
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto whitespace-nowrap pb-1">
                        <span className="hover:text-primary cursor-pointer">My Drive</span>
                        <span className="material-symbols-outlined !text-[14px]">chevron_right</span>
                        <span className="hover:text-primary cursor-pointer">Work</span>
                        <span className="material-symbols-outlined !text-[14px]">chevron_right</span>
                        <span className="font-semibold text-slate-900 dark:text-white">Q3 Imports</span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {/** Tree View **/}
                    <div className="flex flex-col gap-1">
                        {/** Parent Folder **/}
                        <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-slate-600 dark:text-slate-400">
                            <span className="material-symbols-outlined !text-[20px] cursor-pointer hover:text-slate-900 dark:hover:text-white">arrow_drop_down</span>
                            <span className="material-symbols-outlined text-amber-400 !text-[20px]">folder</span>
                            <span className="text-sm">Shared With Me</span>
                        </div>
                        {/** Active Parent **/}
                        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/30 cursor-pointer text-slate-900 dark:text-white font-medium">
                            <span className="material-symbols-outlined !text-[20px] transform rotate-90 text-primary">arrow_drop_down</span>
                            <span className="material-symbols-outlined text-primary !text-[20px]">folder_open</span>
                            <span className="text-sm">My Drive</span>
                        </div>
                        {/** Nested Children **/}
                        <div className="pl-6 border-l border-slate-200 dark:border-slate-700 ml-3 flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-slate-600 dark:text-slate-400">
                                <span className="material-symbols-outlined !text-[20px] opacity-0">arrow_right</span>
                                <span className="material-symbols-outlined text-slate-400 !text-[20px]">folder</span>
                                <span className="text-sm">Personal</span>
                            </div>
                            {/** Sub-Folder Open **/}
                            <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-slate-900 dark:text-white">
                                <span className="material-symbols-outlined !text-[20px] transform rotate-90 text-slate-400">arrow_drop_down</span>
                                <span className="material-symbols-outlined text-amber-400 !text-[20px]">folder</span>
                                <span className="text-sm">Work</span>
                            </div>
                            {/** Deeply Nested **/}
                            <div className="pl-6 border-l border-slate-200 dark:border-slate-700 ml-3 flex flex-col gap-1">
                                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-primary/10 text-primary cursor-pointer border border-primary/20">
                                    <span className="material-symbols-outlined !text-[20px] opacity-0">arrow_right</span>
                                    <span className="material-symbols-outlined text-primary !text-[20px]">folder_open</span>
                                    <span className="text-sm font-semibold">Q3 Imports</span>
                                </div>
                                <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer text-slate-600 dark:text-slate-400">
                                    <span className="material-symbols-outlined !text-[20px] opacity-0">arrow_right</span>
                                    <span className="material-symbols-outlined text-slate-400 !text-[20px]">folder</span>
                                    <span className="text-sm">Old Backups</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/**reate Folder Action **/}
                <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <button className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-lg transition-all">
                        <span className="material-symbols-outlined !text-[18px]">create_new_folder</span>
                        Create New Folder
                    </button>
                </div>
            </div>
  )
}

export default DestinationExplorer