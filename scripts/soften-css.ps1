$ErrorActionPreference = 'Stop'

$files = Get-ChildItem -Path 'src' -Recurse -Filter '*.css' | Where-Object {
  $_.FullName -notmatch 'design-tokens\.css$' -and
  $_.FullName -notmatch 'globals\.css$' -and
  $_.FullName -notmatch 'animated-background\.css$'
}

foreach ($file in $files) {
  $content = Get-Content -Raw $file.FullName

  $content = $content -replace 'var\(--cc-navy\)', 'var(--color-text)'
  $content = $content -replace 'var\(--cc-blue\)', 'var(--color-primary)'
  $content = $content -replace 'var\(--cc-yellow\)', 'var(--highlight)'
  $content = $content -replace 'var\(--cc-cream\)', 'var(--color-bg)'
  $content = $content -replace 'var\(--cc-white\)', 'var(--color-surface)'
  $content = $content -replace '#10162f', 'var(--color-text)'
  $content = $content -replace '#1804c9', 'var(--color-primary)'
  $content = $content -replace '#ffd300', 'var(--highlight)'
  $content = $content -replace '#fff0e5', 'var(--color-bg)'
  $content = $content -replace 'border:\s*2px solid var\(--color-text\)', 'border: 1px solid var(--color-border)'
  $content = $content -replace 'border-top:\s*2px solid var\(--color-text\)', 'border-top: 1px solid var(--color-border)'
  $content = $content -replace 'border-bottom:\s*2px solid var\(--color-text\)', 'border-bottom: 1px solid var(--color-border)'
  $content = $content -replace 'border-left:\s*2px solid var\(--color-text\)', 'border-left: 1px solid var(--color-border)'
  $content = $content -replace 'border-right:\s*2px solid var\(--color-text\)', 'border-right: 1px solid var(--color-border)'
  $content = $content -replace 'border:\s*2px dashed var\(--color-text\)', 'border: 1px dashed var(--color-border)'
  $content = $content -replace 'box-shadow:\s*0(\.\d+)?rem\s+0(\.\d+)?rem\s+0\s+var\(--color-text\)', 'box-shadow: var(--shadow-sm)'
  $content = $content -replace 'box-shadow:\s*0(\.\d+)?rem\s+(-)?0(\.\d+)?rem\s+0\s+var\(--color-text\)', 'box-shadow: var(--shadow-sm)'
  $content = $content -replace 'box-shadow:\s*0(\.\d+)?rem\s+0(\.\d+)?rem\s+0\s+var\(--color-border\)', 'box-shadow: var(--shadow-sm)'
  $content = $content -replace 'background:\s*var\(--color-text\)', 'background: var(--color-surface)'
  $content = $content -replace 'color:\s*var\(--color-text\)', 'color: var(--color-text)'

  Set-Content -Path $file.FullName -Value $content -Encoding utf8
}
