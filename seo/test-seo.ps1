$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$site = "https://yorkshireautotech.co.uk"

function Assert($condition, $message) {
  if (-not $condition) { throw $message }
}

& (Join-Path $PSScriptRoot "build-sitemap.ps1") | Out-Null

$sitemapPath = Join-Path $root "sitemap.xml"
[xml]$sitemap = Get-Content -Raw $sitemapPath
$sitemapUrls = @($sitemap.urlset.url | ForEach-Object { $_.loc })
Assert ($sitemapUrls.Count -gt 0) "Sitemap is empty"
Assert (($sitemapUrls | Select-Object -Unique).Count -eq $sitemapUrls.Count) "Sitemap contains duplicate URLs"

$serviceDirs = Get-ChildItem (Join-Path $root "services") -Directory | Sort-Object Name
$publishedServices = @()
foreach ($serviceDir in $serviceDirs) {
  $pagePath = Join-Path $serviceDir.FullName "index.html"
  if (-not (Test-Path $pagePath)) { continue }
  $html = [IO.File]::ReadAllText($pagePath)
  if ($html -match '<meta\s+name="robots"\s+content="[^"]*noindex') { continue }

  $expected = "$site/services/$($serviceDir.Name)/"
  Assert ($html -match '<h1(?:\s[^>]*)?>') "$pagePath is missing an H1"
  Assert (($html | Select-String -Pattern '<h1(?:\s[^>]*)?>' -AllMatches).Matches.Count -eq 1) "$pagePath must have exactly one H1"
  Assert ($html -match [regex]::Escape("<link rel=`"canonical`" href=`"$expected`">")) "$pagePath has the wrong canonical"
  Assert ($html -match 'href="../../css/style\.css"') "$pagePath does not load the shared stylesheet"
  Assert ($sitemapUrls -contains $expected) "$expected is missing from the sitemap"

  foreach ($match in [regex]::Matches($html, '(?s)<script type="application/ld\+json">(.*?)</script>')) {
    $null = $match.Groups[1].Value | ConvertFrom-Json
  }
  $publishedServices += $expected
}

Assert ($publishedServices.Count -ge 8) "Expected at least 8 indexable service pages, found $($publishedServices.Count)"

foreach ($url in $sitemapUrls) {
  Assert ($url.StartsWith("$site/")) "Sitemap URL is not absolute or belongs to another host: $url"
}

$redirects = [IO.File]::ReadAllText((Join-Path $root "_redirects"))
foreach ($serviceUrl in $publishedServices) {
  $slug = ([Uri]$serviceUrl).AbsolutePath.Trim('/').Split('/')[-1]
  Assert ($redirects.Contains("/services/$slug/* /services/$slug/ 301")) "Missing 301 redirect for $slug location URLs"
}

Write-Output "SEO checks passed: $($publishedServices.Count) service pages and $($sitemapUrls.Count) sitemap URLs."
