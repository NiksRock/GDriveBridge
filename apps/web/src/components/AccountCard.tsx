import React from 'react'

type Props = {
    name: string,
    profileImgURL: string,
    account: string
    email: string
    storageDetail:string
}

function AccountCard({ name = "John Doe Avatar",
    account, 
    email,
    storageDetail="Unlimited Storage",
    profileImgURL = "https://lh3.googleusercontent.com/aida-public/AB6AXuBTGjy5o4lf7MOKu-Og0UJAlg4RZkQ4lIX1e3W4iVzPriAe_HVJVDmDZa4cFcHQSwv8W6h2fsPXiC26gPgODf6eUjGW-wg73d4OeWqR1vL2w36L1N2VTyHCGVwRl8TjTr4UFajt-31HwW26RxZfZUoa9vhqZc4yQaplZ3Qy3MWbjV_t5ilsWXZJBzqGMksbtMBr9RJ8CwzNBI5Qii8Eqh6aDnStFX93KVYXzMKnyQ5utd_AEEzsFmjumK7WPI8Eb7L4aiIsadIavqeK" }: Props) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 dark:border-slate-600">
                        <img alt={name} className="w-full h-full object-cover" data-alt={name} src={profileImgURL} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5">
                        <span className="material-symbols-outlined text-green-500 !text-[18px]">check_circle</span>
                    </div>
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{account}</p>
                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{email}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{storageDetail}</p>
                </div>
            </div>
            <button className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Change
            </button>
        </div>
    )
}

export default AccountCard