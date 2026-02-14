# Define the output file
rm -r project_source_dump.txt
$outputFile = "project_source_dump.txt"
$excludePattern = "node_modules|dist|.turbo|.vite|.pnpm|prisma[\\/]migrations|.husky[\\/]_|tsconfig.tsbuildinfo|package-lock.json|.png|.jpg|.svg|.ico"

# Clear the output file if it exists
New-Item -ItemType File -Path $outputFile -Force | Out-Null

# Get all files, excluding directories and ignored patterns
Get-ChildItem -Recurse -Depth 5 -File | 
    Where-Object { $_.FullName -notmatch $excludePattern -and $_.Name -ne $outputFile -and $_.Name -ne "print-structure.ps1" } | 
    ForEach-Object {
        # Create a relative path for the header (cleaner than FullName)
        $relativePath = $_.FullName.Replace("N:\work\GDriveBridge\", "")
        
        # Write the file path header
        Add-Content -Path $outputFile -Value "`n--- START OF FILE: $relativePath ---`n"
        
        # Append the file content
        Get-Content -Path $_.FullName | Add-Content -Path $outputFile
        
        Add-Content -Path $outputFile -Value "`n--- END OF FILE: $relativePath ---`n"
    }

Write-Host "Success! All source code has been written to $outputFile" -ForegroundColor Green