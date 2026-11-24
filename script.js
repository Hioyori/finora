
/* FINORA — PERSONAL FINANCE DASHBOARD */

document.addEventListener('DOMContentLoaded', () => {
'use strict';

const $ = id => document.getElementById(id);
const q = s => [...document.querySelectorAll(s)];
const val = id => $(id).value;
const set = (id,v) => $(id).value = v;
const txt = (id,v) => $(id).textContent = v;
const html = (id,v) => $(id).innerHTML = v;
const on = (id,e,f) => $(id).addEventListener(e,f);
const click = (id,f) => on(id,'click',f);

const esc = v => String(v ?? '').replace(
    /[&<>"']/g,
    c => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
    })[c]
);

const icons = () => window.lucide?.createIcons();
const icon = n => `<i data-lucide="${n}"></i>`;

/* LOCAL STORAGE */

const key = 'finora-v1';

const fresh = () => ({
    transactions: [],
    budgets: [],
    goals: [],
    recurring: [],
    theme: 'dark',
    currency: 'INR'
});

let s = fresh();

try {
    s = {
        ...s,
        ...JSON.parse(localStorage.getItem(key) || '{}')
    };
} catch(e) {
    console.warn(e);
}

const date = d =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const today = () => date(new Date());
const month = () => today().slice(0,7);

const fmt = d => d
    ? new Date(d+'T00:00:00').toLocaleDateString('en-GB',{
        day:'numeric',
        month:'short',
        year:'numeric'
    })
    : 'No deadline';

const money = n => new Intl.NumberFormat(
    s.currency === 'INR' ? 'en-IN' : 'en-US',
    {
        style:'currency',
        currency:s.currency
    }
).format(n || 0);

const uid = () => globalThis.crypto?.randomUUID?.()
    || Date.now().toString(36)
    + Math.random().toString(36).slice(2);

const sum = (a,k='amount') =>
    a.reduce((n,x) => n + Number(x[k]),0);

const monthly = m =>
    s.transactions.filter(x => x.date.startsWith(m));

const byType = (a,t) =>
    a.filter(x => x.type === t);

const sorted = a =>
    [...a].sort((a,b) => b.date.localeCompare(a.date));

const expense = [...$('budgetCategory').options]
    .map(o => [o.value,o.textContent.trim()]);

const income = [
    'Salary','Freelance','Business',
    'Investment','Gift','Other'
].map(x => [x,x]);

const options = a => a.map(([v,l]) =>
    `<option value="${esc(v)}">${esc(l)}</option>`
).join('');

const category = c =>
    [...expense,...income].find(x => x[0] === c)?.[1] || c;

const colors = [
    '#c9f477','#bdb1f5','#f3a398',
    '#edc47d','#77c9b5','#80a8f5',
    '#d99ed8','#9aae91','#87958c'
];

const breakdown = a => Object.entries(
    byType(a,'expense').reduce((o,x) => {
        o[x.category] = (o[x.category] || 0) + x.amount;
        return o;
    },Object.create(null))
).sort((a,b) => b[1]-a[1]);

/* NOTIFICATIONS */

function toast(m,error=false) {
    const el = document.createElement('div');

    el.className = 'toast' + (error ? ' error' : '');
    el.textContent = m;

    $('toastContainer').append(el);

    setTimeout(() => el.remove(),3500);
}

function save(m) {
    try {
        localStorage.setItem(key,JSON.stringify(s));

        if(m) toast(m);
    } catch(e) {
        toast('Unable to save locally. Export a backup.',true);
    }

    render();
}

/* MODALS */

const open = id => $(id).showModal();
const close = id => $(id).close();

q('[data-close]').forEach(b => {
    b.onclick = () => close(b.dataset.close);
});

let confirmFn;

function confirm(title,message,fn) {
    txt('confirmTitle',title);
    txt('confirmMessage',message);

    confirmFn = fn;

    open('confirmModal');
}

click('confirmAction',() => {
    close('confirmModal');

    const f = confirmFn;
    confirmFn = null;

    f?.();
});

/* NAVIGATION */

let page = 'overview';
let cal = new Date();
let selected = today();

const titles = {
    overview: [
        'Financial overview.',
        'Master your money. Own your future.'
    ],
    transactions: [
        'Transactions.',
        'Track every rupee.'
    ],
    budgets: [
        'Your budgets.',
        'Spend intentionally.'
    ],
    savings: [
        'Savings goals.',
        'Build your future.'
    ],
    analytics: [
        'Financial analytics.',
        'Understand your money better.'
    ],
    calendar: [
        'Financial calendar.',
        'Plan your finances.'
    ],
    recurring: [
        'Recurring bills.',
        'Stay ahead of payments.'
    ],
    settings: [
        'Your settings.',
        'Make Finora work for you.'
    ]
};

function sidebar(v) {
    $('sidebar').classList.toggle('open',v);
    $('sidebarOverlay').hidden = !v;

    $('menuToggle').setAttribute(
        'aria-expanded',String(v)
    );
}

function navigate(p) {
    if(!titles[p]) return;

    page = p;

    q('.page').forEach(e => {
        e.hidden = e.id !== p;
        e.classList.toggle('active',e.id === p);
    });

    q('.nav-link').forEach(e => {
        e.classList.toggle('active',e.dataset.page === p);
    });

    txt('pageTitle',titles[p][0]);
    txt('pageSubtitle',titles[p][1]);

    sidebar(false);

    window.scrollTo(0,0);

    render();
}

q('[data-page]').forEach(b => {
    b.onclick = () => navigate(b.dataset.page);
});

document.querySelector('.brand').onclick = e => {
    e.preventDefault();
    navigate('overview');
};

click('menuToggle',() => {
    sidebar(!$('sidebar').classList.contains('open'));
});

click('sidebarOverlay',() => sidebar(false));

/* THEME AND CURRENCY */

function theme() {
    document.documentElement.dataset.theme = s.theme;

    set('themeSetting',s.theme);
    set('currencySetting',s.currency);

    html(
        'themeToggle',
        icon(s.theme === 'dark' ? 'sun' : 'moon')
    );

    icons();
}

click('themeToggle',() => {
    s.theme = s.theme === 'dark' ? 'light' : 'dark';

    theme();
    save();
});

on('themeSetting','change',() => {
    s.theme = val('themeSetting');

    theme();
    save();
});

on('currencySetting','change',() => {
    s.currency = val('currencySetting');

    save('Display currency updated (no conversion).');
});

/* FORM MANAGEMENT */

const configs = {
    transaction: [
        'transactions','Transaction',
        'name','amount','type','category','date','note'
    ],
    budget: [
        'budgets','Budget','category','amount'
    ],
    goal: [
        'goals','Goal','name','target','saved','deadline'
    ],
    recurring: [
        'recurring','Recurring',
        'name','amount','frequency','date'
    ]
};

const field = (t,k) =>
    t + k[0].toUpperCase() + k.slice(1);

function categories(c) {
    html(
        'transactionCategory',
        options(
            val('transactionType') === 'income'
                ? income : expense
        )
    );

    if(c) set('transactionCategory',c);
}

on('transactionType','change',() => categories());

function edit(t,id,day) {
    const [collection,,...fields] = configs[t];

    const x = s[collection].find(x => x.id === id);

    $(t+'Form').reset();

    set(t+'Id',x?.id || '');

    for(const k of fields) {
        if(k === 'category' && t === 'transaction') {
            categories(x?.category);
            continue;
        }

        if(x) {
            set(field(t,k),x[k]);
        } else if(k === 'date') {
            set(field(t,k),day || today());
        } else if(k === 'saved') {
            set(field(t,k),0);
        }
    }

    txt(
        t+'ModalTitle',
        (x ? 'Edit ' : 'Add ') +
        ({
            goal:'savings goal',
            recurring:'recurring bill'
        }[t] || t)
    );

    open(t+'Modal');
}

for(const [t,[collection,,...fields]]
    of Object.entries(configs)) {

    on(t+'Form','submit',e => {
        e.preventDefault();

        const x = {
            id:val(t+'Id') || uid()
        };

        for(const k of fields) {
            x[k] = ['amount','target','saved'].includes(k)
                ? Number(val(field(t,k)))
                : val(field(t,k)).trim();
        }

        if(
            ('name' in x && !x.name) ||
            ('amount' in x &&
                !(x.amount > 0 && Number.isFinite(x.amount))) ||
            ('target' in x &&
                !(x.target > 0 &&
                  Number.isFinite(x.target) &&
                  x.saved >= 0 &&
                  Number.isFinite(x.saved)))
        ) {
            return toast('Enter valid details.',true);
        }

        if(t === 'budget' && s.budgets.some(
            b => b.category === x.category && b.id !== x.id
        )) {
            return toast('Budget already exists.',true);
        }

        s[collection] = s[collection].filter(
            a => a.id !== x.id
        );

        s[collection].push(x);

        close(t+'Modal');

        save('Record saved.');
    });
}

click('addTransactionBtn',() => edit('transaction'));

click('calendarAddBtn',() =>
    edit('transaction',null,selected)
);

click('addBudgetBtn',() => edit('budget'));
click('addGoalBtn',() => edit('goal'));
click('addRecurringBtn',() => edit('recurring'));

/* ACTION BUTTONS */

const actions = (t,x) => `
    <div class="card-actions">
        <button class="action-button"
            data-act="edit"
            data-kind="${t}"
            data-id="${esc(x.id)}"
            aria-label="Edit">
            ${icon('pencil')}
        </button>

        <button class="action-button delete"
            data-act="delete"
            data-kind="${t}"
            data-id="${esc(x.id)}"
            aria-label="Delete">
            ${icon('trash-2')}
        </button>
    </div>
`;

const btn = (act,x,label) => `
    <button class="secondary-button"
        data-act="${act}"
        data-id="${esc(x.id)}">
        ${esc(label)}
    </button>
`;

/* TRANSACTIONS */

function row(x,full) {
    return `
        <tr>
            <td>
                <div class="transaction-info">
                    <span class="transaction-icon">
                        ${icon(
                            x.type === 'income'
                                ? 'arrow-down-left'
                                : 'arrow-up-right'
                        )}
                    </span>

                    <div>
                        ${esc(x.name)}
                        <small class="transaction-note">
                            ${esc(x.note)}
                        </small>
                    </div>
                </div>
            </td>

            <td>${esc(category(x.category))}</td>
            <td>${fmt(x.date)}</td>

            ${full ? `
                <td>
                    <span class="type-badge ${x.type}">
                        ${x.type}
                    </span>
                </td>
            ` : ''}

            <td class="amount-${x.type}">
                ${x.type === 'income' ? '+' : '−'}
                ${money(x.amount)}
            </td>

            <td>${actions('transaction',x)}</td>
        </tr>
    `;
}

function filtered() {
    return sorted(s.transactions.filter(x =>
        (
            val('transactionTypeFilter') === 'all' ||
            x.type === val('transactionTypeFilter')
        ) &&
        (
            val('transactionCategoryFilter') === 'all' ||
            x.category === val('transactionCategoryFilter')
        ) &&
        (
            !val('transactionMonthFilter') ||
            x.date.startsWith(val('transactionMonthFilter'))
        ) &&
        `${x.name} ${x.category} ${x.note}`
            .toLowerCase()
            .includes(val('transactionSearch').toLowerCase())
    ));
}

function transactions() {
    const a = filtered();

    html(
        'transactionList',
        a.map(x => row(x,true)).join('')
    );

    $('transactionsEmpty').hidden = !!a.length;

    icons();
}

for(const id of [
    'transactionSearch',
    'transactionTypeFilter',
    'transactionCategoryFilter',
    'transactionMonthFilter'
]) {
    on(id,'input',transactions);
}

click('clearFiltersBtn',() => {
    set('transactionSearch','');
    set('transactionTypeFilter','all');
    set('transactionCategoryFilter','all');
    set('transactionMonthFilter','');

    transactions();
});

/* PROGRESS BARS */

const progress = (p,c='') => `
    <div class="progress-track">
        <div class="progress-fill ${c}"
            style="width:${Math.min(100,Math.max(0,p))}%">
        </div>
    </div>
`;

/* DASHBOARD OVERVIEW */

function overview() {
    const a = monthly(val('overviewMonth') || month());

    const i = sum(byType(a,'income'));
    const e = sum(byType(a,'expense'));

    txt(
        'totalBalance',
        money(
            sum(byType(s.transactions,'income')) -
            sum(byType(s.transactions,'expense'))
        )
    );

    txt('totalIncome',money(i));
    txt('totalExpenses',money(e));

    txt(
        'savingsRate',
        `${i ? Math.round((i-e)/i*100) : 0}%`
    );

    html(
        'recentTransactionList',
        sorted(a).slice(0,5)
            .map(x => row(x,false)).join('')
    );

    $('recentEmpty').hidden = !!a.length;

    const b = breakdown(a);

    html('financialInsights',`
        <div class="insight-card">
            ${icon('sparkles')}

            <div>
                <h3>
                    ${a.length
                        ? 'Monthly cash flow'
                        : 'Start tracking'}
                </h3>

                <p>
                    ${a.length
                        ? `Net cash flow: ${money(i-e)}.
                            ${b.length
                                ? 'Largest expense: ' +
                                  esc(category(b[0][0])) + '.'
                                : ''}`
                        : 'Add transactions to unlock spending insights.'}
                </p>
            </div>
        </div>
    `);
}

/* BUDGET MANAGEMENT */

function budgets() {
    let used = 0;

    const a = byType(monthly(month()),'expense');

    html('budgetList',s.budgets.map(x => {
        const n = sum(
            a.filter(t => t.category === x.category)
        );

        const p = Math.round(n/x.amount*100);

        used += n;

        return `
            <article class="panel budget-card">

                <div class="budget-card-header">
                    <h3>${esc(category(x.category))}</h3>
                    ${actions('budget',x)}
                </div>

                <h2>${money(n)}</h2>

                <p>of ${money(x.amount)}</p>

                ${progress(
                    p,
                    p >= 100
                        ? 'budget-progress-fill danger'
                        : p >= 80
                            ? 'budget-progress-fill warning'
                            : ''
                )}

                <div class="progress-info">
                    <span>${p}% used</span>

                    <span>
                        ${money(Math.abs(x.amount-n))}
                        ${n > x.amount
                            ? 'over budget'
                            : 'remaining'}
                    </span>
                </div>
            </article>
        `;
    }).join(''));

    txt('totalBudget',money(sum(s.budgets)));
    txt('budgetSpent',money(used));
    txt('budgetRemaining',money(sum(s.budgets)-used));

    $('budgetsEmpty').hidden = !!s.budgets.length;
}

/* SAVINGS GOALS */

function goals() {
    txt('totalGoalSavings',money(sum(s.goals,'saved')));

    txt(
        'goalSummaryText',
        `${s.goals.filter(x => x.saved >= x.target).length}
        of ${s.goals.length} goals achieved`
    );

    $('goalsEmpty').hidden = !!s.goals.length;

    html('goalList',s.goals.map(x => {
        const p = Math.round(x.saved/x.target*100);

        return `
            <article class="panel goal-card">

                <div class="goal-card-header">
                    <h3>${esc(x.name)}</h3>
                    ${actions('goal',x)}
                </div>

                <h2>${money(x.saved)}</h2>

                <p>Target: ${money(x.target)}</p>

                ${progress(p)}

                <div class="progress-info">
                    ${p}% achieved
                </div>

                <p class="goal-deadline">
                    ${fmt(x.deadline)}
                </p>

                ${btn('contribute',x,'Add savings')}
            </article>
        `;
    }).join(''));
}

/* SAVINGS SIMULATOR */

function simulator() {
    const t = +val('simTarget');
    const a = +val('simSaved');
    const m = +val('simMonthly');

    const valid = t > 0 && a >= 0 && m > 0;

    const p = valid
        ? Math.min(100,Math.round(a/t*100))
        : 0;

    txt(
        'simMonths',
        valid
            ? `${Math.ceil(Math.max(0,t-a)/m)} months`
            : '—'
    );

    txt(
        'simPercentage',
        valid
            ? `${p}% of your goal achieved`
            : 'Enter valid amounts'
    );

    txt(
        'simRemaining',
        valid
            ? `${money(Math.max(0,t-a))} remaining`
            : ''
    );

    $('simProgress').style.width = p+'%';
}

for(const id of [
    'simTarget','simSaved','simMonthly'
]) {
    on(id,'input',simulator);
}

/* ANALYTICS */

function analytics() {
    const m = val('analyticsMonth') || month();
    const a = monthly(m);
    const b = breakdown(a);

    const e = sum(byType(a,'expense'));

    const days = m === month()
        ? new Date().getDate()
        : new Date(
            +m.slice(0,4),
            +m.slice(5),
            0
        ).getDate();

    txt('averageSpending',money(e/days));

    txt(
        'topCategory',
        b.length ? category(b[0][0]) : '—'
    );

    txt('transactionCount',a.length);

    html(
        'categoryBreakdown',
        b.map(([c,n]) => `
            <div class="category-row">

                <div class="category-row-header">
                    <span>${esc(category(c))}</span>
                    <strong>${money(n)}</strong>
                </div>

                ${progress(n/e*100)}
            </div>
        `).join('') || '<p>No expenses recorded.</p>'
    );
}

/* FINANCIAL CALENDAR */

function calendar() {
    const y = cal.getFullYear();
    const m = cal.getMonth();

    const offset =
        (new Date(y,m,1).getDay()+6)%7;

    txt(
        'calendarMonthTitle',
        cal.toLocaleDateString('en',{
            month:'long',
            year:'numeric'
        })
    );

    html(
        'calendarGrid',
        Array.from({length:42},(_,i) => {
            const d = new Date(y,m,i-offset+1);
            const k = date(d);

            const a = s.transactions.filter(
                x => x.date === k
            );

            return `
                <button class="calendar-cell
                    ${d.getMonth() !== m ? 'other-month' : ''}
                    ${k === today() ? 'today' : ''}
                    ${k === selected ? 'selected' : ''}"
                    data-day="${k}">

                    <span class="day-number">
                        ${d.getDate()}
                    </span>

                    <span class="day-dots">

                        ${a.some(x => x.type === 'income')
                            ? '<span class="income-dot"></span>'
                            : ''}

                        ${a.some(x => x.type === 'expense')
                            ? '<span class="expense-dot"></span>'
                            : ''}

                    </span>
                </button>
            `;
        }).join('')
    );

    txt('selectedDateTitle',fmt(selected));

    html(
        'calendarTransactions',
        s.transactions
            .filter(x => x.date === selected)
            .map(x => `
                <div class="calendar-transaction">

                    <span>${esc(x.name)}</span>

                    <strong class="amount-${x.type}">
                        ${money(x.amount)}
                    </strong>

                </div>
            `).join('') ||
            '<p>No transactions on this date.</p>'
    );
}

for(const [id,n] of [
    ['prevMonth',-1],
    ['nextMonth',1]
]) {
    click(id,() => {
        cal = new Date(
            cal.getFullYear(),
            cal.getMonth()+n,
            1
        );

        selected = date(cal);

        calendar();
    });
}

click('calendarToday',() => {
    cal = new Date();
    selected = today();

    calendar();
});

on('calendarGrid','click',e => {
    const b = e.target.closest('[data-day]');

    if(b) {
        selected = b.dataset.day;

        cal = new Date(selected+'T00:00:00');

        calendar();
    }
});

/* RECURRING BILLS */

function recurring() {
    txt(
        'recurringTotal',
        money(s.recurring.reduce((n,x) =>
            n + x.amount * (
                x.frequency === 'weekly'
                    ? 52/12
                    : x.frequency === 'yearly'
                        ? 1/12
                        : 1
            ),0
        ))
    );

    $('recurringEmpty').hidden = !!s.recurring.length;

    html(
        'recurringList',
        [...s.recurring]
            .sort((a,b) => a.date.localeCompare(b.date))
            .map(x => `
                <article class="panel recurring-card">

                    <div class="recurring-card-header">
                        <h3>${esc(x.name)}</h3>
                        ${actions('recurring',x)}
                    </div>

                    <h2>${money(x.amount)}</h2>

                    <span class="frequency-badge">
                        ${esc(x.frequency)}
                    </span>

                    <p class="next-payment">
                        Next payment: ${fmt(x.date)}
                        ${x.date < today() ? '(Overdue)' : ''}
                    </p>

                    ${btn('pay',x,'Mark as paid')}

                </article>
            `).join('')
    );
}

/* EDIT, DELETE AND PAYMENT ACTIONS */

document.addEventListener('click',e => {
    const b = e.target.closest('[data-act]');

    if(!b) return;

    const {act,kind,id} = b.dataset;

    if(act === 'edit') {
        edit(kind,id);
    }

    if(act === 'delete') {
        confirm(
            'Delete record?',
            'This cannot be undone.',
            () => {
                const k = configs[kind][0];

                s[k] = s[k].filter(x => x.id !== id);

                save('Record deleted.');
            }
        );
    }

    if(act === 'contribute') {
        $('contributionForm').reset();

        set('contributionGoalId',id);

        open('contributionModal');
    }

    if(act === 'pay') {
        const x = s.recurring.find(x => x.id === id);

        if(!x) return;

        confirm(
            'Record payment?',
            `Record ${money(x.amount)} as an expense?`,
            () => {
                s.transactions.push({
                    id:uid(),
                    name:x.name,
                    amount:x.amount,
                    type:'expense',
                    category:'Bills',
                    date:today(),
                    note:'Recurring payment'
                });

                const d = new Date(x.date+'T00:00:00');

                if(x.frequency === 'weekly') {
                    d.setDate(d.getDate()+7);
                } else {
                    const day = d.getDate();

                    d.setDate(1);

                    d.setMonth(
                        d.getMonth() +
                        (x.frequency === 'yearly' ? 12 : 1)
                    );

                    d.setDate(
                        Math.min(
                            day,
                            new Date(
                                d.getFullYear(),
                                d.getMonth()+1,
                                0
                            ).getDate()
                        )
                    );
                }

                x.date = date(d);

                save('Payment recorded.');
            }
        );
    }
});

on('contributionForm','submit',e => {
    e.preventDefault();

    const x = s.goals.find(
        x => x.id === val('contributionGoalId')
    );

    const n = +val('contributionAmount');

    if(!x || !Number.isFinite(n) || n <= 0) {
        return toast('Enter a valid amount.',true);
    }

    x.saved += n;

    close('contributionModal');

    save('Savings added.');
});

/* CHART.JS */

const charts = {};

function chart(id,type,labels,datasets) {
    if(!window.Chart) return;

    charts[id]?.destroy();

    const c = getComputedStyle(document.documentElement);

    const color = c.getPropertyValue(
        '--text-secondary'
    ).trim();

    const grid = c.getPropertyValue('--border').trim();

    charts[id] = new Chart($(id),{
        type,

        data:{
            labels,
            datasets
        },

        options:{
            responsive:true,
            maintainAspectRatio:false,

            plugins:{
                legend:{
                    display:type !== 'doughnut',
                    labels:{color}
                },

                tooltip:{
                    callbacks:{
                        label:x =>
                            `${x.dataset.label || x.label}: ${money(x.raw)}`
                    }
                }
            },

            ...(type === 'doughnut'
                ? {
                    cutout:'75%'
                }
                : {
                    scales:{
                        x:{
                            ticks:{color},
                            grid:{display:false}
                        },
                        y:{
                            beginAtZero:true,
                            ticks:{color},
                            grid:{color:grid}
                        }
                    }
                })
        }
    });
}

function draw() {
    if(page === 'overview') {
        const m = val('overviewMonth') || month();

        const d = new Date(m+'-01T00:00:00');

        const n = +val('cashflowPeriod') || 6;

        const dates = Array.from(
            {length:n},
            (_,i) => new Date(
                d.getFullYear(),
                d.getMonth()-n+i+1,
                1
            )
        );

        chart(
            'cashflowChart',
            'bar',
            dates.map(x => x.toLocaleDateString(
                'en',{month:'short'}
            )),

            ['income','expense'].map((t,i) => ({
                label:t === 'income' ? 'Income' : 'Expenses',

                data:dates.map(x =>
                    sum(byType(
                        monthly(date(x).slice(0,7)),t
                    ))
                ),

                backgroundColor:colors[i ? 2 : 0],
                borderRadius:6
            }))
        );

        const b = breakdown(monthly(m));

        chart(
            'spendingChart',
            'doughnut',
            b.map(x => category(x[0])),
            [{
                data:b.map(x => x[1]),
                backgroundColor:colors,
                borderWidth:0
            }]
        );

        html(
            'spendingLegend',
            b.map(([c,n],i) => `
                <div class="legend-item">

                    <span class="legend-label">

                        <span class="legend-dot"
                            style="background:${colors[i%colors.length]}">
                        </span>

                        ${esc(category(c))}
                    </span>

                    <strong>${money(n)}</strong>
                </div>
            `).join('') || '<p>No expenses yet.</p>'
        );
    }

    if(page === 'analytics') {
        const m = val('analyticsMonth') || month();

        const a = monthly(m);
        const b = breakdown(a);

        const days = Array.from({
            length:new Date(
                +m.slice(0,4),
                +m.slice(5),
                0
            ).getDate()
        },(_,i) => i+1);

        chart(
            'dailySpendingChart',
            'line',
            days,
            [{
                label:'Daily expenses',

                data:days.map(d =>
                    sum(byType(
                        a.filter(x =>
                            x.date === m+'-'+
                            String(d).padStart(2,'0')
                        ),
                        'expense'
                    ))
                ),

                borderColor:colors[0],
                tension:.3
            }]
        );

        chart(
            'categoryChart',
            'bar',
            b.map(x => category(x[0])),
            [{
                label:'Expenses',
                data:b.map(x => x[1]),
                backgroundColor:colors,
                borderRadius:6
            }]
        );
    }
}

/* CSV EXPORT */

function download(name,data,type) {
    const u = URL.createObjectURL(
        new Blob([data],{type})
    );

    const a = document.createElement('a');

    a.href = u;
    a.download = name;
    a.click();

    setTimeout(() => URL.revokeObjectURL(u),1000);
}

const csv = v => '"' + String(v ?? '')
    .replace(/^\s*[=+\-@]/,m => "'"+m)
    .replace(/"/g,'""') + '"';

click('exportCsvBtn',() => {
    const rows = [
        [
            'Name','Type','Category',
            'Amount','Currency','Date','Note'
        ],

        ...filtered().map(x => [
            x.name,
            x.type,
            x.category,
            x.amount,
            s.currency,
            x.date,
            x.note
        ])
    ];

    download(
        'finora-transactions.csv',
        '\uFEFF' + rows.map(
            r => r.map(csv).join(',')
        ).join('\r\n'),
        'text/csv'
    );
});

/* BACKUP AND RESTORE */

click('backupBtn',() => {
    download(
        'finora-backup.json',
        JSON.stringify(s,null,2),
        'application/json'
    );
});

click('restoreBtn',() => $('restoreFile').click());

function valid(d) {
    const num = n =>
        typeof n === 'number' &&
        Number.isFinite(n) &&
        n > 0;

    const dt = x =>
        typeof x === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(x) &&
        date(new Date(x+'T00:00:00')) === x;

    return d &&
        ['dark','light'].includes(d.theme) &&
        ['INR','USD','EUR','GBP','AED'].includes(d.currency) &&

        Object.values(configs).every(([k]) =>
            Array.isArray(d[k]) &&
            d[k].every(x => x && typeof x.id === 'string') &&
            new Set(d[k].map(x => x.id)).size === d[k].length
        ) &&

        d.transactions.every(x =>
            typeof x.name === 'string' &&
            typeof x.note === 'string' &&
            ['income','expense'].includes(x.type) &&
            (x.type === 'income' ? income : expense)
                .some(c => c[0] === x.category) &&
            num(x.amount) &&
            dt(x.date)
        ) &&

        d.budgets.every(x =>
            expense.some(c => c[0] === x.category) &&
            num(x.amount)
        ) &&

        d.goals.every(x =>
            typeof x.name === 'string' &&
            num(x.target) &&
            typeof x.saved === 'number' &&
            Number.isFinite(x.saved) &&
            x.saved >= 0 &&
            (!x.deadline || dt(x.deadline))
        ) &&

        d.recurring.every(x =>
            typeof x.name === 'string' &&
            num(x.amount) &&
            dt(x.date) &&
            ['monthly','weekly','yearly'].includes(x.frequency)
        );
}

on('restoreFile','change',async e => {
    try {
        const f = e.target.files[0];

        if(!f) return;

        const d = JSON.parse(await f.text());

        if(!valid(d)) throw Error();

        confirm(
            'Restore backup?',
            'Current records will be replaced.',
            () => {
                s = d;

                theme();
                save('Backup restored.');
            }
        );
    } catch {
        toast('Invalid backup file.',true);
    } finally {
        e.target.value = '';
    }
});

/* RESET DATA */

click('resetDataBtn',() => {
    confirm(
        'Reset all data?',
        'All financial records will be deleted.',
        () => {
            s = {
                ...fresh(),
                theme:s.theme,
                currency:s.currency
            };

            save('Data reset.');
        }
    );
});

/* DEMO DATA */

click('demoDataBtn',() => {
    confirm(
        'Load demo data?',
        'Existing financial records will be replaced.',
        () => {
            s = {
                ...fresh(),
                theme:s.theme
            };

            const now = new Date();

            const samples = [
                ['Salary','income','Salary',65000,1],
                ['Freelance','income','Freelance',15000,5],
                ['Rent','expense','Rent',18000,2],
                ['Groceries','expense','Food',3500,7],
                ['Internet','expense','Bills',999,12],
                ['Shopping','expense','Shopping',4200,15],
                ['Fuel','expense','Transport',2500,18]
            ];

            for(let i=5;i>=0;i--) {
                for(const [
                    name,type,category,amount,day
                ] of samples) {
                    s.transactions.push({
                        id:uid(),
                        name,
                        type,
                        category,
                        amount,

                        date:date(new Date(
                            now.getFullYear(),
                            now.getMonth()-i,
                            i ? day : Math.min(day,now.getDate())
                        )),

                        note:'Demo transaction'
                    });
                }
            }

            s.budgets = [
                {
                    id:uid(),
                    category:'Food',
                    amount:6000
                },
                {
                    id:uid(),
                    category:'Shopping',
                    amount:5000
                }
            ];

            s.goals = [
                {
                    id:uid(),
                    name:'Emergency fund',
                    target:100000,
                    saved:45000,
                    deadline:''
                }
            ];

            s.recurring = [
                {
                    id:uid(),
                    name:'Internet',
                    amount:999,
                    frequency:'monthly',

                    date:date(new Date(
                        now.getFullYear(),
                        now.getMonth()+1,
                        12
                    ))
                }
            ];

            set('overviewMonth',month());
            set('analyticsMonth',month());

            theme();

            save('Demo data loaded.');

            navigate('overview');
        }
    );
});

/* MASTER RENDER */

function render() {
    overview();
    transactions();
    budgets();
    goals();
    simulator();
    analytics();
    calendar();
    recurring();
    draw();
    icons();
}

/* INITIALIZATION */

for(const id of [
    'overviewMonth',
    'analyticsMonth',
    'cashflowPeriod'
]) {
    on(id,'change',render);
}

set('overviewMonth',month());
set('analyticsMonth',month());

txt('currentYear',new Date().getFullYear());

html(
    'transactionCategoryFilter',
    options([
        ['all','All categories'],
        ...expense,
        ...income.filter(
            x => !expense.some(y => y[0] === x[0])
        )
    ])
);

categories();
theme();
render();

});

/* END OF FINORA JAVASCRIPT */
