# Yorkshire Autotech - SEO location page generator
# Run from the site root:  powershell -ExecutionPolicy Bypass -File seo/build-locations.ps1
# Generates static pages at /services/{service}/{location}/index.html,
# an areas hub at /areas/index.html, and the planning matrix at seo/seo-plan.csv
# The main site pages are never touched by this script.
# Pages that already exist only get their <head> (hidden SEO data) refreshed;
# their visible content is kept as-is. Delete a page first to fully regenerate it.

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent   # site root = parent of /seo

function Write-SeoPage([string]$path, [string]$html) {
  $utf8 = New-Object System.Text.UTF8Encoding $false
  if (Test-Path -LiteralPath $path) {
    $existing = [IO.File]::ReadAllText($path, $utf8)
    $oi = $existing.IndexOf("</head>"); $ni = $html.IndexOf("</head>")
    if ($oi -ge 0 -and $ni -ge 0) { $html = $html.Substring(0, $ni) + $existing.Substring($oi) }
  }
  [IO.File]::WriteAllText($path, $html, $utf8)
}

# ============================ SERVICES ============================
# Workshop-only (no mobile fitting offered) - every page says so honestly.
$services = @(
  [pscustomobject]@{
    slug = "carplay-installation"; name = "Apple CarPlay and Android Auto Installation"
    icon = "&#128241;"; kw = "Apple CarPlay installation"; skw = @("android auto installation","carplay retrofit","wireless carplay upgrade")
    desc = "Wired and wireless Apple CarPlay and Android Auto retrofitted to your factory screen - steering wheel controls, reversing camera feed and original menus all keep working."
    includes = @("OEM-style retrofit module fitted and coded","Wireless and wired CarPlay and Android Auto","Full use of factory controls, cameras and sensors","Tested and demonstrated before you leave")
    compat = $true
    mobile = $true
    angle = "keep a modern infotainment setup without replacing your factory screen"
  },
  [pscustomobject]@{
    slug = "ambient-lighting"; name = "Ambient Lighting Installation"
    icon = "&#128161;"; kw = "car ambient lighting installation"; skw = @("interior mood lighting","led ambient lighting car","ambient light retrofit")
    desc = "Multi-colour, app-controlled ambient lighting for door cards, dashboard and footwells - with music sync and factory-style integration that looks like it left the factory that way."
    includes = @("64-colour app-controlled LED system","Door card, dash, footwell and console coverage","Music sync and scene modes","Hidden wiring, no visible cables")
    compat = $false
    mobile = $false
    angle = "transform the cabin feel without any permanent modification"
  },
  [pscustomobject]@{
    slug = "starlight-headlining"; name = "Starlight Headlining Installation"
    icon = "&#10024;"; kw = "starlight headlining"; skw = @("starlight roof car","rolls royce star roof","fibre optic car roof")
    desc = "Choose from three fitted fibre-optic starlight headlining packages with 600, 800 or 1,200 stars, colour effects and app or remote control."
    includes = @("Bronze: 600 stars, static colour and app control","Silver: 800 stars, meteor and multiple-colour effects, remote and app control","Gold: 1,200 stars with Silver's effects and controls","Headliner professionally trimmed and refitted")
    compat = $false
    mobile = $false
    angle = "a genuine showpiece upgrade carried out by specialists"
  },
  [pscustomobject]@{
    slug = "reverse-camera-installation"; name = "Reverse Camera Installation"
    icon = "&#128247;"; kw = "reverse camera installation"; skw = @("reversing camera fitting","backup camera install","reverse camera retrofit")
    desc = "Factory-style reversing cameras integrated into your existing infotainment screen with dynamic guidelines - clean installs, no drilling on show, no visible wiring."
    includes = @("OEM-look camera matched to your vehicle","On-screen dynamic guidelines","Integrated into your factory display","Fully hidden wiring")
    compat = $true
    mobile = $true
    angle = "make tight parking and busy school-run manoeuvres far less stressful"
  },
  [pscustomobject]@{
    slug = "dashcam-installation"; name = "Dashcam Installation"
    icon = "&#128249;"; kw = "dashcam installation"; skw = @("dash cam fitting","4k dashcam install","hardwired dashcam")
    desc = "4K front and rear dashcams, hardwired with parking mode for round-the-clock protection - cables fully hidden and insurance-friendly certificates provided."
    includes = @("4K front camera with rear option","Hardwired parking mode","WiFi app and GPS logging","Insurance certificate supplied")
    compat = $false
    mobile = $true
    angle = "protect yourself against crash-for-cash claims and car park damage"
  },
  [pscustomobject]@{
    slug = "steering-wheel-upgrade"; name = "Steering Wheel Upgrades"
    icon = "&#128665;"; kw = "custom steering wheel"; skw = @("carbon fibre steering wheel","flat bottom steering wheel","steering wheel retrim")
    desc = "Custom carbon fibre and Alcantara steering wheels - flat-bottom designs, LED shift lights, heated options and full airbag transfer carried out safely in-house."
    includes = @("Made-to-order carbon fibre build","Flat-bottom and LED shift light options","Custom leather, Alcantara and stitching","Safe airbag transfer and refit")
    compat = $true
    mobile = $true
    angle = "the one upgrade you touch every single time you drive"
  },
  [pscustomobject]@{
    slug = "virtual-cockpit"; name = "Virtual Cockpit Installation"
    icon = "&#128421;&#65039;"; kw = "virtual cockpit retrofit"; skw = @("digital instrument cluster","digital dash upgrade","cockpit retrofit")
    desc = "Full digital instrument cluster retrofits with navigation maps, media and switchable layouts - supplied, fitted and coded to your vehicle at our workshop."
    includes = @("Full digital cluster supplied and fitted","Navigation, media and sport layouts","Coded to your specific vehicle","All factory functions retained")
    compat = $true
    mobile = $true
    angle = "bring an older interior up to current-generation spec"
  },
  [pscustomobject]@{
    slug = "coding-and-retrofits"; name = "Vehicle Coding and Retrofits"
    icon = "&#9889;"; kw = "car coding"; skw = @("bmw coding","vag coding","feature activation","oem retrofit")
    desc = "Unlock your car's hidden features - video in motion, needle sweep, mirror dip, enhanced Bluetooth and OEM+ retrofits, coded properly with dealership-level diagnostic equipment."
    includes = @("Dealer-level diagnostic and coding tools","Hidden feature activation","OEM+ hardware retrofits","Before and after verification")
    compat = $true
    mobile = $false
    angle = "unlock equipment your car already has but was never switched on"
  }
)

