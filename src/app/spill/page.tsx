import Link from "next/link";
import { HomeLink } from "@/components/HomeLink";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TruckGame } from "@/components/TruckGame";

export const metadata = {
  title: "Dagens spill – Logistikknyheter",
  description: "En ny lastebiltur hver dag – svar riktig på fagbegreper for å komme forbi flaskehalsene.",
};

export default function SpillPage() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-card-border bg-background/90 backdrop-blur supports-backdrop-blur:bg-background/70">
        <div
          className="h-[3px] w-full"
          style={{ background: "linear-gradient(to right, var(--accent), var(--gold))" }}
          aria-hidden
        />
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <HomeLink>
              <Logo />
              <div>
                <h1
                  className="font-serif text-lg sm:text-xl font-bold tracking-tight leading-none bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, var(--foreground), var(--accent) 70%, var(--gold))",
                  }}
                >
                  Logistikknyheter
                </h1>
                <p className="text-xs text-muted mt-1">Dagens spill</p>
              </div>
            </HomeLink>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Link
          href="/"
          className="text-sm text-muted hover:text-accent transition-colors inline-flex items-center gap-1 mb-4"
        >
          ← Tilbake til forsiden
        </Link>

        <TruckGame />

        <p className="text-xs text-muted text-center mt-6">
          Spørsmålene er basert på fagbegreper fra kompendiene til ØAL118 og ØAL121.
        </p>
      </div>
    </>
  );
}
