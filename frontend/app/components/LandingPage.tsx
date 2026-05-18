import React, { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, Shield, Sparkles, ChevronRight, Activity, CreditCard, DollarSign, Wallet, PieChart, Home, Settings, LogOut } from 'lucide-react';
import { Logo } from './Logo';

interface LandingPageProps {
    onLoginClick: () => void;
    onRegisterClick: () => void;
}

export function LandingPage({ onLoginClick, onRegisterClick }: LandingPageProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30 selection:text-primary transition-colors duration-200">
            {/* Dynamic Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
                <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-emerald-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIj48L2NpcmNsZT4KPC9zdmc+')] opacity-50 block dark:opacity-10" />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 w-full px-6 py-6 md:px-12 lg:px-24 flex items-center justify-between">
                <Logo size="md" showWordmark />
                <div className="flex items-center gap-6">
                    <button onClick={onLoginClick} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block cursor-pointer">
                        Log In
                    </button>
                    <button
                        onClick={onRegisterClick}
                        className="group relative inline-flex items-center gap-2 px-6 py-2.5 bg-primary overflow-hidden rounded-full transition-all hover:scale-105 hover:shadow-[0_4px_20px_rgba(5,150,105,0.35)] cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                        <span className="relative text-sm font-medium text-white">Get Started</span>
                        <ArrowRight size={16} className="relative text-white group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 w-full px-6 py-12 md:px-12 lg:px-24 flex flex-col items-center text-center pt-20 lg:pt-32">
                <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                        }`}
                >
                    <Sparkles size={16} />
                    <span className="text-sm font-medium">Level Up Your Finances</span>
                </div>

                <h1
                    className={`text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground max-w-5xl mb-8 transition-all duration-1000 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                        }`}
                >
                    Master your money, <br className="hidden md:block" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-teal-500">play the game.</span>
                </h1>

                <p
                    className={`text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                        }`}
                >
                    Stop tracking spreadsheets. Start earning XP for saving, unlocking achievements for budgeting, and leveling up your financial future.
                </p>

                <div
                    className={`flex flex-col sm:flex-row items-center gap-4 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                        }`}
                >
                    <button
                        onClick={onRegisterClick}
                        className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary overflow-hidden rounded-full transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(5,150,105,0.45)] w-full sm:w-auto cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                        <span className="relative text-base font-semibold text-white">Start Your Journey</span>
                        <ChevronRight size={20} className="relative text-white group-hover:translate-x-1 transition-transform" />
                    </button>

                    <a
                        href="#features"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-card border border-border rounded-full text-foreground font-medium hover:bg-muted transition-colors w-full sm:w-auto"
                    >
                        How it Works
                    </a>
                </div>

                {/* Dashboard Preview mockup */}
                <div
                    className={`relative w-full max-w-6xl mt-24 rounded-3xl p-2 bg-gradient-to-b from-border/50 to-transparent transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-95'
                        }`}
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-teal-600 rounded-[2rem] blur opacity-20" />
                    <div className="relative bg-card rounded-[1.5rem] border border-border shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                        {/* Realistic Dashboard Mockup */}
                        <div className="w-full h-full p-6 flex gap-6 z-10 bg-background/40">
                            {/* Sidebar Mockup */}
                            <div className="w-56 h-full bg-card rounded-2xl border border-border p-5 flex flex-col gap-6 shadow-sm">
                                {/* Logo / Title */}
                                <div className="flex items-center gap-3 px-2">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center shadow-md">
                                        <Activity size={16} className="text-white" />
                                    </div>
                                    <span className="font-bold text-foreground tracking-tight">TrackFinance</span>
                                </div>
                                {/* Navigation Menu */}
                                <div className="flex flex-col gap-2 mt-4">
                                    <div className="flex items-center gap-3 px-3 py-2.5 bg-primary/10 rounded-xl text-primary font-medium">
                                        <Home size={18} />
                                        <span className="text-sm">Dashboard</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted/50 rounded-xl transition-colors">
                                        <CreditCard size={18} />
                                        <span className="text-sm font-medium">Transactions</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted/50 rounded-xl transition-colors">
                                        <PieChart size={18} />
                                        <span className="text-sm font-medium">Budgets</span>
                                    </div>
                                    <div className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted/50 rounded-xl transition-colors">
                                        <Shield size={18} />
                                        <span className="text-sm font-medium">Goals</span>
                                    </div>
                                </div>
                                <div className="flex-1" />
                                {/* Bottom Menu */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted/50 rounded-xl transition-colors">
                                        <Settings size={18} />
                                        <span className="text-sm font-medium">Settings</span>
                                    </div>
                                    {/* User Avatar Row */}
                                    <div className="flex items-center gap-3 px-2 py-3 mt-2 border-t border-border">
                                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                                            IA
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-foreground">Imad</span>
                                            <span className="text-xs text-muted-foreground">Pro Member</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                                {/* Top KPI Cards Row */}
                                <div className="grid grid-cols-3 gap-6">
                                    {/* Card 1: Balance */}
                                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-3 group hover:border-primary/30 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both" style={{ animationDelay: '200ms' }}>
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <Wallet size={16} />
                                            </div>
                                            <span className="text-sm font-medium">Total Balance</span>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <span className="text-2xl font-bold text-foreground">MAD 12,450</span>
                                            <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md mb-1">+5.2%</span>
                                        </div>
                                    </div>
                                    {/* Card 2: Income */}
                                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-3 group hover:border-emerald-500/30 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both" style={{ animationDelay: '300ms' }}>
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                                <TrendingUp size={16} />
                                            </div>
                                            <span className="text-sm font-medium">Income</span>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <span className="text-2xl font-bold text-foreground">MAD 9,200</span>
                                            <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md mb-1">+12.4%</span>
                                        </div>
                                    </div>
                                    {/* Card 3: Expenses */}
                                    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-3 group hover:border-destructive/30 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both" style={{ animationDelay: '400ms' }}>
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
                                                <DollarSign size={16} />
                                            </div>
                                            <span className="text-sm font-medium">Monthly Expenses</span>
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <span className="text-2xl font-bold text-foreground">MAD 1,850</span>
                                            <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-1 rounded-md mb-1">-2.1%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Chart and Transactions Area */}
                                <div className="flex-1 flex gap-6">
                                    {/* Chart Placeholder */}
                                    <div className="flex-[3] bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both" style={{ animationDelay: '500ms' }}>
                                        <h3 className="font-semibold text-foreground mb-4">Spending Overview</h3>
                                        <div className="flex-1 w-full bg-muted/20 rounded-xl relative overflow-hidden flex items-end px-2 pt-6 border border-border/50">
                                            {/* Abstract CSS Line Chart rendering */}
                                            <svg className="w-full h-full text-primary opacity-20 absolute inset-0 mix-blend-multiply" preserveAspectRatio="none" viewBox="0 0 100 100">
                                                <path d="M0,100 L0,60 Q25,40 50,70 T100,30 L100,100 Z" fill="currentColor" className="animate-[pulse_4s_ease-in-out_infinite]" />
                                                <path d="M0,60 Q25,40 50,70 T100,30" fill="none" stroke="currentColor" strokeWidth="2" className="animate-[pulse_4s_ease-in-out_infinite]" />
                                            </svg>
                                            <div className="w-full flex justify-between items-end gap-3 h-full z-10 px-6 pb-4">
                                                <div className="w-full bg-primary/40 h-[40%] rounded-t-sm hover:bg-primary transition-colors cursor-pointer animate-[grow-up_1s_ease-out_forwards]" style={{ transformOrigin: 'bottom' }} />
                                                <div className="w-full bg-primary/60 h-[70%] rounded-t-sm hover:bg-primary transition-colors cursor-pointer animate-[grow-up_1s_ease-out_forwards]" style={{ transformOrigin: 'bottom', animationDelay: '100ms' }} />
                                                <div className="w-full bg-primary/30 h-[30%] rounded-t-sm hover:bg-primary transition-colors cursor-pointer animate-[grow-up_1s_ease-out_forwards]" style={{ transformOrigin: 'bottom', animationDelay: '200ms' }} />
                                                <div className="w-full bg-primary/80 h-[90%] rounded-t-sm hover:bg-primary transition-colors cursor-pointer animate-[grow-up_1s_ease-out_forwards]" style={{ transformOrigin: 'bottom', animationDelay: '300ms' }} />
                                                <div className="w-full bg-primary/50 h-[50%] rounded-t-sm hover:bg-primary transition-colors cursor-pointer animate-[grow-up_1s_ease-out_forwards]" style={{ transformOrigin: 'bottom', animationDelay: '400ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Transactions List Placeholder */}
                                    <div className="flex-[2] bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col animate-in fade-in slide-in-from-right-8 duration-700 ease-out fill-mode-both" style={{ animationDelay: '600ms' }}>
                                        <h3 className="font-semibold text-foreground mb-6">Recent Transactions</h3>
                                        <div className="flex flex-col gap-6">
                                            <div className="flex items-center justify-between group p-2 hover:bg-muted/30 rounded-xl transition-colors -mx-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                                                        <CreditCard size={20} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-base font-semibold text-foreground">Groceries</span>
                                                        <span className="text-sm text-muted-foreground">Today, 2:45 PM</span>
                                                    </div>
                                                </div>
                                                <span className="text-base font-bold text-foreground whitespace-nowrap text-right">- MAD 450</span>
                                            </div>
                                            <div className="flex items-center justify-between group p-2 hover:bg-muted/30 rounded-xl transition-colors -mx-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                                                        <TrendingUp size={20} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-base font-semibold text-foreground">Salary</span>
                                                        <span className="text-sm text-muted-foreground whitespace-nowrap">Yesterday, 9:00 AM</span>
                                                    </div>
                                                </div>
                                                <span className="text-base font-bold text-emerald-600 whitespace-nowrap text-right">+ MAD 4,200</span>
                                            </div>
                                            <div className="flex items-center justify-between group p-2 hover:bg-muted/30 rounded-xl transition-colors -mx-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                                                        <Activity size={20} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-base font-semibold text-foreground">Gym Membership</span>
                                                        <span className="text-sm text-muted-foreground whitespace-nowrap">Oct 24, 11:30 AM</span>
                                                    </div>
                                                </div>
                                                <span className="text-base font-bold text-foreground whitespace-nowrap text-right">- MAD 250</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Feature Grid */}
            <section id="features" className="relative z-10 w-full px-6 py-24 md:px-12 lg:px-24 bg-background border-t border-border mt-32">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">Finance meets Gamification.</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">TrackFinance turns your financial goals into achievable quests. Build better habits while having fun.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-card p-8 rounded-3xl border border-border hover:border-primary/50 transition-colors group">
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(5,150,105,0.18)]">
                                <Sparkles size={28} className="text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">Earn XP & Level Up</h3>
                            <p className="text-muted-foreground">Gain experience points for every smart financial move. Watch your level grow as your savings do.</p>
                        </div>

                        <div className="bg-card p-8 rounded-3xl border border-border hover:border-blue-500/50 transition-colors group">
                            <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                <Shield size={28} className="text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">Unlock Achievements</h3>
                            <p className="text-muted-foreground">Hit milestones and collect badges. From "First Budget" to "Master Saver", gamify your progress.</p>
                        </div>

                        <div className="bg-card p-8 rounded-3xl border border-border hover:border-emerald-500/50 transition-colors group">
                            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <TrendingUp size={28} className="text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">AI-Powered Insights</h3>
                            <p className="text-muted-foreground">Get intelligent, personalized advice on how to optimize your spending and hit your next level faster.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="w-full py-8 border-t border-border mt-auto flex flex-col sm:flex-row items-center justify-between px-6 md:px-12 lg:px-24 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 mb-4 sm:mb-0">
                    <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                        <TrendingUp size={14} className="text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">TrackFinance</span>
                    <span>&copy; {new Date().getFullYear()}</span>
                </div>
                <div className="flex gap-6">
                    <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
                    <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
                    <a href="#" className="hover:text-foreground transition-colors">Discord</a>
                </div>
            </footer>
        </div>
    );
}