# ============================ LOCATIONS ============================
# All distances/times are approximate from our Bingley workshop (Canal Road, BD16 2SR).
$locations = @(
  [pscustomobject]@{ slug="leeds"; name="Leeds"; region="West Yorkshire"; tier=1; drive="around 25 minutes"; route="straight down the A657 or via the M621"; angle="city commuting and motorway miles put your in-car tech to work every day" }
  [pscustomobject]@{ slug="bradford"; name="Bradford"; region="West Yorkshire"; tier=1; drive="around 15 minutes"; route="just up the road from our Bingley workshop"; angle="our closest city - many of our regulars are based here" }
  [pscustomobject]@{ slug="huddersfield"; name="Huddersfield"; region="West Yorkshire"; tier=1; drive="around 30 minutes"; route="a quick run along the M62"; angle="easy M62 access makes us a convenient specialist option" }
  [pscustomobject]@{ slug="halifax"; name="Halifax"; region="West Yorkshire"; tier=1; drive="around 20 minutes"; route="via the A629"; angle="close enough for a lunchtime drop-off" }
  [pscustomobject]@{ slug="wakefield"; name="Wakefield"; region="West Yorkshire"; tier=1; drive="around 35 minutes"; route="via the M62 and M1"; angle="straightforward motorway run to specialist fitting" }
  [pscustomobject]@{ slug="sheffield"; name="Sheffield"; region="South Yorkshire"; tier=1; drive="around an hour"; route="via the M62 and M1"; angle="worth the trip for work most general garages will not touch" }
  [pscustomobject]@{ slug="doncaster"; name="Doncaster"; region="South Yorkshire"; tier=1; drive="around 55 minutes"; route="via the M62 and A1(M)"; angle="specialist work within easy reach of the A1 corridor" }
  [pscustomobject]@{ slug="rotherham"; name="Rotherham"; region="South Yorkshire"; tier=1; drive="around 55 minutes"; route="via the M1"; angle="a straight M1 run to proper retrofit specialists" }
  [pscustomobject]@{ slug="barnsley"; name="Barnsley"; region="South Yorkshire"; tier=1; drive="around 45 minutes"; route="via the M1"; angle="convenient specialist fitting just off the M1" }
  [pscustomobject]@{ slug="york"; name="York"; region="North Yorkshire"; tier=1; drive="around 50 minutes"; route="via the A64"; angle="an easy cross-county trip for dealer-level work" }
  [pscustomobject]@{ slug="harrogate"; name="Harrogate"; region="North Yorkshire"; tier=1; drive="around 30 minutes"; route="over the A59"; angle="half an hour from door to workshop" }
  [pscustomobject]@{ slug="skipton"; name="Skipton"; region="North Yorkshire"; tier=1; drive="around 20 minutes"; route="straight up the A65"; angle="practically on our doorstep - gateway to the Dales" }
  [pscustomobject]@{ slug="scarborough"; name="Scarborough"; region="North Yorkshire"; tier=2; drive="around 1 hour 40 minutes"; route="via the A64 coast route"; angle="coastal customers often make a day of it while we work" }
  [pscustomobject]@{ slug="hull"; name="Hull"; region="East Yorkshire"; tier=1; drive="around 1 hour 20 minutes"; route="straight down the M62"; angle="one motorway, end to end" }
  [pscustomobject]@{ slug="beverley"; name="Beverley"; region="East Yorkshire"; tier=2; drive="around 1 hour 25 minutes"; route="via the M62 and A63"; angle="specialist fitting worth travelling for" }
  [pscustomobject]@{ slug="bridlington"; name="Bridlington"; region="East Yorkshire"; tier=3; drive="around 1 hour 45 minutes"; route="via the A64 and A165"; angle="combine the trip with a day on the coast" }
  [pscustomobject]@{ slug="manchester"; name="Manchester"; region="Greater Manchester"; tier=1; drive="around 1 hour 10 minutes"; route="across the Pennines on the M62"; angle="premium retrofits without city-centre prices" }
  [pscustomobject]@{ slug="rochdale"; name="Rochdale"; region="Greater Manchester"; tier=2; drive="around 50 minutes"; route="via the M62"; angle="just over the county line on the M62" }
  [pscustomobject]@{ slug="burnley"; name="Burnley"; region="Lancashire"; tier=2; drive="around 45 minutes"; route="via the M65 and A629"; angle="closer to us than most Lancashire specialists" }
  [pscustomobject]@{ slug="preston"; name="Preston"; region="Lancashire"; tier=3; drive="around 1 hour 5 minutes"; route="via the M65 and M62"; angle="a worthwhile run for specialist coding work" }
  [pscustomobject]@{ slug="chesterfield"; name="Chesterfield"; region="Derbyshire"; tier=2; drive="around 1 hour 15 minutes"; route="via the M1"; angle="specialist retrofit work just up the M1" }
  [pscustomobject]@{ slug="keighley"; name="Keighley"; region="West Yorkshire"; tier=3; drive="around 10 minutes"; route="our neighbouring town"; angle="ten minutes away - you can practically walk home" }
  [pscustomobject]@{ slug="shipley"; name="Shipley"; region="West Yorkshire"; tier=3; drive="around 5 minutes"; route="next door to the workshop"; angle="our next-door neighbour" }
  [pscustomobject]@{ slug="ilkley"; name="Ilkley"; region="West Yorkshire"; tier=3; drive="around 15 minutes"; route="up the Wharfe valley"; angle="a short scenic drive down the valley" }
  [pscustomobject]@{ slug="otley"; name="Otley"; region="West Yorkshire"; tier=3; drive="around 20 minutes"; route="via the A6038"; angle="easy run along the valley road" }
  [pscustomobject]@{ slug="dewsbury"; name="Dewsbury"; region="West Yorkshire"; tier=3; drive="around 25 minutes"; route="via the A650"; angle="quick trip across West Yorkshire" }
  [pscustomobject]@{ slug="batley"; name="Batley"; region="West Yorkshire"; tier=3; drive="around 25 minutes"; route="via the A650"; angle="close enough for a same-day drop and collect" }
  [pscustomobject]@{ slug="pontefract"; name="Pontefract"; region="West Yorkshire"; tier=3; drive="around 40 minutes"; route="via the M62"; angle="straight off the M62" }
  [pscustomobject]@{ slug="castleford"; name="Castleford"; region="West Yorkshire"; tier=3; drive="around 35 minutes"; route="via the M62"; angle="handy for the Xscape junction" }
  [pscustomobject]@{ slug="morley"; name="Morley"; region="West Yorkshire"; tier=3; drive="around 30 minutes"; route="via the A650 and A657"; angle="between Leeds and us - an easy stop" }
  [pscustomobject]@{ slug="brighouse"; name="Brighouse"; region="West Yorkshire"; tier=3; drive="around 25 minutes"; route="via the A629"; angle="minutes from the M62 junction" }
  [pscustomobject]@{ slug="cleckheaton"; name="Cleckheaton"; region="West Yorkshire"; tier=3; drive="around 25 minutes"; route="via the A638"; angle="central West Yorkshire, easy to reach" }
  [pscustomobject]@{ slug="ossett"; name="Ossett"; region="West Yorkshire"; tier=3; drive="around 35 minutes"; route="via the M1 and M62"; angle="just off the motorway network" }
  [pscustomobject]@{ slug="elland"; name="Elland"; region="West Yorkshire"; tier=3; drive="around 25 minutes"; route="via the A629"; angle="right by the Calderdale corridor" }
  [pscustomobject]@{ slug="heckmondwike"; name="Heckmondwike"; region="West Yorkshire"; tier=3; drive="around 25 minutes"; route="via the A638"; angle="a short hop across the Spen valley" }
  [pscustomobject]@{ slug="stocksbridge"; name="Stocksbridge"; region="South Yorkshire"; tier=3; drive="around 50 minutes"; route="via the A616"; angle="over the moor road to specialist fitting" }
  [pscustomobject]@{ slug="chapeltown"; name="Chapeltown"; region="South Yorkshire"; tier=3; drive="around 55 minutes"; route="via the M1"; angle="just north of Sheffield off the M1" }
  [pscustomobject]@{ slug="wath-upon-dearne"; name="Wath-upon-Dearne"; region="South Yorkshire"; tier=3; drive="around 55 minutes"; route="via the M1"; angle="Dearne Valley customers are welcome" }
  [pscustomobject]@{ slug="mexborough"; name="Mexborough"; region="South Yorkshire"; tier=3; drive="around 1 hour"; route="via the M1 and A1(M)"; angle="between the M1 and A1 corridors" }
  [pscustomobject]@{ slug="penistone"; name="Penistone"; region="South Yorkshire"; tier=3; drive="around 45 minutes"; route="via the A629"; angle="over the hill from us, easy enough" }
  [pscustomobject]@{ slug="knaresborough"; name="Knaresborough"; region="North Yorkshire"; tier=3; drive="around 35 minutes"; route="via the A59"; angle="just past Harrogate on the A59" }
  [pscustomobject]@{ slug="ripon"; name="Ripon"; region="North Yorkshire"; tier=3; drive="around 45 minutes"; route="via the A61"; angle="cathedral city within easy reach" }
  [pscustomobject]@{ slug="selby"; name="Selby"; region="North Yorkshire"; tier=3; drive="around 50 minutes"; route="via the A63"; angle="convenient for the A63 corridor" }
  [pscustomobject]@{ slug="northallerton"; name="Northallerton"; region="North Yorkshire"; tier=3; drive="around 1 hour"; route="via the A1(M)"; angle="county town customers welcome" }
  [pscustomobject]@{ slug="thirsk"; name="Thirsk"; region="North Yorkshire"; tier=3; drive="around 55 minutes"; route="via the A1(M)"; angle="racecourse town, easy A1 trip" }
  [pscustomobject]@{ slug="malton"; name="Malton"; region="North Yorkshire"; tier=3; drive="around 1 hour 5 minutes"; route="via the A64"; angle="food capital of Yorkshire, worth the drive both ways" }
  [pscustomobject]@{ slug="whitby"; name="Whitby"; region="North Yorkshire"; tier=3; drive="around 1 hour 50 minutes"; route="via the A64 and A171"; angle="make a coast day of the workshop trip" }
  [pscustomobject]@{ slug="richmond"; name="Richmond"; region="North Yorkshire"; tier=3; drive="around 1 hour 10 minutes"; route="via the A1(M)"; angle="off the A1 at Scotch Corner" }
  [pscustomobject]@{ slug="tadcaster"; name="Tadcaster"; region="North Yorkshire"; tier=3; drive="around 45 minutes"; route="via the A64"; angle="brewing town on the York road" }
  [pscustomobject]@{ slug="boroughbridge"; name="Boroughbridge"; region="North Yorkshire"; tier=3; drive="around 50 minutes"; route="via the A1(M)"; angle="right on the A1 corridor" }
  [pscustomobject]@{ slug="pickering"; name="Pickering"; region="North Yorkshire"; tier=3; drive="around 1 hour 15 minutes"; route="via the A64"; angle="gateway to the moors, straightforward run" }
  [pscustomobject]@{ slug="driffield"; name="Driffield"; region="East Yorkshire"; tier=3; drive="around 1 hour 35 minutes"; route="via the A614"; angle="wolds town within reach of the workshop" }
  [pscustomobject]@{ slug="goole"; name="Goole"; region="East Yorkshire"; tier=3; drive="around 1 hour 5 minutes"; route="via the M62"; angle="port town right off the M62" }
  [pscustomobject]@{ slug="market-weighton"; name="Market Weighton"; region="East Yorkshire"; tier=3; drive="around 1 hour 20 minutes"; route="via the A614"; angle="halfway between York and Hull" }
  [pscustomobject]@{ slug="pocklington"; name="Pocklington"; region="East Yorkshire"; tier=3; drive="around 1 hour"; route="via the A1079"; angle="easy wolds-edge drive" }
  [pscustomobject]@{ slug="hessle"; name="Hessle"; region="East Yorkshire"; tier=3; drive="around 1 hour 25 minutes"; route="via the M62"; angle="by the bridge, straight off the motorway" }
  [pscustomobject]@{ slug="brough"; name="Brough"; region="East Yorkshire"; tier=3; drive="around 1 hour 20 minutes"; route="via the M62 and A63"; angle="along the Humber corridor" }
  [pscustomobject]@{ slug="howden"; name="Howden"; region="East Yorkshire"; tier=3; drive="around 1 hour"; route="via the M62"; angle="minutes from the M62 junction" }
  [pscustomobject]@{ slug="cottingham"; name="Cottingham"; region="East Yorkshire"; tier=3; drive="around 1 hour 25 minutes"; route="via the M62 and A63"; angle="village feel, city access" }
  [pscustomobject]@{ slug="oldham"; name="Oldham"; region="Greater Manchester"; tier=3; drive="around 55 minutes"; route="via the M62 and M60"; angle="just over the border" }
  [pscustomobject]@{ slug="ashton-under-lyne"; name="Ashton-under-Lyne"; region="Greater Manchester"; tier=3; drive="around 1 hour"; route="via the M62 and M60"; angle="Tameside customers welcome" }
  [pscustomobject]@{ slug="stockport"; name="Stockport"; region="Greater Manchester"; tier=3; drive="around 1 hour 20 minutes"; route="via the M62 and M60"; angle="South Manchester within reach" }
  [pscustomobject]@{ slug="bury"; name="Bury"; region="Greater Manchester"; tier=3; drive="around 1 hour 5 minutes"; route="via the M62 and M66"; angle="famous market, easy run" }
  [pscustomobject]@{ slug="nelson"; name="Nelson"; region="Lancashire"; tier=3; drive="around 40 minutes"; route="via the A6068 and A629"; angle="closer than you might think" }
  [pscustomobject]@{ slug="colne"; name="Colne"; region="Lancashire"; tier=3; drive="around 40 minutes"; route="via the A6068"; angle="end of the M65, easy to find us" }
  [pscustomobject]@{ slug="blackburn"; name="Blackburn"; region="Lancashire"; tier=3; drive="around 55 minutes"; route="via the M65 and A629"; angle="straight down the M65 corridor" }
  [pscustomobject]@{ slug="accrington"; name="Accrington"; region="Lancashire"; tier=3; drive="around 50 minutes"; route="via the A56 and A629"; angle="Hyndburn customers welcome" }
  [pscustomobject]@{ slug="dronfield"; name="Dronfield"; region="Derbyshire"; tier=3; drive="around 1 hour 10 minutes"; route="via the M1"; angle="between Sheffield and Chesterfield" }
  [pscustomobject]@{ slug="glossop"; name="Glossop"; region="Derbyshire"; tier=3; drive="around 1 hour 10 minutes"; route="via the M67 and M60"; angle="High Peak customers can reach us easily" }
  [pscustomobject]@{ slug="scunthorpe"; name="Scunthorpe"; region="Lincolnshire"; tier=3; drive="around 1 hour 20 minutes"; route="via the M62 and M180"; angle="straight along the motorway network" }
  [pscustomobject]@{ slug="gainsborough"; name="Gainsborough"; region="Lincolnshire"; tier=3; drive="around 1 hour 20 minutes"; route="via the A1(M) and A631"; angle="Trent-side town, easy run" }
  [pscustomobject]@{ slug="worksop"; name="Worksop"; region="Nottinghamshire"; tier=3; drive="around 1 hour 15 minutes"; route="via the M1 and A57"; angle="edge of Sherwood, welcome" }
  [pscustomobject]@{ slug="retford"; name="Retford"; region="Nottinghamshire"; tier=3; drive="around 1 hour 15 minutes"; route="via the A1(M)"; angle="right off the A1" }
)

