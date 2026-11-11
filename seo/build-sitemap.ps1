# Yorkshire Autotech - sitemap.xml + robots.txt builder
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File seo/build-sitemap.ps1
# Scans the site for every published page on disk, so new pages are never left
# out of the sitemap. Pages marked <meta name="robots" content="noindex..."> are skipped.

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$site = "https://yorkshireautotech.co.uk"
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Test-Indexable($path) {
  $html = [IO.File]::ReadAllText($path)
  return -not ($html -match '<meta\s+name="robots"\s+content="[^"]*noindex')
}

function New-UrlEntry($loc, $file, $changefreq, $priority) {
  $lastmod = (Get-Item $file).LastWriteTime.ToString("yyyy-MM-dd")
  return "  <url><loc>$loc</loc><lastmod>$lastmod</lastmod><changefreq>$changefreq</changefreq><priority>$priority</priority></url>"
}

$urls = New-Object System.Collections.Generic.List[string]

# Top-level pages (homepage first, then the rest alphabetically)
$topPriority = @{ "index.html" = @("weekly", "1.0"); "gallery.html" = @("weekly", "0.8"); "fix-it-myself.html" = @("weekly", "0.8"); "privacy.html" = @("yearly", "0.3") }
$topPages = Get-ChildItem -Path $root -Filter *.html -File |
  Where-Object { Test-Indexable $_.FullName } |
  Sort-Object @{ Expression = { $_.Name -ne "index.html" } }, Name
foreach ($p in $topPages) {
  $loc = if ($p.Name -eq "index.html") { "$site/" } else { "$site/$($p.Name)" }
  $opts = if ($topPriority.ContainsKey($p.Name)) { $topPriority[$p.Name] } else { @("monthly", "0.5") }
  $urls.Add((New-UrlEntry $loc $p.FullName $opts[0] $opts[1]))
}

# Areas hub
$hub = Join-Path $root "areas\index.html"
if ((Test-Path $hub) -and (Test-Indexable $hub)) {
  $urls.Add((New-UrlEntry "$site/areas/" $hub "monthly" "0.6"))
}

# Every service/location page: /services/{service}/{location}/index.html
$servicesDir = Join-Path $root "services"
Get-ChildItem -Path $servicesDir -Directory | Sort-Object Name | ForEach-Object {
  $svc = $_.Name
  Get-ChildItem -Path $_.FullName -Directory | Sort-Object Name | ForEach-Object {
    $page = Join-Path $_.FullName "index.html"
    if ((Test-Path $page) -and (Test-Indexable $page)) {
      $urls.Add((New-UrlEntry "$site/services/$svc/$($_.Name)/" $page "monthly" "0.6"))
    }
  }
}

$sitemap = "<?xml version=""1.0"" encoding=""UTF-8""?>`r`n<urlset xmlns=""http://www.sitemaps.org/schemas/sitemap/0.9"">`r`n" +
  ($urls -join "`r`n") + "`r`n</urlset>`r`n"
[IO.File]::WriteAllText((Join-Path $root "sitemap.xml"), $sitemap, $utf8)

$robots = "User-agent: *`r`nAllow: /`r`nDisallow: /admin.html`r`n`r`nSitemap: $site/sitemap.xml`r`n"
[IO.File]::WriteAllText((Join-Path $root "robots.txt"), $robots, $utf8)

Write-Output "Sitemap: $root\sitemap.xml ($($urls.Count) URLs)"
Write-Output "Robots: $root\robots.txt"
