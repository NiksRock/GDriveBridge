Get-ChildItem -Recurse -Depth 5 |
  Where-Object { $_.FullName -notmatch "node_modules|dist|.turbo|.vite|.pnpm" } |
  Select-Object FullName