# ============================ SERVICE-LOCATION MATRIX ============================
# Which locations each service gets a page for (tier-1 set first, then a few tier-2).
$matrix = @{
  "carplay-installation"        = @("leeds","sheffield","bradford","york","hull","manchester","harrogate","huddersfield","doncaster","wakefield","halifax","barnsley","rotherham","skipton","keighley")
  "ambient-lighting"            = @("leeds","bradford","huddersfield","sheffield","york","wakefield","doncaster","halifax","harrogate","manchester","hull","barnsley","rotherham","keighley","ilkley")
  "starlight-headlining"        = @("leeds","sheffield","manchester","york","bradford","hull","harrogate","huddersfield","wakefield","doncaster","halifax","barnsley","rotherham","keighley","ilkley")
  "reverse-camera-installation" = @("bradford","leeds","halifax","wakefield","barnsley","skipton","rotherham","harrogate","huddersfield","sheffield","york","doncaster","hull","keighley")
  "dashcam-installation"        = @("leeds","bradford","sheffield","york","hull","huddersfield","doncaster","wakefield","halifax","barnsley","rotherham","harrogate","skipton","keighley")
  "steering-wheel-upgrade"      = @("leeds","manchester","sheffield","york","harrogate","bradford","hull","huddersfield","wakefield","doncaster","halifax","barnsley","rotherham","keighley")
  "virtual-cockpit"             = @("leeds","sheffield","manchester","york","bradford","harrogate","chesterfield","huddersfield","wakefield","halifax","doncaster","hull","rotherham","keighley")
  "coding-and-retrofits"        = @("bradford","leeds","huddersfield","halifax","wakefield","sheffield","skipton","manchester","york","harrogate","doncaster","barnsley","rotherham","hull","keighley","ilkley")
}

