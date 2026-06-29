import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { webcrypto } from "node:crypto"

const args = parseArgs(process.argv.slice(2))
const keyPair = await webcrypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
)
const privateKey = await webcrypto.subtle.exportKey("jwk", keyPair.privateKey)
const publicKey = await webcrypto.subtle.exportKey("jwk", keyPair.publicKey)

await writeMaybe(args["private-key"], JSON.stringify(privateKey, null, 2))
await writeMaybe(args["public-key"], JSON.stringify(publicKey, null, 2))

if (!args["private-key"] && !args["public-key"]) {
  console.log(
    JSON.stringify(
      {
        privateKeyJwk: privateKey,
        publicKeyJwk: publicKey,
        vitePublicKeyEnv: JSON.stringify(publicKey),
      },
      null,
      2,
    ),
  )
}

async function writeMaybe(target, content) {
  if (!target) return
  const resolved = path.resolve(target)
  await mkdir(path.dirname(resolved), { recursive: true })
  await writeFile(resolved, `${content}\n`, { mode: 0o600 })
  console.log(`wrote ${resolved}`)
}

function parseArgs(values) {
  const parsed = {}
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (!value?.startsWith("--")) continue
    const key = value.slice(2)
    const next = values[index + 1]
    if (!next || next.startsWith("--")) {
      parsed[key] = "true"
      continue
    }
    parsed[key] = next
    index += 1
  }
  return parsed
}
