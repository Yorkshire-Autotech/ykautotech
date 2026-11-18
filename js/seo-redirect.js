const serviceMatch = window.location.pathname.match(/^\/services\/([^/]+)\//);
if (serviceMatch) {
  window.location.replace(new URL(`/services/${serviceMatch[1]}/`, window.location.origin).href);
}