# ============================ TEMPLATE ============================
$template = @'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{TITLE}} | Yorkshire Autotech</title>
  <meta name="description" content="{{META}}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="https://yorkshireautotech.co.uk/services/{{SERVICE_SLUG}}/{{LOCATION_SLUG}}/">
  <meta name="geo.region" content="GB-ENG">
  <meta name="geo.placename" content="Bingley, West Yorkshire">
  <meta name="geo.position" content="53.8462;-1.8386">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Yorkshire Autotech">
  <meta property="og:title" content="{{TITLE}} | Yorkshire Autotech">
  <meta property="og:description" content="{{META}}">
  <meta property="og:url" content="https://yorkshireautotech.co.uk/services/{{SERVICE_SLUG}}/{{LOCATION_SLUG}}/">
  <meta property="og:image" content="https://yorkshireautotech.co.uk/hero-image.jpg">
  <meta property="og:locale" content="en_GB">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{TITLE}} | Yorkshire Autotech">
  <meta name="twitter:description" content="{{META}}">
  <meta name="twitter:image" content="https://yorkshireautotech.co.uk/hero-image.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{{BASE}}/css/style.css">
  <link rel="icon" type="image/png" href="{{BASE}}/logo-640.png">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "{{SERVICE_NAME}} in {{LOCATION_NAME}}",
    "serviceType": "{{SERVICE_NAME}}",
    "description": "{{META}}",
    "provider": {
      "@type": "AutoRepair",
      "@id": "https://yorkshireautotech.co.uk/#business",
      "name": "Yorkshire Autotech",
      "url": "https://yorkshireautotech.co.uk/",
      "image": "https://yorkshireautotech.co.uk/hero-image.jpg",
      "address": { "@type": "PostalAddress", "streetAddress": "Canal Road", "addressLocality": "Bingley", "addressRegion": "West Yorkshire", "postalCode": "BD16 2SR", "addressCountry": "GB" },
      "geo": { "@type": "GeoCoordinates", "latitude": 53.8462, "longitude": -1.8386 },
      "telephone": "+44 7476 173159"
    },
    "areaServed": { "@type": "City", "name": "{{LOCATION_NAME}}", "containedInPlace": { "@type": "AdministrativeArea", "name": "{{REGION}}" } },
    "url": "https://yorkshireautotech.co.uk/services/{{SERVICE_SLUG}}/{{LOCATION_SLUG}}/"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://yorkshireautotech.co.uk/" },
      { "@type": "ListItem", "position": 2, "name": "Areas We Cover", "item": "https://yorkshireautotech.co.uk/areas/" },
      { "@type": "ListItem", "position": 3, "name": "{{SERVICE_NAME}} in {{LOCATION_NAME}}", "item": "https://yorkshireautotech.co.uk/services/{{SERVICE_SLUG}}/{{LOCATION_SLUG}}/" }
    ]
  }
  </script>
