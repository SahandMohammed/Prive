import { LoginForm } from '../components/LoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Hexagon } from 'lucide-react'

export function LoginPage() {
  return (
    <div className="min-h-screen w-full flex bg-background/95 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] mix-blend-multiply opacity-70 animate-in fade-in duration-1000" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[100px] mix-blend-multiply opacity-70 animate-in fade-in duration-1000 delay-300" />
      </div>

      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 bg-zinc-950 text-white overflow-hidden">
        {/* Dynamic dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black z-0" />
        
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent z-10" style={{ backgroundSize: '30px 30px', backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)' }} />

        <div className="relative z-20 max-w-lg space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center backdrop-blur-md border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
              <Hexagon className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <span className="text-3xl font-bold tracking-tight">Prive</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              The premier platform for private management.
            </h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Securely access your dashboard, manage your resources, and orchestrate your workflow with unparalleled precision.
            </p>
          </div>

          <div className="flex items-center space-x-4 pt-8 border-t border-white/10">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-zinc-600 to-zinc-800" />
                </div>
              ))}
            </div>
            <div className="text-sm text-zinc-400 font-medium">
              Trusted by 10,000+ professionals
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-center space-x-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Hexagon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Prive</span>
          </div>

          <Card className="border-border/50 shadow-2xl shadow-black/5 bg-background/60 backdrop-blur-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>

          <p className="px-8 text-center text-sm text-muted-foreground mt-8">
            By clicking continue, you agree to our{' '}
            <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
