import { useTranslation } from 'react-i18next'
import { LoginForm } from '../components/LoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/lib/theme'
import { Sun, Moon, Languages, Check } from 'lucide-react'
import { changeAppLanguage, languages, isRtlLanguage, type AppLanguage } from '@/lib/i18n'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function LoginPage() {
  const { t, i18n } = useTranslation(['auth', 'common'])
  const { theme, toggleTheme } = useThemeStore()
  const isRtl = isRtlLanguage(i18n.language)
  const currentLanguageConfig = languages[(i18n.language as AppLanguage)] ?? languages.en

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground relative overflow-hidden select-none">
      {/* Left Panel — Privé Bespoke Editorial Cover (Desktop only) */}
      <div className="hidden lg:relative lg:flex lg:w-1/2 xl:w-[52%] min-h-screen overflow-hidden bg-prive-olive-deep">
        {/* Full-bleed Cover Image with Privé monogram pattern */}
        <img
          src="/assets/images/cover.png"
          alt="Privé Grooming Lounge Pattern Canvas"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000 ease-out hover:scale-100"
        />

        {/* Ambient Luxury Dark Overlay with subtle olive/champagne depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/50 z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/60 z-10 pointer-events-none" />

        {/* Editorial Content Overlay */}
        <div className="relative z-20 flex flex-col justify-between p-12 xl:p-16 h-full w-full">
          {/* Top Brand Wordmark */}
          <div className="flex items-center">
            <img
              src="/assets/images/Wordmark.png"
              alt="Privé Grooming Lounge"
              className="h-10 xl:h-12 w-auto object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
            />
          </div>

          {/* Bottom Narrative & Brand Statement */}
          <div className="space-y-6 max-w-lg">
            <div className="space-y-3">
              <h1 className="text-3xl xl:text-4xl font-light tracking-tight text-white leading-tight">
                {t('auth:login.editorial.headlinePart1')}
                <span className="font-serif italic font-normal text-prive-cream">
                  {t('auth:login.editorial.headlinePart2')}
                </span>
              </h1>
              <p className="text-sm xl:text-base text-prive-cream/80 leading-relaxed font-light">
                {t('auth:login.editorial.narrative')}
              </p>
            </div>

            {/* Subtle editorial specs */}
            <div className="pt-4 border-t border-white/15 flex items-center gap-6 text-xs text-prive-cream/70 font-light">
              <div>
                <span className="block text-white font-medium">{t('auth:login.editorial.product')}</span>
                <span>{t('auth:login.editorial.system')}</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div>
                <span className="block text-white font-medium">{t('auth:login.editorial.version')}</span>
                <span>0.1.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Authentication Area */}
      <div className="w-full lg:w-1/2 xl:w-[48%] flex flex-col justify-between min-h-screen p-6 sm:p-10 lg:p-12 relative bg-background">
        {/* Top Header with Theme & Language Switchers */}
        <div className="flex items-center justify-between w-full">
          {/* Mobile Wordmark (hidden on desktop) */}
          <div className="flex lg:hidden items-center">
            <img
              src="/assets/images/Wordmark.png"
              alt="Privé Grooming Lounge"
              className="h-7 sm:h-8 w-auto object-contain brightness-0 dark:brightness-100"
            />
          </div>
          <div className="hidden lg:block" />

          {/* Controls: Language and Theme Toggle */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer border border-border/40 shadow-xs outline-none"
                title="Select language"
                aria-label="Select language"
              >
                <Languages className="size-3.5 text-muted-foreground" />
                <span className="text-[11px]">{currentLanguageConfig?.nativeName ?? 'English'}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRtl ? 'start' : 'end'} sideOffset={6} className="min-w-32">
                {Object.values(languages).map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => changeAppLanguage(lang.code)}
                    className={cn(
                      'flex items-center justify-between text-xs cursor-pointer',
                      i18n.language === lang.code && 'font-semibold bg-accent text-accent-foreground'
                    )}
                  >
                    <span>{lang.nativeName}</span>
                    {i18n.language === lang.code && <Check className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={toggleTheme}
              className="size-9 rounded-full bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer border border-border/40 shadow-xs"
              title={theme === 'light' ? t('auth:login.themeToggleDark') : t('auth:login.themeToggleLight')}
              aria-label={t('auth:login.themeToggleAria')}
            >
              {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
          </div>
        </div>

        {/* Centered Form Container */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          <div className="space-y-2 mb-8 text-center sm:text-start">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground font-heading">
              {t('auth:login.title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('auth:login.subtitle')}
            </p>
          </div>

          {/* Borderless luxury card without black borders or dark rings */}
          <Card className="border border-border/40 shadow-xl shadow-black/5 dark:shadow-black/40 bg-card/85 dark:bg-card/75 backdrop-blur-2xl rounded-2xl p-6 sm:p-8">
            <CardHeader className="p-0 pb-6 space-y-1">
              <CardTitle className="text-lg font-medium text-foreground">{t('auth:login.cardTitle')}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t('auth:login.cardDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <LoginForm />
            </CardContent>
          </Card>
        </div>

        {/* Footer — LogicBloom Copyright and System Attribution */}
        <footer className="pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-start">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <a
              className="cursor-pointer inline-flex items-center"
              href="https://logicbloom.co"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/assets/images/LogicBloom.png"
                alt="LogicBloom"
                className="h-14 w-auto object-contain dark:brightness-0 dark:invert opacity-85 hover:opacity-100 transition-opacity duration-300 ease-out"
              />
            </a>
          </div>

          <p className="text-[11px] text-muted-foreground/70">
            {t('auth:login.copyright')}
          </p>
        </footer>
      </div>
    </div>
  )
}