</head>
<body>

  <header class="site-header scrolled" id="siteHeader">
    <nav class="nav container">
      <a href="{{BASE}}/index.html" class="logo">
        <img src="{{BASE}}/logo-640.png" alt="Yorkshire Autotech">
        <span class="logo-text">Yorkshire <span class="gold-text">Autotech</span><span class="logo-sub">Auto Electrics</span></span>
      </a>
      <ul class="nav-links" id="navLinks">
        <li><a href="{{BASE}}/index.html">Home</a></li>
        <li><a href="{{BASE}}/index.html#services">Services</a></li>
        <li><a href="{{BASE}}/gallery.html">Gallery</a></li>
        <li><a href="{{BASE}}/areas/">Areas We Cover</a></li>
        <li><a href="{{BASE}}/index.html#contact">Contact</a></li>
      </ul>
      <div class="nav-actions">
        <a href="{{BASE}}/index.html#contact" class="btn btn-gold btn-sm nav-cta">Book Now</a>
        <button class="nav-toggle" id="navToggle" aria-label="Menu">&#9776;</button>
      </div>
    </nav>
  </header>

  <section class="page-hero">
    <div class="container">
      <span class="eyebrow">{{LOCATION_NAME}}, {{REGION}}</span>
      <h1>{{SERVICE_NAME}}<br><span class="gold-text">in {{LOCATION_NAME}}</span></h1>
      <p>{{SERVICE_DESC}}</p>
      <div class="hero-cta" style="margin-top:30px">
        <a href="{{BASE}}/index.html#contact" class="btn btn-gold">Book a Workshop Slot</a>
        <a href="{{BASE}}/areas/" class="btn btn-outline">All Areas We Cover</a>
      </div>
    </div>
  </section>

  <section class="section" style="padding-top:70px">
    <div class="container">
      <div class="contact-grid" style="align-items:start">
        <div class="contact-info">
          <span class="eyebrow">How It Works</span>
          <h3>Getting To Us From {{LOCATION_NAME}}</h3>
          <p>Yorkshire Autotech is a single specialist workshop based on Canal Road in Bingley, West Yorkshire (BD16 2SR) - {{DRIVE}} from {{LOCATION_NAME}}, {{ROUTE}}. {{MOBILE_NOTE}}</p>
          <div class="contact-detail"><span class="cd-icon">&#128205;</span><div><strong>Workshop</strong><span>Canal Road, Bingley, BD16 2SR</span></div></div>
          <div class="contact-detail"><span class="cd-icon">&#128337;</span><div><strong>Typical journey</strong><span>{{DRIVE}} from {{LOCATION_NAME}}</span></div></div>
          <div class="contact-detail"><span class="cd-icon">&#128172;</span><div><strong>Book first</strong><span>Slots are booked in advance - no drop-in queue</span></div></div>
        </div>
        <div class="form" style="padding:34px">
          <h3 style="margin-bottom:16px">What's Included</h3>
          <ul style="display:grid;gap:12px;margin-bottom:26px">
            {{INCLUDES}}
          </ul>
          <p style="font-size:0.9rem;color:var(--text-muted)">{{COMPAT_NOTE}}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section section-dark" style="padding:70px 0">
    <div class="container">
      <div class="section-head" style="margin-bottom:36px">
        <span class="eyebrow">Why Travel To Us</span>
        <h2>Worth The Trip From <span class="gold-text">{{LOCATION_NAME}}</span></h2>
      </div>
      <div class="why-grid">
        <div class="why-item"><div class="why-icon">&#128736;&#65039;</div><h3>Specialists, Not Generalists</h3><p>{{SERVICE_LOWER}} is the kind of work most garages in {{LOCATION_NAME}} will not take on - it is all we do.</p></div>
        <div class="why-item"><div class="why-icon">&#128183;</div><h3>Honest Pricing</h3><p>Fixed quotes before any work starts. No surprises on collection day.</p></div>
        <div class="why-item"><div class="why-icon">&#128737;&#65039;</div><h3>6-Month Warranty</h3><p>All workmanship at our workshop is covered for six months, minimum.</p></div>
        <div class="why-item"><div class="why-icon">&#128248;</div><h3>See Our Work</h3><p>Real installs, photographed at our workshop - browse the <a href="{{BASE}}/gallery.html" style="color:var(--gold);text-decoration:underline">gallery</a> before you book.</p></div>
      </div>
      <p style="text-align:center;color:var(--text-muted);max-width:640px;margin:34px auto 0;font-size:0.92rem">{{ANGLE_TEXT}}</p>
    </div>
  </section>

  <section class="cta-banner">
    <div class="container">
      <h2>Book {{SERVICE_NAME}} Near {{LOCATION_NAME}}</h2>
      <p>Tell us your vehicle and we'll confirm compatibility and give you a fixed quote - then pick a workshop slot that suits you.</p>
      <a href="{{BASE}}/index.html#contact" class="btn">Get A Free Quote</a>
    </div>
  </section>

  <section class="section" style="padding:60px 0">
    <div class="container" style="text-align:center">
      <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:14px">We also provide {{SERVICE_LOWER}} for customers in:</p>
      <p style="display:flex;flex-wrap:wrap;gap:10px 22px;justify-content:center">{{OTHER_LINKS}}</p>
    </div>
  </section>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="{{BASE}}/index.html" class="logo"><img src="{{BASE}}/logo-640.png" alt="Yorkshire Autotech"><span class="logo-text">Yorkshire <span class="gold-text">Autotech</span><span class="logo-sub">Auto Electrics</span></span></a>
          <p class="footer-about">Premium auto electrical specialists based in Bingley, West Yorkshire - serving customers across Yorkshire and beyond.</p>
        </div>
        <div>
          <h4>Services</h4>
          <ul>
            <li><a href="{{BASE}}/services/coding-and-retrofits/bradford/">Coding &amp; Retrofits</a></li>
            <li><a href="{{BASE}}/services/ambient-lighting/leeds/">Ambient Lighting</a></li>
            <li><a href="{{BASE}}/services/carplay-installation/leeds/">CarPlay &amp; Android Auto</a></li>
            <li><a href="{{BASE}}/services/starlight-headlining/leeds/">Starlight Headlining</a></li>
            <li><a href="{{BASE}}/services/virtual-cockpit/leeds/">Virtual Cockpits</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="{{BASE}}/areas/">Areas We Cover</a></li>
            <li><a href="{{BASE}}/gallery.html">Gallery</a></li>
            <li><a href="{{BASE}}/index.html#contact">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="https://wa.me/447476173159">07476 173 159 (WhatsApp)</a></li>
            <li><a href="mailto:bookings@yorkshireautotech.co.uk">bookings@yorkshireautotech.co.uk</a></li>
            <li><a href="https://www.google.com/maps/search/?api=1&query=Canal+Road+Bingley+BD16+2SR">Find The Workshop</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">&copy; {{YEAR}} Yorkshire Autotech. All rights reserved.</div>
    </div>
  </footer>

  <script src="{{BASE}}/js/main.js"></script>
