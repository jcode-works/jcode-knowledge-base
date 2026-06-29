import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Progress,
  Textarea,
} from "@jcode.labs/mimir-ui"
import {
  Database,
  FileSearch,
  FolderOpen,
  HardDrive,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"

const sources = [
  { name: "Client RFP", files: 128, status: "Indexed" },
  { name: "Architecture notes", files: 42, status: "Watching" },
  { name: "Legal review", files: 17, status: "Local only" },
]

const citations = [
  {
    source: "operations-brief.md",
    text: "approved runtime: encrypted disk, local retrieval, no telemetry",
  },
  {
    source: "security-policy.yaml",
    text: "remote model loading disabled; access log stores metadata only",
  },
]

export function App(): React.JSX.Element {
  return (
    <main className="desktop-shell min-h-screen p-3 text-foreground md:p-5">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-7xl gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="rounded-lg border border-border bg-card/90 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardDrive className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-black leading-none">Mimir</p>
              <p className="text-xs text-muted-foreground">Desktop preview</p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Button className="w-full justify-start" variant="secondary">
              <Database aria-hidden="true" />
              Knowledge bases
            </Button>
            <Button className="w-full justify-start" variant="ghost">
              <FileSearch aria-hidden="true" />
              Retrieval
            </Button>
            <Button className="w-full justify-start" variant="ghost">
              <ShieldCheck aria-hidden="true" />
              Privacy audit
            </Button>
          </div>

          <Card className="mt-6 bg-background">
            <CardHeader>
              <CardTitle className="text-sm">Local posture</CardTitle>
              <CardDescription>No telemetry. No hosted vector DB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="success">Remote models disabled</Badge>
              <Progress value={78} />
            </CardContent>
          </Card>
        </aside>

        <section className="grid gap-4 lg:grid-rows-[auto_1fr]">
          <header className="rounded-lg border border-border bg-card/90 p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge variant="outline">Tauri desktop + mobile shell</Badge>
                <h1 className="mt-3 text-3xl font-black md:text-4xl">Talk to local documents.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Mimir Core stays MIT. This app is the installable product surface for folders,
                  ingestion, retrieval, and visible privacy controls.
                </p>
              </div>
              <Button>
                <FolderOpen aria-hidden="true" />
                Add folder
              </Button>
            </div>
          </header>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="bg-card/90">
              <CardHeader>
                <CardTitle>Projects</CardTitle>
                <CardDescription>Local knowledge bases stored per workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sources.map((source) => (
                  <div
                    className="flex items-center justify-between rounded-md border border-border bg-background p-3"
                    key={source.name}
                  >
                    <div>
                      <p className="font-semibold">{source.name}</p>
                      <p className="text-xs text-muted-foreground">{source.files} files</p>
                    </div>
                    <Badge variant="outline">{source.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card/90">
              <CardHeader>
                <CardTitle>Ask with citations</CardTitle>
                <CardDescription>
                  Retrieval context only; synthesis remains your agent's job.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input aria-label="Question" defaultValue="What proves offline operation?" />
                  <Button>
                    <MessageSquareText aria-hidden="true" />
                    Ask
                  </Button>
                </div>
                <Textarea
                  aria-label="Retrieved context"
                  readOnly
                  value={citations
                    .map((item, index) => `[${index + 1}] ${item.source}: ${item.text}`)
                    .join("\n\n")}
                />
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <LockKeyhole className="size-3" aria-hidden="true" />
                    Redaction before indexing
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <RefreshCw className="size-3" aria-hidden="true" />
                    Incremental ingest
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}
