export type UAResult = {
  browser: string;
  os: string;
  device: "desktop" | "mobile" | "tablet";
};

export function parseUA(ua: string): UAResult {
  const s = ua ?? "";

  // Device — tablet before mobile (iPad UA contains "Mobile" on modern iOS)
  let device: UAResult["device"] = "desktop";
  if (/(ipad|tablet|playbook|silk)|(android(?!.*mobi))/i.test(s)) {
    device = "tablet";
  } else if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      s
    )
  ) {
    device = "mobile";
  }

  // Browser
  let browser = "Other";
  if (/Edg\/|EdgA\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera\//.test(s)) browser = "Opera";
  else if (/SamsungBrowser/.test(s)) browser = "Samsung";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Chrome\//.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s)) browser = "Safari";
  else if (/MSIE |Trident\//.test(s)) browser = "IE";

  // OS
  let os = "Other";
  if (/Windows NT/.test(s)) os = "Windows";
  else if (/Mac OS X|macOS/.test(s)) os = "macOS";
  else if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(s)) os = "iOS";
  else if (/Linux/.test(s)) os = "Linux";
  else if (/CrOS/.test(s)) os = "ChromeOS";

  return { browser, os, device };
}