</body>
</html>
'@

# ============================ BUILD ============================
$locBySlug = @{}
foreach ($l in $locations) { $locBySlug[$l.slug] = $l }

$planRows = New-Object System.Collections.Generic.List[object]
$areaLinks = @{}
$built = 0

foreach ($svc in $services) {
  $slugs = $matrix[$svc.slug]
  $areaLinks[$svc.slug] = New-Object System.Collections.Generic.List[string]

  foreach ($slug in $slugs) {
    $loc = $locBySlug[$slug]
    if (-not $loc) { Write-Warning "Unknown location slug: $slug"; continue }

    $url = "/services/$($svc.slug)/$($loc.slug)/"
    $title = "$($svc.name) in $($loc.name)"
    $meta = "$($svc.kw) in $($loc.name), $($loc.region). Dealer-level work at our Bingley workshop - $($loc.drive) away. Fixed quotes, 6-month warranty."

    $includes = ($svc.includes | ForEach-Object { "<li style='font-size:0.95rem'><span style='color:var(--gold);margin-right:8px'>&#9670;</span>$_</li>" }) -join "`n            "

    $compatNote = if ($svc.compat) {
      "Compatibility depends on your exact vehicle and head unit - tell us the make, model and year when you enquire and we'll confirm what's possible before you travel."
    } else {
      "Suitable for almost all vehicles. Tell us your make, model and year when you enquire and we'll confirm the best kit for your car."
    }

    $angleText = "For drivers in $($loc.name), this is the way to $($svc.angle). Customers travel to us from across $($loc.region) because this level of specialist work is not available at a typical local garage - and with us being $($loc.drive) away ($($loc.route)), it is a simple trip with a booked slot."

    $mobileNote = if ($svc.mobile) {
      "We also offer mobile fitting for this service across the area - our team can come to you in or around $($loc.name), or you can book into the workshop, whichever suits you."
    } else {
      "This particular service is workshop-only - it needs our specialist equipment on site, so every job is done at our own fully insured workshop."
    }

    $others = $slugs | Where-Object { $_ -ne $loc.slug } | Select-Object -First 6
    $otherLinks = ($others | ForEach-Object {
      $o = $locBySlug[$_]
      "<a href='{{BASE}}/services/$($svc.slug)/$($o.slug)/' style='color:var(--gold);font-size:0.9rem;text-decoration:none'>$($o.name)</a>"
    }) -join "`n      "

    $html = $template
    $html = $html.Replace("{{TITLE}}", $title)
    $html = $html.Replace("{{META}}", $meta)
    $html = $html.Replace("{{SERVICE_SLUG}}", $svc.slug)
    $html = $html.Replace("{{LOCATION_SLUG}}", $loc.slug)
    $html = $html.Replace("{{SERVICE_NAME}}", $svc.name)
    $html = $html.Replace("{{LOCATION_NAME}}", $loc.name)
    $html = $html.Replace("{{REGION}}", $loc.region)
    $html = $html.Replace("{{SERVICE_DESC}}", $svc.desc)
    $html = $html.Replace("{{DRIVE}}", $loc.drive)
    $html = $html.Replace("{{ROUTE}}", $loc.route)
    $html = $html.Replace("{{MOBILE_NOTE}}", $mobileNote)
    $html = $html.Replace("{{INCLUDES}}", $includes)
    $html = $html.Replace("{{COMPAT_NOTE}}", $compatNote)
    $html = $html.Replace("{{ANGLE_TEXT}}", $angleText)
    $html = $html.Replace("{{OTHER_LINKS}}", $otherLinks)
    $html = $html.Replace("{{YEAR}}", (Get-Date).Year.ToString())
    $html = $html.Replace("{{SERVICE_LOWER}}", $svc.name.ToLower())
    $html = $html.Replace("{{BASE}}", "../../..")

    $outDir = Join-Path $root "services\$($svc.slug)\$($loc.slug)"
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    Write-SeoPage (Join-Path $outDir "index.html") $html
    $built++

    $areaLinks[$svc.slug].Add("<a href='..$url' style='color:var(--gold);text-decoration:none'>$($loc.name)</a>")

    $planRows.Add([pscustomobject]@{
      Service = $svc.name
      Location = $loc.name
      "County/Region" = $loc.region
      "Primary Keyword" = "$($svc.kw) $($loc.name.ToLower())"
      "Secondary Keywords" = (($svc.skw | ForEach-Object { "$_ $($loc.name.ToLower())" }) -join "; ")
      "Proposed URL" = $url
      "Availability" = $(if ($svc.mobile) { "Workshop (Bingley) or mobile fitting in this area" } else { "Workshop appointment (Bingley) - workshop only" })
      "Priority Tier" = $loc.tier
      "Existing Page Overlap" = "None - new page"
      "Unique Content Angle" = $angleText
      "Publication Status" = "Published"
    })
  }
}

