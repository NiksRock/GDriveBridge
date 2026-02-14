Write-Host "🧹 Cleaning repo..."

$paths = @(
  "node_modules",
  ".turbo",
  "dist",
  "build",
  "apps/api/node_modules",
  "apps/web/node_modules",
  "apps/worker/node_modules",
  "packages/shared/node_modules",
  "apps/api/dist",
  "apps/web/dist",
  "apps/worker/dist",
  "packages/shared/dist"
)

foreach ($p in $paths) {
  if (Test-Path $p) {
    Remove-Item -Recurse -Force $p
    Write-Host "Deleted $p"
  }
}

Write-Host "✅ Clean complete"
