import { Badge, Button, Card, CardContent } from "@jcode.labs/mimir-ui"
import { ArrowRight, FileSearch, HardDrive, LockKeyhole, MonitorDown } from "lucide-react"

const proofPoints = [
  {
    icon: LockKeyhole,
    title: "Local first",
    text: "Documents, indexes, redaction, and retrieval stay on the machine you control.",
  },
  {
    icon: FileSearch,
    title: "Cited retrieval",
    text: "Mimir returns grounded passages for Claude, Codex, Cursor, or your own agent.",
  },
  {
    icon: MonitorDown,
    title: "Desktop path",
    text: "The paid shell targets desktop and mobile through Tauri without moving the core to SaaS.",
  },
]

export function LandingHero(): React.JSX.Element {
  return (
    <main className="mimir-grid bg-background text-foreground">
      <section className="mx-auto flex min-h-[92vh] w-full max-w-7xl flex-col px-5 py-5 md:px-8">
        <nav className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/80 px-4 py-3 backdrop-blur">
          <a className="text-lg font-black tracking-[0.08em]" href="/">
            Mimir
          </a>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <a href="https://github.com/jcode-works/jcode-mimir">GitHub</a>
            </Button>
            <Button asChild size="sm">
              <a href="#waitlist">
                Waitlist
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-4xl">
            <Badge variant="outline" className="mb-6 bg-background/80">
              Mimir Core is MIT. Mimir Desktop is the product layer.
            </Badge>
            <h1 className="max-w-5xl text-5xl font-black leading-[0.95] tracking-normal md:text-7xl">
              Mimir
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-muted-foreground">
              Sovereign local RAG for confidential dossiers, developer agents, and teams that need
              evidence without a hosted document brain.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="https://github.com/jcode-works/jcode-mimir">
                  Use Mimir Core
                  <ArrowRight aria-hidden="true" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#desktop">Preview Desktop</a>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden bg-card/92">
            <CardContent className="p-0">
              <div className="border-b border-border bg-primary px-5 py-4 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Mimir retrieval</span>
                  <HardDrive className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="rounded-md bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Question</p>
                  <p className="mt-1 font-semibold">Which evidence proves offline operation?</p>
                </div>
                <div className="rounded-md border border-border p-4">
                  <p className="text-sm text-muted-foreground">Cited passages</p>
                  <ol className="mt-3 space-y-3 text-sm">
                    <li>
                      <strong>[1] operations-brief.md</strong>
                      <br />
                      approved runtime, encrypted disk, local retrieval, no telemetry
                    </li>
                    <li>
                      <strong>[2] security-policy.yaml</strong>
                      <br />
                      remote model loading disabled, access log metadata only
                    </li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="desktop" className="border-y border-border bg-card/80">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-3 md:px-8">
          {proofPoints.map((point) => (
            <article
              className="rounded-lg border border-border bg-background p-5"
              key={point.title}
            >
              <point.icon className="mb-4 size-6 text-accent" aria-hidden="true" />
              <h2 className="text-xl font-bold">{point.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{point.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="waitlist" className="mx-auto max-w-7xl px-5 py-14 md:px-8">
        <div className="rounded-lg border border-border bg-primary p-6 text-primary-foreground md:p-8">
          <h2 className="text-3xl font-black">Build the private document layer once.</h2>
          <p className="mt-3 max-w-2xl text-primary-foreground/80">
            The landing intentionally stays static and telemetry-free. Email capture will be added
            through a Cloudflare Worker when launch validation starts.
          </p>
        </div>
      </section>
    </main>
  )
}