# Log tier-3 locations as planned (not built)
$usedSlugs = @{}
foreach ($k in $matrix.Keys) { foreach ($s in $matrix[$k]) { $usedSlugs[$s] = $true } }
foreach ($loc in $locations) {
  if (-not $usedSlugs.ContainsKey($loc.slug)) {
    $planRows.Add([pscustomobject]@{
      Service = "(unassigned)"
      Location = $loc.name
      "County/Region" = $loc.region
      "Primary Keyword" = ""
      "Secondary Keywords" = ""
      "Proposed URL" = ""
      "Availability" = "Workshop appointment (Bingley)"
      "Priority Tier" = $loc.tier
      "Existing Page Overlap" = "n/a"
      "Unique Content Angle" = $loc.angle
      "Publication Status" = "Planned - not built"
    })
  }
}

$planPath = Join-Path $PSScriptRoot "seo-plan.csv"
$planRows | Export-Csv -Path $planPath -NoTypeInformation -Encoding UTF8

# ============================ AREAS HUB ============================
$hubSections = ($services | ForEach-Object {
  $svc = $_
  $links = $areaLinks[$svc.slug] -join "`n              "
  @"
          <div class="form" style="padding:28px;margin-bottom:22px">
            <h3 style="margin-bottom:6px">$($svc.icon) $($svc.name)</h3>
            <p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:14px">Workshop fitting at our Bingley workshop for customers in:</p>
            <p style="display:flex;flex-wrap:wrap;gap:8px 18px">
              $links
            </p>
          </div>
"@
}) -join "`n"

