import React, { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, Shield, Sparkles, ChevronRight } from 'lucide-react';

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
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
                <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-emerald-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIj48L2NpcmNsZT4KPC9zdmc+')] opacity-50 block dark:opacity-10" />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 w-full px-6 py-6 md:px-12 lg:px-24 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center shadow-[0_0_20px_rgba(127,13,242,0.4)]">
                        <TrendingUp size={24} className="text-white" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-foreground hidden sm:block">TrackFinance</span>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={onLoginClick} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block cursor-pointer">
                        Log In
                    </button>
                    <button
                        onClick={onRegisterClick}
                        className="group relative inline-flex items-center gap-2 px-6 py-2.5 bg-primary overflow-hidden rounded-full transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(127,13,242,0.4)] cursor-pointer"
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
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">play the game.</span>
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
                        className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary overflow-hidden rounded-full transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(127,13,242,0.5)] w-full sm:w-auto cursor-pointer"
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
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[2rem] blur opacity-20" />
                    <div className="relative bg-card rounded-[1.5rem] border border-border shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                        {/* Abstract Dashboard representation */}
                        <div className="w-full h-full p-8 flex gap-6 z-10">
                            <div className="w-64 h-full bg-background/50 rounded-2xl border border-border p-6 flex flex-col gap-4">
                                <div className="w-32 h-8 bg-muted rounded-lg" />
                                <div className="w-full h-24 bg-primary/10 border border-primary/20 rounded-xl mt-4 flex items-center px-4">
                                    <div className="w-12 h-12 rounded-full bg-primary/20" />
                                    <div className="ml-4 flex-1">
                                        <div className="w-16 h-4 bg-muted mb-2 rounded" />
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="w-2/3 h-full bg-primary" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1" />
                                <div className="w-full h-10 bg-muted rounded-lg" />
                            </div>
                            <div className="flex-1 flex flex-col gap-6">
                                <div className="w-full h-32 bg-background/50 rounded-2xl border border-border flex items-center px-8 gap-8">
                                    <div className="w-48 h-16 bg-muted rounded-xl" />
                                    <div className="w-48 h-16 bg-muted rounded-xl" />
                                    <div className="w-48 h-16 bg-muted rounded-xl" />
                                </div>
                                <div className="flex-1 flex gap-6">
                                    <div className="flex-1 bg-background/50 rounded-2xl border border-border" />
                                    <div className="w-1/3 bg-background/50 rounded-2xl border border-border" />
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
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(127,13,242,0.2)]">
                                <Sparkles size={28} className="text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">Earn XP & Level Up</h3>
                            <p className="text-muted-foreground">Gain experience points for every smart financial move. Watch your level grow as your savings do.</p>
                        </div>

                        <div className="bg-card p-8 rounded-3xl border border-border hover:border-blue-500/50 transition-colors group">
                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.2)]">
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
