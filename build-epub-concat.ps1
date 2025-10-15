# Get all chapter files in order
$files = Get-ChildItem html/chapter*.html | Sort-Object Name

# Start with basic HTML structure
$combinedHTML = @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Learn Nue - Complete Documentation</title>
</head>
<body>
"@

# Extract body content from each file and concatenate
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    # Extract content between <body> and </body> tags
    if ($content -match '(?s)<body[^>]*>(.*)</body>') {
        $bodyContent = $matches[1]
        $combinedHTML += "`n$bodyContent`n"
    }
}

# Close the HTML
$combinedHTML += @"
</body>
</html>
"@

# Write combined file
$combinedHTML | Out-File -FilePath "html/combined.html" -Encoding UTF8

# Run pandoc on the single combined file
pandoc html/combined.html -o nuejs-docs.epub --epub-metadata=metadata.xml --css=epub-styles.css --toc-depth=2 --number-sections --split-level=1