$hub = @'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Areas We Cover | Yorkshire Autotech</title>
  <meta name="description" content="Yorkshire Autotech serves customers across Yorkshire and beyond from our Bingley workshop - Leeds, Bradford, Sheffield, York, Hull, Manchester and more.">
  <link rel="canonical" href="https://yorkshireautotech.co.uk/areas/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{{BASE}}/css/style.css">
  <link rel="icon" type="image/png" href="{{BASE}}/logo-640.png">
</head>
<body>
  <header class="site-header scrolled">
    <nav class="nav container">
      <a href="{{BASE}}/index.html" class="logo"><img src="{{BASE}}/logo-640.png" alt="Yorkshire Autotech"><span class="logo-text">Yorkshire <span class="gold-text">Autotech</span><span class="logo-sub">Auto Electrics</span></span></a>
      <ul class="nav-links">
        <li><a href="{{BASE}}/index.html">Home</a></li>
        <li><a href="{{BASE}}/index.html#services">Services</a></li>
        <li><a href="{{BASE}}/gallery.html">Gallery</a></li>
        <li><a href="{{BASE}}/areas/" class="active">Areas We Cover</a></li>
        <li><a href="{{BASE}}/index.html#contact">Contact</a></li>
      </ul>
      <div class="nav-actions">
        <a href="{{BASE}}/index.html#contact" class="btn btn-gold btn-sm nav-cta">Book Now</a>
      </div>
    </nav>
  </header>

  <section class="page-hero">
    <div class="container">
      <span class="eyebrow">Where We Work</span>
      <h1>Areas We <span class="gold-text">Cover</span></h1>
      <p>One specialist workshop on Canal Road, Bingley - customers travel to us from across Yorkshire and the surrounding counties. Pick your service to see your area.</p>
    </div>
  </section>

  <section class="container" style="padding-bottom:100px">
{{HUB_SECTIONS}}
  </section>

  <section class="cta-banner">
    <div class="container">
      <h2>Your Area Not Listed?</h2>
      <p>If you can get to Bingley, we can help. Get in touch with your vehicle details and location and we'll confirm.</p>
      <a href="{{BASE}}/index.html#contact" class="btn">Ask The Team</a>
    </div>
  </section>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-bottom">&copy; {{YEAR}} Yorkshire Autotech. All rights reserved.</div>
    </div>
  </footer>
</body>
</html>
'@
$hub = $hub.Replace("{{HUB_SECTIONS}}", $hubSections).Replace("{{YEAR}}", (Get-Date).Year.ToString()).Replace("{{BASE}}", "..")
$areasDir = Join-Path $root "areas"
New-Item -ItemType Directory -Force -Path $areasDir | Out-Null
Write-SeoPage (Join-Path $areasDir "index.html") $hub

# ============================ SITEMAP + ROBOTS ============================
# Search engines discover the location pages via sitemap.xml - no customer-facing links needed.
$today = Get-Date -Format "yyyy-MM-dd"
$site = "https://yorkshireautotech.co.uk"

$sitemapUrls = New-Object System.Collections.Generic.List[string]
# Main pages
$sitemapUrls.Add("  <url><loc>$site/</loc><lastmod>$today</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>")
$sitemapUrls.Add("  <url><loc>$site/gallery.html</loc><lastmod>$today</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>")
# Areas hub + all location pages
$sitemapUrls.Add("  <url><loc>$site/areas/</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>")
foreach ($svc in $services) {
  foreach ($slug in $matrix[$svc.slug]) {
    $sitemapUrls.Add("  <url><loc>$site/services/$($svc.slug)/$slug/</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>")
  }
}

$sitemap = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
$($sitemapUrls -join "`n")
</urlset>
"@
[IO.File]::WriteAllText((Join-Path $root "sitemap.xml"), $sitemap, (New-Object System.Text.UTF8Encoding $false))

$robots = @"
User-agent: *
Allow: /
Disallow: /admin.html

Sitemap: $site/sitemap.xml
"@
[IO.File]::WriteAllText((Join-Path $root "robots.txt"), $robots, (New-Object System.Text.UTF8Encoding $false))

Write-Output "Built $built location pages"
Write-Output "Planning matrix: $planPath"
Write-Output "Areas hub: $areasDir\index.html"
Write-Output "Sitemap: $root\sitemap.xml ($($sitemapUrls.Count) URLs)"
Write-Output "Robots: $root\robots.txt"
