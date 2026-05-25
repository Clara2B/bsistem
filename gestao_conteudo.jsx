import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users, Building2, FileText, Video, Calendar, CalendarDays,
  Plus, X, Trash2, Edit3, Download, ExternalLink, Upload,
  CheckCircle2, Circle, Clock, AlertCircle, Search,
  ChevronLeft, ChevronRight, MoreVertical, Filter, Image as ImageIcon,
  Sparkles, FileUp, Link as LinkIcon, Pencil, Check, Menu, ZoomIn
} from 'lucide-react';

/* ============================================================
   FONT INJECTION (DM Sans + JetBrains Mono via Google Fonts)
============================================================ */
function useFontInjection() {
  useEffect(() => {
    const id = 'app-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap';
    document.head.appendChild(link);
  }, []);
}

/* ============================================================
   DESIGN TOKENS — B.BOTH palette
============================================================ */
const COLORS = {
  // Surface scale (deep black → raised neutrals)
  inkDeep:       '#050608',  // app background
  inkBase:       '#0b0d11',  // sidebar / header
  inkRaised:     '#11141a',  // cards
  inkSoft:       '#161a22',  // hover surfaces
  inkBorder:     '#222732',  // primary borders
  inkBorderSoft: '#181c25',  // hairline borders
  inkHover:      '#1d222c',
  // Text scale
  mist:          '#e8ebf0',  // primary text
  mistDim:       '#8a93a3',  // secondary text
  mistMuted:     '#525a6b',  // tertiary / micro
  // Brand colors (B.BOTH gradient, sampled from logo)
  brandBlue:     '#0166fc',  // bright blue, left of gradient
  brandCyan:     '#1de4f0',  // cyan, right of gradient
  brandMid:      '#009bed',  // midpoint
  brandSoft:     'rgba(1, 102, 252, 0.10)',
  brandGlow:     'rgba(1, 102, 252, 0.22)',
  cyanSoft:      'rgba(29, 228, 240, 0.10)',
  // Status
  danger:        '#ef6464',
  warn:          '#f5b342',
  success:       '#1de4f0',
};

const BRAND_GRADIENT = 'linear-gradient(135deg, #0166fc 0%, #009bed 50%, #1de4f0 100%)';
const BRAND_GRADIENT_HORIZONTAL = 'linear-gradient(90deg, #0166fc 0%, #009bed 50%, #1de4f0 100%)';

/* ============================================================
   INITIAL DATA
============================================================ */
const INITIAL_DIRECTORS = [
  { id: 'walter', name: 'Walter', type: 'director' },
  { id: 'rogerio', name: 'Rogério', type: 'director' },
  { id: 'rodrigo', name: 'Rodrigo', type: 'director' },
  { id: 'reinaldo', name: 'Reinaldo', type: 'director' },
  { id: 'rudi', name: 'Rudi', type: 'director' },
  { id: 'joao-vitor', name: 'João Vitor', type: 'director' },
  { id: 'vitinho', name: 'Vitinho', type: 'director' },
];
const INITIAL_GROUP = { id: 'uop', name: 'UOP Partners', type: 'group' };
const INITIAL_COMPANIES = [
  { id: 'elite', name: 'Elite', type: 'company' },
  { id: 'nexus', name: 'Nexus', type: 'company' },
  { id: 'sw', name: 'SW', type: 'company' },
  { id: 'renova', name: 'ReNova', type: 'company' },
];

const DAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/* ============================================================
   POSTING SCHEDULE RULES
   - Directors / Group: Estáticos seg-sáb (1-6), Reels seg/qua/sáb (1,3,6)
   - Companies: Estáticos seg/ter/qui/sex (1,2,4,5), Reels qua/sáb (3,6)
============================================================ */
function getScheduleRules(entityType) {
  if (entityType === 'director' || entityType === 'group') {
    return { estatico: [1, 2, 3, 4, 5, 6], reels: [1, 3, 6] };
  }
  return { estatico: [1, 2, 4, 5], reels: [3, 6] };
}

/* ============================================================
   STORAGE HELPERS (wrap window.storage with safe fallbacks)
============================================================ */
const storage = {
  async get(key) {
    try {
      const r = await window.storage.get(key);
      return r ? r.value : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      const v = typeof value === 'string' ? value : JSON.stringify(value);
      await window.storage.set(key, v);
      return true;
    } catch (e) {
      console.error('storage.set error', e);
      return false;
    }
  },
  async delete(key) {
    try { await window.storage.delete(key); return true; } catch { return false; }
  },
  async getJSON(key, fallback) {
    const v = await this.get(key);
    if (!v) return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  },
};

const K = {
  entities: 'app:entities:v1',
  roteiros: (eid) => `entity:${eid}:roteiros`,
  estaticos: (eid) => `entity:${eid}:estaticos`,
  videos: (eid) => `entity:${eid}:videos`,
  events: (eid) => `entity:${eid}:events`,
  pdf: (fid) => `pdf:${fid}`,
  thumb: (fid) => `thumb:${fid}`,
  image: (fid) => `image:${fid}`,
};

/* ============================================================
   FILE HELPERS
============================================================ */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function downloadBase64(base64, filename) {
  const a = document.createElement('a');
  a.href = base64;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function uid() { return Math.random().toString(36).slice(2, 10); }

// Extrai o FILE_ID de qualquer formato de link do Google Drive
// e devolve a URL direta de download (ou null se não for Drive).
function getDriveDownloadUrl(url) {
  if (!url) return null;
  try {
    // /file/d/FILE_ID/view  ou  /file/d/FILE_ID/preview
    const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return `https://drive.usercontent.google.com/download?id=${m1[1]}&export=download&authuser=0`;
    // ?id=FILE_ID  ou  &id=FILE_ID  (ex: /open?id=... ou /uc?id=...)
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) return `https://drive.usercontent.google.com/download?id=${m2[1]}&export=download&authuser=0`;
  } catch (_) {}
  return null;
}

// Faz parse de 'YYYY-MM-DD' (ou ISO string legada) como horário LOCAL,
// evitando o bug de fuso que faz o dia aparecer como D-1.
function parseLocalDate(str) {
  if (!str) return null;
  const part = str.slice(0, 10); // funciona com 'YYYY-MM-DD' e ISO strings
  const [y, m, d] = part.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function slugify(s) {
  return s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

// Google OAuth \u2014 apenas o Client ID \u00e9 necess\u00e1rio no front-end (nunca o secret)
const GOOGLE_CLIENT_ID = '471913353362-frk03uce1asebbn2vtitvaroicpqrn89.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

/* ============================================================
   GLOBAL CSS (injected once)
============================================================ */
/* === EMBEDDED SEED DATA (compressed JPEG base64) === */
const SEED_IMAGES = {
  'reinaldo_1': 'data:image/jpeg;base64,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',
  'rogerio_1': 'data:image/jpeg;base64,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',
  'rudi_1': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAcFBQYFBAcGBgYIBwcICxILCwoKCxYPEA0SGhYbGhkWGRgcICgiHB4mHhgZIzAkJiorLS4tGyIyNTEsNSgsLSz/2wBDAQcICAsJCxULCxUsHRkdLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCz/wAARCAKjAhwDASIAAhEBAxEB/8QAHAAAAgIDAQEAAAAAAAAAAAAAAQIAAwUGBwQI/8QAXRAAAQMCBAIGAwsFCwgJBAIDAQACAwQRBQYhMRJBBxMiUWFxFDKBCDdCUnN0kaGxs8EVI3Ky0RYXGDM1NmKSk5TSJCdDVFWCouEmNERGU1ZjwvAlRWTiZXWDhPH/xAAaAQADAQEBAQAAAAAAAAAAAAAAAQIDBAUG/8QAOBEAAgIBAwEGAwYGAgIDAAAAAAECEQMEEiExBRMiQVFxgbHBFCMyM2GhFUKR0eHwNDVS8SRDU//aAAwDAQACEQMRAD8A41fVQlC+qi889IDt0qZ3gk5JoTHGyPNBgKbmkMDtko3TO2SjdAgE6+KCOnNDmqEM02CjlAodkhiHVqXZWO2SHdMTAh7VChzTEFFC+qKABzURGqCAEPcgN0TugNymIYKKBRIYFOallOaZJOaKU3unsgAHZHkEbIkdlIoQqIkaKW2QIFkQESi1pJsNSUDFOyQ7qxwSblMTFATBS1lBdAglKUyU7pDFKg3UKg3TEFCyY7IXQgEsgmQVEkCKmyiQ0RK5MlcgTFuoVLKEc0xBvohzUCOxQBCENk3JBAyckp2Tckp2SQMI2RCA2RQCB8JTmpzUQACg7ZMUDsmIrtYplLIp2BXHu7zXoaeyvOw9t48VcL20UyKiZImxUOiB3UOtlmahOyQJ7aJQNUAMxNzQYifWSGBwQRKnJAFdrotRt3Jdb3VCGG6LtkGouSAU7JOac7JDumJgNkp0KYpd0xEG6bdKE1u5AEAQ5pgpzQMrSt3TkboBMkg3TWQG6eyQxLKWR5qIECyNl6qOkNRxvN+CMa+JOwXoGGGOZhlu2N3IauStDoqpaJ0zHvcLMsQHeK9EOC1UkInfG5lMWk9YbAISyvjnbC1zWRtb6vDZ3EvPVYq0tcyGR4abFwJ4hfwRTY9yRHUMnW8DQHnlw8074aeENpTGZqyTTR1hF+0pKSsljgD39twJN+K1xyKxTmzxTmZ7nB0g0PnzVqDfUiU15GVOHTtk4HNAN+RuvfUUWGwUvDDK6SbTie/ThPOwH4rDDF5WRBjYg57iGtcd7DdY0zPZqH3cT3prG31E8iXQzrWUXorbSte5x4ib2sPJCSlpjKxrJwwv1Adt9KwrQzgdeQlzhqQOarLy1zSToNrnZV3f6kd7+hlZqd0TyAC5ovqPBVDdenDKiOojeJJGsaw8Ty51hY9y9MM2GNkAdwOLz6pdYD2rJprg1TT5MdZKQvVUxcL3OaBwk6WN15z4IGIRzShMdlALpiClT21SkaoAQqFEhS2iZIFEVLIABSuT2SlJAxeSGtkx2SqiSDdHmgN03NAB5IWRUSKFKUp7XCBQhMA3RQaNUSgEDmUOSPNQJgDkoNQodQUoOiBBtruooEUAVs/jHq4GwVTdJnBWFJlRMg5Qo21QI1WZqMNkDuiBogTYoALN0x3ulZumO6ljQHboHQIuOqUnRMAX0QtooBpdTVMQWlM7kgBoi5IAfBSHdPySO2VAKdkoTHZABMlg2ThLZO3XRAIgGqnNECxUO6QxCNUisO6rO6YiDdWKsbq3kgADdeqmozUXaG8RtoQdjfn3p8PpWz1AfIPzUZDn3PJe2TH46Oq6uKBjbXcJGi1xyU8vhD4XLPBXQuoI6eMyB350PljYTcDYEpZ8Tr+oaeEsdx2DWtsfBePFK6WedtX1jxPYXNrW/avLT1VXUTl7pnOJPaeRcjx81socWzFz5pHtma8nimm6u7ibu1JPs+1Y+oLY2iNkwMQ7RPMlV1s4ILWFxA0uTdLRwumFuItJ9XxPctIqlZlKVuhTV8b2m/A0GwO5AXo9JdM8NL78RtfZCow40xAfGbkd9x9IXiJa14A1bfcc1aSZLtdT2Vrnh44G8IGxbyXh47vBKsc9jzcCxHK6MgY4DQAjYAWuhITdkZUNiDrAlx0Hkq3yPl0soQeA227krH21IuE6FZbDxBnaIAva3NWuaHWF/VC8rnXcSL2TNJaQTqD4ooLM3T4qyNrWPY1zCACXbheuYRTRtNM1p01sblauXOJIBPDdeugr5KV/Z1vyKxlj80bRyvozJvY5juFwseYSjdMZTO4v5k7dyUnVZG4xSlMdkp2SBgKHmpzU5qiSWUUCNkhkSEJylKAESpylVEAA1TIc0UDCN0EeahUjIEp3TDZApgBuhU5oc0SgSId0vNTmpzQBEuxTpbapiCAjZRRIYjbCoN+5WHdV/wDaB5K3RDGjIFKXXKYhKBdyzNhh6qDt0fJB6QgtOqc6qobq7kkykId0HDRM5A7JiEA0RIRaLqEWO6BEag7dMN0rhqgCHZB2ybklOyYCHZAO1ROyACYic0zd0tkzd0AMOaCJ3SoABSuTu2SOTQmBXxRvmlbHG3ic42AVAGqzWHQRRQCsc8NLb6nb2DmlJ0NKx2UraCmdLK+GW17Au0vtt4LX8SljA4hqxpuLaG6OLlgEvVPc8Ode5K8Qlayka50Zke/QF3I+C1hCuTHJO+BZMRknilY4Ah3xtSPaq6SoLA5tw0u04jyVTnAF3E3tX1CpJ+KVvSOe2ewlrIn/AAjewN1Q2cx2LSQRySC3BxF3av6tldBC2QOvYkC4BTF1F9JmN2kkXN1U+5cSRYndObhwsr46Z0pvawG5RaQU2eVvZ1H0qcdvPvWYp8FmqnNYwetsvT+5GrlqmQxsLiTqeQWTzQT5ZqsE5K0jA9Z2C1ugckDbbroEXR08aF/CTvzSVeRJ6eI8Fni3dqsftmK6s3+xZqujQ+XfcJRYu1utlOUK17XObC5pHeF4jgNUx4DoXN5XI0WyzwfRmL0+RdUYrRoty5INPCdN168RwupoXDrGHhIuHDZeIHZaJqStGUouLpmUw6R9ndr6F6juqKNnBCDf1tVe7cELmk+TqguBuSUo8kCpKFChUG6hTEQI81GqHdAESkJuah2SGVlLbVMUFRAEUbaIjZAEQKYjRBIogSlMgUCKzoUeShGqICYheah3R5pTumDG5BA7qIFAhgjyQGyISGVnSdp8FYFW/SVicGyGNGSdzQCcjQpQLLI2CNkrtSnt2QlI1QAGjtK07JWjVORcJMaFKVye2iUjRMTFbpdHkoApYhAiAXBQciBug4GyAIgfVTWSm9kwYnJKE5BISgWKZJAiN0LaojUoGEqEIkG6hakApS20T2S2TEKF7HRQswt75ZLl+gaD6q8rW3K9VY5kWFlzbdpwbrrf9ia5YnwmY10/o1CyQNa4Fx4XvaL3WOfUSOIkc65b6qSquah4JvbQKqxAN11qNHHKVik680bi+uisjiLwSNwnFMXHewCZJQWguPCdLc0zNHAk2sr/AEJ5cAPNXQ0fAeskYS0fWUm0NJiU9M7rWkdppOhIWwYfQgcIeSWk6gDcrHQTOjeCGhpB0vyWzUl/RmOcWtPxeZC5M8nR24IKzMYXS09w6NgaNieazjGNZrGAwrA4ZPwyi3JZtsvFc6XIXh5k93J72FraZejb1tuL6VfLRdaw8VtO7kvBSVDg0NGlh9KysE/aIOzxrfZcrXJ0Iw8lMYHloGh71462iilZq23O62CuYOrvob+FrLHuDTGRvYjdJNpjaTRrtZhEM0QY5gIttZaFmDLf5LkM8LS6GQ2/QK6lPbqzbXW91iMQhZVU8kLx2ZGkX7vFehptROEv0OHU6eGSP6nOaVrmw2cbm/0K07KCndSh0LzdzXEFHhu1ew+XZ4q4VE5IIkaKWKQxOahRtqpZMQBsiVLapuFAAQKaylkgKiEExGqHCqQgckVLIkIAJ9VLdPa4SW1SAgQTAJS03QApRGyhai0GyYhSNUh9ZWW1SOBumhNkQIRspbRAiN2RKDRomAQxorl9dnmid0Jh6v6SdDGjLWNiksnB0KG6xNiW2Qcm7kCgTCwG6Y7JWpxskUgWulcE4SnUpiA1DcJkoI1QIjVCNFG7ouQALJCNFZ3JTsmBXbRAC4THZKNAVRJLKNvdEIjZABUKPNQhSUIRqlO6sKQ7pokAvdGqY+TDZL/xbDf2qDQpZ2skp3iQu4W9oW71UepMuhhOEykk720srY6UvAPcvbR0gcwuOjRdx9iJYbstYaXK6m6OWKsrFLdhe2w8Ar4oOCEuOjnaEWV0RdDYgC9uzfmrCGyNZxWGnJYuRsoilgNO2zbWPaPM9ytZGZONo1aza6DGcRPC076kr0tYC9oYyzLHfn4rJs2ijyije/UAFreZ5LKUNLK0tJHENyTsraQMaHM+MdSsvEI5IhwuF26WXNky+R1YsXmV0TeCbbT8VkxIQbE+0LwMs2SwXpIdYdy4Zq2ehDhUZKklBda+t1lopHWudb+K12kLhICFnYS7hBFxdcmRUdEHZfUuLorjUkbErH8ThcOHLe6yXAXMFxb7V4amKwJ9vksTY8Uzx1Zt5BY6Z4cBay9cpJuAvG+I8wuiBhM03G2BuJvI+EAV4mjRZHHG/wCXgf0fxWPaNF7uN3FHg5OJsBCNlFOSszEIsULaqw6pbap2IFtUxGinNEhACkIHQJ0HJAVEFCychKqEABQoqW1QBBsgU9tEpSACBBumQumhAtqoApfVQc0wFKVMd0LIEyAaJSbGyZA6lMQAmGyUJ2jRIaKZz2Ae4hPdCYXjKNtEeQLqZZLfVElLzWJuOdwlcmOhCUoAZqdK1MBokxogGiCOyh2QAp0St2RclZumII3TcktrFG2iAJyQOyNtEvegBCgBomKCokCIURtogA2RcFANUSEhiu2CRWEdlJyTBgG6eGEVEgiNrP0N0gWRwSmimrnSVBLaenjdJJw7kbADxJNkXXIknJ0haPBqypw6pmpKaWWBnZ6wCzb+axFU2WjkZHPC+M20JGi2OfEa+oEULZTDTM0jgZo1g8vxVj3xVFOaavYJGu2dzBUvO76cGv2VRVXya4x3WOuAr+Ah3DyS+iuppHNB42cWjk47WguRzWjd9DFRa6nojeGRi1jqvTE0lrf6OgXiJ4fVGy9sLncQ0usJm8D1NHCbW8br2RuHCXKmMAt3F02oIA3Oy5m7OxcF2zwb35rLUoEkIB+la/JO1sTXOcA5ulu9eWXGJdg62mzdFPdOYd6o9TeYBRtc0ucA7nY6LLRT0QiF5W2Ot7rlD8QmDQ4SafFXhqMTrHC7nEg6DXZT9i3eY/tij5HZZK+kZfglaTbTVYuqqWzzcLXa/auTRV1U2QETPvfSxW24JiEkjy+R9wO9Y5NF3auzbFrFkdUbLwAMc53fZeWVt3dnUBeSsxARNAvqdVr9Xmr0biDWFxvbUqceCc+hWTPCH4jzY6CMTI/orHN1VtTiQxKo6zh4SAkAXsQi4xSZ4s5KUm0LZS2iciyCokS2iFlZZLbVMQLKFFRAAsgUyhCAEI0SWVhS2TEL3IqEWUsgBuSVwTDZApAIUttVYRok5qkIGxR71DuiRogBCEE52QGyLEIQhZOgRqmAgVg2QsiECRXN/FuUaeyEZNY3eSWPWNp8EeQ/My52SkapigdbLI2IgUVCEAFqsCVo1TbKWNEGyB3TWQIQMrcO0poCLIu9ZLayolhcdUeSCPJAEGyUhMDoltqhAxTsl5JzshyTJFKcbJTyTDZA0MEeaDU3NJjQhSW0VneqzumhMB0KyFESMNqeHd8kbT5aleA6lZDDAXQ1ce5DWygfonX6ilP8JphdTVnriYX1TnAdlmipr6mmYRxyHivYNCsDnR4aZGg9om5WL9G4mdfJ6zjp4LngrfJ15Zehe1vEXNvdp0K874XMdY3CyFFSvfSy1J0bxcLR3+KaZoIabahaKVHO43yeeGIFuuoC9ccfCbj6EjGg6DRehrCACNdVEnZpCJYx3ZB2RHE1hLmGRpN9N2nvCDmFzDYG4Xpomm1hdc74NlzwYOps+R3DK0g8tiD4heKonndIY6aBxtu5reIrbKzCophx1M1NG3vc3X6V4HxsoZWvw6sppABZzL8N1vDLEynhkaw4TNgdL6K6RwNj1jjf6AsfJVTFnEYxGAbXAst1/L9Nq2qpmtd3tKqi9GxiYxU1C6oJ30s0eZW6zVzKJzywXxGRrlI8yPbZpvbVbRhGHVkg42sLWbrLUeWoqSUSPgZG7h0F7tv3LOYaWxEtc3haRqLbLgz6pNeE78GlafiOa4xisnpskIJ/Nnh0WGka6YguLPAcYut8zBlOJ2Kvr+INjmGrXbBy0+ty++lkDWvL+48OlvNd2nyY5RW1nBqceVSe5cFVHTAO61pPDay9u1kkI6uBrABoOScG4WsnbMUqA4qDZEjRABSMFkLaplEwFsoigNkCJYqFFQoARyVO4aIW0QIrN0baI2RGyYEGyUjROEpCQC8ko3TEaJQqQiWRUKJQArtkBsidlBsgBVCFCVDyTEAqBQlQboEB47JVcX8WFc7ZUR+on5D8zMkIckTsgsTZgRKiiAGCfml7keeqllIYpSmUKAKnesgi71kuxVEjI8kOSPJAAGymyI2UskMQ7IN1TEJRuqIId03JAjVGyBhbumAQG6YbqRoWyR26tO6rITQmLzXrw6Z0GIRltrP/ADbr7EO0K83NM13Vua/4pumC45NijpRTVNRhlT2W8Z4XeK8tbRupaKS8ZcxrrcY5LM4gwVlQ4Wu6VokaeZuLrwUb5mOfBUASMIsb7ELlnGWOVndCccsa8zyUU3WYNwtPqaEeKqtxNC94pGU8U3VRiON2qx/EiLu2hSVUmS1tjsroZQPNVA8SrLHDwVNWSnRkoj1klhoCvTFE+MiwvY2ssfQutJqdAdVnBLFw6gDndc8+DeLsyFDSUzyHTxCQ7doXss2MCoaqlDRSw3A+INVrcOIMDmBpBaeazdLi4iADu1quDJGXVHbjcWeGbKWGyPIdSR3HcF62UNDg9LxSGOniaPJV4nmKGljeWODSNrLR8SrqrEKmKprXHqHP7MR2t3lPFjyZfxPgWScMfKXJu0WLYXXEMhqxppqNCvZ6Hcjg4XM+MCvHgVNQYiwR8MTDw2F9Lr3zU0uFviitdmwvyWOSKi6RvF31FxHDYsQwmaje0njYWk9x5H6VzKnwLGoZXU84L4mXBIfuu2U5jGHyTPLNG2sdzdajXNEconBtc2ctNPqJY7ivMyzYI5PE/I5bayLRoshjtGKPF5Ws/i3/AJxvkf8AmvCzZe8pboqSPAlFxk4shGiVOdUp0CYMgGiBGiLbolBIlkLJxqEEwAAodkVCECFtokAVltEnNMBSo3ZFw1UagRGoEapm7FQhAFZ2VY9ZWlqrI1TEMUOSKB1QADsgESNEAmIFrqOGoRUOyAFsEQFOSl0xA5qiPYjxK9Fl5gbOcPFNCZnCl0smSrE3JbZQ6IjVE7JAQJkoTWskxoIQciCoUhiHUqaIpSqEC1wnGyXYIhAggaIckRsVOSBiFABMRolCYg27SJGqg9ZE7oBEG6ZAIpDA7dI4bJ3bhA6poQAAiLFhClt0ANCgDc6YNFJh0jtxC0+axlbUEOllBs4O25FZCEg0MLD/AKOFoFvJYbECC5wB3Ws0pR5Jg2pcHpa6pqMINU5zWxXsGjc621WMJHEbbLI08oGX2RHbjN1jSAHXGoKxcIxXBupyk+S2MWIXoLQW3XnY7RWGTslZtFqQgeYpNNks2IcN2a8SHrEeBXmqWWqQOQF0qT6jcmj301Q8Aa817ajFW01OXdaRw8wVjom8ML5Cey0XK1yavdU1bZXNJZfsM/FKOFZGEs3do2zDYZsWnNROCYGagHQHzWRzZh8cWGQ1ULmkNbd7Adbd6wdNiOJ1ULKenj6uM62A0817I6Z0zOCvrI2Rt04S691Dhtkn6Gkcm6LSXUwNLmaow5wMUnE0bA6ELZaDpENZG2Kck8JvY7rW8Rw2hnnk4K6IEvuTbksO7Dpo79U5soB0LSumWDDlXK5OZajPifHQ69S5rp6qAsMgHmsbi2OQvpJAx4vo0eJuua+k4hF2Qx1+/humpZ5pqtvG5ziBqDyK5v4fGL3JnR/EZSW2jZMZqfSqiJ17lsYB+lY9oKjiSdd0WLojHbGjllLdKyIEXVlkLJiEA1RICJGqNkCoUCyXh1T21QtqgBC3VEjRNbXZQhMQhGiQjVXWukc1MCsjRBo0Vh2SjRMlkaFCNEwGqBSAQiyrcFcRdVuCYhTsl8U3NAjVMRCNEqsI0SW0QgE5onkEOaJAuFQgckAmOyWyAG5LyP0kd5r2cl4p9JiqiTIz9rJTo5PuEp9Ylc6OhkaiQgAm5IYC2sE9r2SlML20QMFrFE7IX1TJADuSuF06UhNCFRA1UATAJsEQbFS2ig2KI2UjKyNCl2sVYRolb3FUiSNHaCcgXSjfyTkbIY0JbVNbuULdU1lIxHjZQMc97WsaXOcbADmUzlsuS8NinrpMSqnBtNQi4J5vOw9m6G6Vh1K8Yyt1NFGMLkE1ZGy00Upt1jufAfqstJOKyQzOinpHMkaeFzSbEH2romJZhwt1Q5sMjbg73WHrJMGxyogNS5sc8bwRM3cgHZ3eFpB0vEjKXL8LPZUkUNS6J3ZvE3S+x4QsLNMHPJvuLK7NFS/8sufs2TtNI2I8Fi2SF6SbcUa0k+D2RVPDTujvzuqDJyVZdwlJxAX1QM9TJQRvZWdYHDTXReJj07ZSFLQ0z2U7gJdT4Kmula2qPcQFSJSH6KqrcZZGnwSUeRuXB7nu48JqQwkuMZ0HJYOgppZZoWt7LXm3FbZZmhI4ZByLCL+xZPBYYqV/VkB2g7JG4S7zu0w7vvGjxsy7iU+Fy1EdY9xjfwhjTYEc1diuSqimoaOaOR8z53iN7b7E7LMOwiJ8bmYbWy0kbzd8AdcX8L/YrJG5oNLBNDNA70GVsgh9V0vD5rPvZN2ma9zS5VmuVvR7ilHijKLgc6WRnWNc03bbncrwDAcSYyVwaCIX9W643K6RW5wzDHVuNTlWUBjAbxyB2h1Gqwb80mCOJtRgtVCJJLuJA1cddE45cr6pfsZvHjXSzQZZqiCrla8AiE8JtzK9NBSmFpkkH5x+pXqdRh1Y6aZtm8ZlePEnQKx2riTzXQ52qRhsafJWRclFgsjbVFoUlBcNEQ3RR2yLBdqkYpbqpZWEJbIArI1Q4blO4aqAapiEI1S21VhGqW1nIAlrJXBWEaoOGiBFFtECNFZbVAjRUSK0IkWRaNUXBAys7JHKwhId0ySt2hQTvGiVoumIPJINlbZV8OtkAVkKHZMQiNAqJF+Cl5qyyS1igAkaLzTt/O+xerkqJQC/2Jx6iZmraJCNQrOSVw1usEdDFCa2iACe2ibEmIRomB0CHJMBokOwW10TW0UAs5FACqW0RtqodkAJbdMNkSBwXUCBAA3RA0UA3TDZA0IRoq7bhXAbqoizk0JhaFYRayUDspzq0JMaAQVLI8kbJDK3C5sNT3LfKTD4IMFgwuQ+sC+ax+Gf2aBa1glJ1mLQukp5pWtNw1jC7tcr+F1nH1sNLiYieTcaEu0JPNHXoK66mp5iyjPh8hmpwXxO10WsmNzHa3BC7ZHUUuI0xgdYg7LRc1ZYlpXGohjJj3uBot8Wa/DI58mL+aJgabFr0/otczr4Pgn4TD3gpWzNjk4WvD2E9l37Vjy0jQpdeS3eNMyjlcTN3a4A7rzva4OtuvJBVOYeF+3eve14ey4Oq53FxOuM1NcHmLiwgputuUJAHXXncS07oSsTdHrvcjVEniF+Y0XjZNYWOq9Mbwb7XKHEFIup5HMe4N5LYIoHhkFQ0g3FjpbVa21/ACQVseEV8VTG6nebteLgHlbndc+aLq0dGGSumXSVBY7jsQ7wKyuFZhmpRwucJWHdjxcLFuo3uc9rRxEbeIXirMPnYwvY7bltZcySfDZ17pQ5SNnnx+nJe5hdAXaWB0Ximq6aoYJHua5zftWly4lO0ua4k271ZBiNQ48Ia23ktvs1ci+2p8Ue+tk66qcQLMB0Hee9eYt0VpuRc6nmgRpstFwcUnbspsi0JraotGqokJboowaFORooBY7KRgI0CUBWWS27SAK3NUA1VjglAQApCUt0Vrm2SEaJiF3KLh2UWjVFw0QB5vhJiESNVHDRWQKBqi4KAaouFkhiEaKojVXkaKtzeaYhCOykGhVrvVKqsqJYx2VXNW20VZ0KBClTYKEGyNtAqEAXISkJ0rhohCI3UJHtHEnYg7dMDLAaIOF9E1kp01WKNgAJggNdU1tEMBbaIjRREDRAE5hMQgRYonVSMDkDsmI2ULUwEAsiECEbJiJzKYbJeado0SGC2qrI1VtrXSH1kAQA8KI9VS2izGF5fkqqQVlXMKOjN7PLeJ0nfwj8dkNgeLD8PmxKqZTU7bvdqSdmjmT4Lbn5fpY6JkdHPJQ1DW2Mz2BxkPfY7DyWvVma6bAon0mAU5jc/SSpl7UjvwHksA/FsTnLp21znuOrgTY/81axSfPQzeWK46mbrJs1Zfl9IbWyTQ3/AI2M3afMcli58xtxib/6tHwuJ/j4tCPEjmvA7E8TbIC6omBGo7RsvRTV+HyktxPD2yX/ANJEeBw/BbqFLlf0MHO3wzP0dQ6gIlfPG2lFhEYyXmX28lt1JisE9P1NQQ4PGoOq5daSjc84VUemUjjd1PJo4ezv8Qlo8X9He9566SQHQOdbhHcQspYd3KNI5dpsuY8muIfWYT+dj3dFzHktKMD2khzSHDQg7hbtg2b2seGTXZc8zcL3Y1T4ZjDOtZGGTEevHv7e9OOSUPDMUoRnzE5yW2KjZXx+rqO5e6tw+SkmIcQ4ciF5TFcaLptSRhzFjslDxvqqZDffRAxOabt3R4w8WIsVk40bKW5FRdqmbLw7GyBj4tlU5jheyqrC6PQ+d3CbG5tsvThlc2nlbI52o2WNEhbuoQNxshxTVC3NO0dFw7GIJGiOQhpHqOB18lkRV0dRFwlt381y6GrkjcO1tzWVpcac1wsSXWtuuDJpPOJ6GLWcVIy+IYXC+eRzWjhJvvuiKZlNQ8Th2gDq7msc3GGnjc52rtAk9LnrC2Fpc6MHVx2smoTqmyXkx3aPd8EKEaJiNAiQOFBJQAiBqmA1RDdUwDbRQbpiNELWKQEIUAsUxQskAtrlLZNbtIWsUxBIVdtCrSLhJw6oATh1CZwuEbKEaJgUEapXJ9ylcFRAAEXC6gCjkACyrcLK7kq3jRNCZW4dlVgK0jsquyolkGyRw1VoGiR4QIRwQOyY7IKhAA0SuT+SQjRAgNCJGqjUxtdMDKApHojQqEdpZGoGbWVgSt3TjZJjQh5phyQPrJwEhikIhEqAaIAlkEeanNAClAjZMe5G2iYheaYC6nwkw3SGKRZJftK07oCJ0krWMHE5xsB3lCBl1OKaBnpdbcwMNhGNDK74vgO8r0z9IOKvaY2Mp2RAcLWdWCGjkB4Lbx0f0E9NF6XVva6NgBDbWB5/WvLFgeWMNn4IqY1sw+HMS4X8tlSnjrlWyJRm3w6NTw+vxnF6xrKWhpXXOr/RhwtHeSttbUYm6oioqXDKeSNgtLPURNY1x8B3LJ2xN7OCkL6ZluyIY2ho9iwtR+WY6p7qzEeFjR2eHga6/jdS5bnwhqO1cs88mFslmf1sccg4iC4Ri3styWOr8rxzMc+mibI3/wBNxY4ew6FS9XVcUHXiRrNQCNCO+4sljhxOljcKepcC3Xge7jYfadQtFa8yHT8jBMwBr6rqmVjYZR/o5R1b/r0WUOAyGPhrqSSQAWE7dHD28/aq6jEnVrOoraZvWDk4Xv8AoleJuIYjhbrUVXK2M6iNzuIfWtfEzPwo8uJYVJQs66N5lpybcfDYtPcQhh+Jy054C825L0zZhqq88NZZ42tawWOqKTqgJYrmJx0/onuKtJtVIzbSdxMpPOKuPW1yvAYy02tskpqjqtCQB3leKtxN8zy2I8DO/mVUY1wJyvk9U00MLe24X7husdLVh7wWs4R3815rkm5RA1vuronce+OYOCZxBXgY8sPh3L2iMFoN1nJUaxluF4AeVwvfQ0BtHUOphNFxWLe8LyBgALnu4WhZCjxed9I6KJz3SiMRsY4XtY/BI5+al2+hXCM5UYBh5ja+GnYASCCeYWIq8BayaQxkNYTdotYj2r34Rj8MTBT17XNLT2XEep3gqrFMz0Jdajg6+QbPeLNHs5rNb06G3FqzwMwMU1RG+pc70c6mQC4Hn+1bDU0cdG2Jkc0UkUjeNnCRotf9JmxOl4TUvbUC/ZvZrx3W5LHQukjl4LlvIX5K3By6slTUehs5ChCLWO6prrgtcNCNiiAuPodidlfDZECxRO6NtUDCNkCNUQFCO0gAEKWTEbIgapAVfCQI1TkdpK4apiDbRKBYp7aJbIArtqU1lDoVL6JiKtkjgmLdUHNsmSS2gSkJwNFLIEKBolcLhPbRKmBU4aJANVeRqqzoSqJYtuaR+wsn5JXDRMkrI0Q5J7aJbapiA06WSuCctULUwKgmIuhbVMmIyfOyDt0eahCyNRRuFaNlXbRWckmNCO3VgHZCRwsQrGi7EDIfVUARI7KjQkAtlANUbWJR+EgBCNUwCDgmCYhPhJx6yW3aCdIYDutmytQQMP5UqhdsbrQM+M7mT4Ba9T0klZVxU8XryuDR7V0OWKkpaSKkiA6uBobfv8fMlJgeWvxJ1QXFzi2MbDv8Vq1dmiOkLoqJjJZti86tb+1eLMGYI5651LCf8mj0fwn1jzF1hKiWhe1pponxOG4JuCuiGL1RhPL6GSfmvFuO81Q+Vvxb2b9ATMzTRPBbWYRTSg7uAIKxIcHNtZVup2P5WWuyPoZb5ept9JXYNXyNfA3hkYLthdz8AsbW40Wxup6Z1RGST1hkdqfCy1x1G9h4o3EHwV7MUlbZldCKho04jo8e1T3aXQrvG+p7zU9axkPC0s3Lni2vfpsg5rJ2uje825P5g9//ADQjZT1LOKllu7/w36O9neqC50chaQQRyKdCso6smZ0EwDZm7Hk8d4TB7og6J9yx+hT1MfpUY4Twys1YfwVUMol7M7bcj3tP7FZB4a9roQGXuHah3eF4Nys/PRkxGKTVp1a4LHCi4HdrVUmS0eTgu0lJYhZB1NpoLLzyQFqqxFHmvbE9pgFtxoV4+EhFjiy471MlZUZbWXVEvYDAdTupSSPimDmOLXDUEclQNSrWO4HAnZCVITlbs9xfJPVPlkdxPebk7LIHLlTVUvpMLYxdvEADq/8A5rCslMsu1mrPYfi01JRiEWLWnS6iVroXGn1MM13VuGnC9p1C9k8bWwGWMFzLXIG7f+S9FbDFi3HUU4DKluro/jjw8V5aeofEARuNCCi7F0MngOJtEToJm8cTxe3ce8LIcI4jwm7eR71ggYWXnpwGgauj7vJZKhqxM0Ad408CsckL5RvjnXDPSWqEJnghxBFiFFzHUAbqc1Buid0AQqI8gUEhCEaqFMRqo4JgAahLZONkCEAVuCFrhORolGxTEVnRK4JjugUyQNHZUIRb6qa2iAKwErgnASuCdiEtqq3jtK0hI4dpUSxAOylcNFYBulc3RMRXbRIRqrAldumSKEx2UCJCAKXboi1lHjVQDRUIyZ9dR26J9ZQ7rI1AAntolGqcbIYIVwNgmZq1Ajspo9bpeQw2u1Fotqj8FAJDByuh8JMfVS/CCaAjgnAFtkDZG+myQFZCI2QcmaLtTEZbLr+qrn1BbfqYyQe4nT9q8ePZilFJFBGSXTjjeb27PcvU8PoKSlp4xeoqGPmeDyBFmg+y5WpYhO2orHubqwWY3yAsFvignyzDJOuELNJTSSccVP1He0G4QDWHZUAIgEbLpo5rPQNNArbcwvK0lXsKlopMsuQoY2yCzggCmCRRQ+jLHcUZt5K9tSXtDKhpdbZ3MK0FAxhxKQELAGhzTdvevHVHq3icNvbR47x3r2NvGbjbn3FCWFssZLL6jUIQMWCZ3BYHiYdRdVTMubgWPILy0kpje6B3wdl7NTH4jZOqFdlA7QQfCHDZMbOHWs2J18CmY66APG+lXmli4SRZZiwdyXmqYA4XAVJiaMWG6osZx6lM9hY8X5osBAVEnpgYG7Ben4NlTCDbVXBQykSJrhK0t0N+SurKcynrYxaU+s0fC8fNSCwlb5q+WzhobWUleRimntFpBB2N1kMMuyrYzXtHhV4kpapoZWR9rYTM0cPPvUgZ+TMRhqGyNqYweyW735AjvQ3aBKjMPqhOJm1PZnh+Haxd4FVjbZUspWvllq8SqAwym5ijN3eV+S9f5ao2ksdQMEZ2cdXW81zShfQ6Y5K6lQHaRI1RMtPI/ip38TDyO4RKxaa6myafQB0aEo3Tn1QkSAJGiBGia+iCYAAQcNUQidUAIW6JQEx2QATEV8OpSHdWndIRqmSIOasA7KQDVWDZMBAErgbJxzSuCAKrXCDmqwBK4aJkldtVHN0Tc9kXeqmI8/Dqlc3VW80jlRIgbqmLVExQIodul1TuHaQVIRlCNUCNU53QKyNBQFY0aJbJ2+qhjQCOyUYxqodiizdIA23Qsnte6UJDDYWVbvWCsPqpDpYpoAm1u9S+ilrokaIArte6vpog+WNp2c4Aqs7q6nJEjUIVnmxvEHSYrUkOIeYeqZbkCdfqWuk2K9dfI2bEp5Gu04uEexeUni1XoRVI4ZO2AFOEtrKApiLBuma7VVg6pwkwLmlMCq2lOCpKTLAVYHKoeClyDZSVZcXtG+iW4I7DrOQvcWOyqkpnDtRuNkUOzw1YPXtl4eGRp7QHPxXqNS2GIEgm6SWTrAGSixGzl5HnQNPwdFa5IujJQcLnuFuxIOLyVTmGN5B5J4bCBhB1CtlHGAVIyoOTgcQVfCWlXttwoY0eKspr07iBq3UKqKFskTX8iPrWTAubHYrwUJHHLTnSziQmnwJrkZsRaExFl6OEtFik4Uh0VsB65lu9ZKoi4Abix8F5KdoNQzzC9FdU3ebKX1GjwvIadUjHMdIC43APIqqR/E9BrA42Bsqomz0mrEZPVt/FE1z5Whk0fYvo4btSxQO4rMYXHwC3HKuSZcdf19Y802HxntvG7j8Vv4nks8mSGOO6TNMcJZHtiafEXRTcTH6g6Ec1m6aqZUx6WDxuF1injy7gsHo1BRQxm2r3MDnHzJWi5+hoonxYhRMijlDgHGIWDwe8Lzo6yGaexL4noPRzww3t/AxPJIRqs/guUMTxrDW1rOrpoHi7XTkt4vIWusfiWE1WE1PVVIaeLVr2Ou1yrfFy2p8k7Zbd1cHhQO6stoldorIFA12R5KI2uEAV20QtZWFKqEVkdpKRqnN+JB2m6BWJZNyQumA0TBCAaoFON0riECECV1rKwIPGiYmVHdEjso21Rt2UyTzndKQrXNSkXTQhAAiQiAo4aJiKXDVCyd26VUIyZ9ZBORqhbRZGgLXTN0CCZouEAA80YyLqW1UboUhlneq+StGqrISQ2wfBUcOymAs1B/gqFZABuoTYIgKOsW+KQWLuieLgNjY8ilCtaOyn0DqYishppsMimiaY6hh4Ht+NbcrF7LLV8YbM5zdCSscQHGx0K749Dhk+RL6IJzCbXGqQgt3CZIwT7BVXTA3CB2Wg6I8ZCqDiD4K5vaCkdjxz2Pa2XoLeMBzTdeRzbaoMqeqclQ0z0lr+SAlkYdbWQFfTv0fdp70xdDKOzI0+eiQ7C9sE4seyfBYqtYIn8LXX1XudE5pu2xae4qqpoJ5Y+sEbn8PwgNwmuBPkWCQhjW2XugILbHcLHxutIGlpBHevVG8tIcPaENAmel0YdtogGFuisDmPbdp17lU5547KSxgLEHuWKmPomKdZbsuN/YVlbrzVdOJ4yOfJNMTL3EOaCNQkIuFVROMlLwn14zwlXWNkBYrDwOv3KqZ19OaueQxtzuvO1he65QBUIjJYgaImHqu0dCvYwBq8s8oknETdT+KdiNqyNg82YcX9H4zFRwjjqJByHcPErrtSymp6VsFPG1kETeFrBsAuYZYidhtLG1sj2mV3E7hNrlbli9XI7DomtkuX+sRuvnNdN5cm1dD6LQ41jhufUw+KVDI2ySlwDW6l3cFVkDDJM1YvPidcwHCaQ8McbhpK/fXwG/0LwehVeacSbhGHj8y0g1M3wWjuuuizClyzg8GGUI4Iom203ceZPiUnJYMdfzP9imnmyUn4ULjWKvEjmMAaxosALWA7rLR8QiqcalkbSxmUwt6xzQdQNvavbi2MRthdqbu0HeT3BUUEfodBLO9/BO8cbyD6oGw9ijEtnj8zXLUlsXQ1m1hZK7RZOfB6/wBC/KQpnupZe2JG6ix5nuWNcF6sZJ9DxpJxdMXkiCgEQqJsFtUtlYQkI1TQhDuld6vintqg4XGiYrK0zUOSYIFYpFnJHDVWuGqQt1TCxAi4IgaqOCBFdtVLJrABTdMLKyFWQriFXbdNCYgCDwOFNZRw0TJKCoL2TOGqLbWVEmRI1QTFLZZmlktcotCA3Tt2KATByUb6yYiyjR20hj8yq+St70hGiSCxeShRt2Sl5qgD3KFtrohOUAUjdWj1FWBdysaOyVLBGKxEXe/nbW3eFi3EsdZ2o5FZav7NQL7PYsYG8YLDy28F6EOYo4pcSZGTFvirOtZJuLLyuYWmxGqFj3qqFZ6DC07Jeqc3xVIe5uxKPpEo8fNIRZbvFkWO4TZVekTHThb9CsYal2zWtHeQihnrY5rhYhR0LTqGpYxI0XfJfwATOe4izRqoKRPRoneu1rR4qCCjafV4j5pfR3yblWNpeFAxo3Nabxsa0jawXp9LqpdJXlze5ebqy0XA1TNqCAA9twpGmXzU0dTECLNkbsfwWMJMZLHCxGhCykboZAOGQtd3EKqrozOAdpG7HvCE/UGeOIlut1aTfVVBpabOFiN1Y21lTEixp0TcNxdeZ03DshBUOfKWnZKgsLm+j1PWj1H6PH4q17w02BBXnr5CIyxvMapqVzZqZheLlhsSNx3FPysL5oJBkKsay2ysY0AWKa2iQzy1MohhJ58lMEoXT1Aldqd1XPH17+HkCtlwCmMb9tNAsc89kODfT498+TMUbXNmY0DRgWz4eYZXCOeJsze5yw9HGDI495WQjJhkHCbWXz+R2fQ41SNppjTUNGYqOCKmYDctYLX8VquNVrpalz3Elg2V1XWvhgETX9YXauJ+xY03kddwNjyWUI87mW2qpHmpKIyu9Mnb2nfxbT8EftVrGSCUxkh3Ht4DxXqbMI4ncRuANAq6ZhY8TTaF+wPILo3XyzLbR7jin5Mo3wFgMZbYW04fDyWkyizzbY6hW5txfgd6NA7tO+oLH4TUhtAWTSnjJu0HWwXdpcDUd/qedq86cti8i9qZUQOkfI9sgAI1BA0IV9l0NU6ORSvklkjtCrAq3jtJIYqV22icBKQqFYg2TWQsmGyBBcNQkI1VjtwlIQMr5olQjVR2wTFYjglanI0QCBCqsjRX8OhVTtrJiKwEXDsogKHZMVlRGiW1lYdktlRLMgltqnshzWZYANUzULarLZby9WZoxyHCaAxCpmDnN613C3sgk62PIJgYo7otHaXtxnC58Fxiqw2q4PSKSQxScBu247ivGz10h2N3re8j9FWIZ2wibEY66Khgjl6phkiL+sIGpFiLAXt9PctIZG+SQRxtLnvIa1o5k6AfSvr3KmBR5bynh+EstemhDXkfCedXH2uJV447nyFny1nLK7sn5hkwd9aytkjjY972MLAC7W1iTysfatpyl0LYlmjLdNjBxSGhZU3dHG+Fz3FoNg64I3tfyssPj7Jc6dLdbTwOLjXYgadju5gPBf2NaSvqFjKbBsGayNojpaKGzQPgsY39gVQim2Kz4/x/ChgWYa7CvSW1Jo5TC6VreEOI3087j2L1Zayhjebap0GEUTpgz+MlceGOP9Jx09mp8Fdl3BavPWdY6Nji19fM+eaW1+rYSXPd9eniQvqzBcFoMv4RBhuHQNgpoG2a0bk8yTzJ5lKMNwWcZw73O1Q+MOxLMEcT+bKaAvA/3nEfYvbL7nemEZ6jMc4fy6ymaR9Tgtgzh004LlrEJMOo6aTFayElsvVvDI43fFLtbkcwBosBh3uhaeSpazEcAlhhJ1kgnEhaP0SBf6VdQXAWc7zx0MZoy9SGuhiZitJCCXyUgJexveWHW3ldcpkPC/iad1964Ti1DjmFw4jh1Q2opZ28THt+sHuI2IXzv7oHo5psFnjzVhUAipKuXqqyJgs1kp1bIByDtQfG3et40lSMMkf5jigkbMAHDhdyKrMdnWcLIFpaVex4kZZ3JUYm4dG/RhP0jz4hHT4pFQmhbG5xkiMnHxFw0sRa3D9a37+C7iH/AJlpD/8A6r/8S9PuYW8OJZk+Sp/tkX0E6eJlQyBz2iWQFzWk6kC1/ouPpSbNoRTVs+Is7ZUqci5sqMDqZGTuiayRszGFrZGuFwQDtrcexYK7ncyu/e6ay/rg2Yo2bcVFM7/jZ/7x7VwNpQZyVOi2GKSWRkcbS+R7g1rRuSdAPpXb4vc1YoYml+YqRjiAS30Zxse6/EtK6Gsv/ug6T8Na9nFT0JNbLpcWZ6v/ABlq+uXzxRzRxPkaJJL8DSdXWFzZSawja5PmTN3QhXZPyrWY5LjlPVMpA0mJtO5pdxPDdy4960PL2FOx/MNBhMczYX1s7YRI5vEGk87c19QdNPvQ43f4sX3rF849HBH75uXR/wDnx/akwaSdHSP4N2In/vHS/wB1d/iSH3NVed8x0v8AdXf4l9Cclxyv90Ph9DiVTSHL9Y808z4i4TsAPC4tv9SCmkjXP4NGIA3GZKX+6u/xLmeP4NLlvM9ZgU07ah1JMIjK1paHXANwOW67R/CQw4/93az+3YuOZoxuPMmda3GI4HQMrKhsgjeQ4t9UWJHkk6E68jpM/ua6+btDMdK13f6K7X/iXH844BLlLNFdgclS2pfRua0ysaWh12h2x23X3GPV9i+UukzCaLE+mfGo6qWSLjlY0FhABPVs3SlJQVsezc0kcne+5W9dGfRvUdIVZXQ02IxUDqJjJCZIjJxcRI5EW2XvZ0eYWx139c4+L113oSwOiwevxX0WIML4Yw43uTZzlzQ1uLJNQj1Z0S0WSEXORz3NPuf8Sy3lmvxh+NwVxp2h3UR0zmufdwbYEuNt7rnNBlHFmSuvE1jHfGdqvsjPUfW5JxFnexv67Vxc4e1ouSAufWayWCSjFeRvptHDKtzOf02S5XAGaoGo2aLapqjJQa8Fk72gk9l57J7hxbjzK6CylFtBryT+hNDHdYQbjZeYu0M13Z3vQ4aqjj+BYXTz48MNrmvjPGWcbXagjlbYrfhlWDDo3uFU5kXJ8gAWt1TfRekSKYtJhjqYC4tFrNOnJb50gwPbiFO2EONNFCCe5pLrXPmu3NkeSUI+TR5sF3Tf6GBFNLTsL2ASQA26xpBv+xXjhkJNwABuSsZC+Wl/PRGzdnfFcO4heXG3TYdHTzlonw6vaXMvyINnMPl9iz+zbpVZ0rVqMeUeypxfDIH2lrYuLb1roiQVDWujlDmH4QN1rnomCV7LOpRE4/CYbEKkU1RlyTrYJnT0Lj2m/CZ4rrWkxpdeTnetyN9ODbhwRN7R4iNljccx2GhjaXG73aNYNfakfVsNOZ3zHq7XWmYpOa2tdJqWgdm6vHpoN8oznqsiXDNkw6lpa6J88z455HuueJmoHchNhdDC9w6lpa7Uf0Vr9DVPpJA4E25gLJ1Nc10UckUhLib+S6djT4OdTT5Z5poPRqkCGZ0I5cRu0/sWSjNo2h8kb38+A3CxM0xm1cB7F5jM+lcJYyezqR3hNw3LklS2mwc0HjVV0tSyrgErD4EdxVrgueqZunasr5oHUXTNGpugSNbJisQBEBQbphsgVkdshuE3JBuyB2VkaqEaJ3bpSNECKihzTuCAGoTEEc1URqVeAq3CxQBUAjbTVMAofFUIpIFkh3VtktkyWe9LbVOQlIUFWSy3zoX99TDfk5/u3LRTst66GPfUw35Of7tyceqCzE9IY/zj4989f+C1wDthbH0h++Pj3z1/4LXB6yT6hZlMv4lDg+ZKDEqimNVFSTNmMIcG8fDqNT42PsXXn+6GpuAhuXagOtoTUt3+hcRISOGicZNdBtmxZIzPDlbNkeN1VE6uMbZLMa8MIe4W4rkHkT9K6Bj3TxDi2Xq/DoMDnp5KuB8LZXVDSGcQIva3iuPDRqRNSa4QrO0+56wxhqcaxNw7cbY6Zh7gbud9jV0/P2NSZeyHi2JQO4Z4oS2I9z3ENafYTf2LRPc+Fv7m8XHwvTG3/sxZZ7prDj0XV3DsJYSfLrAto8QGfMepJuSTzJ3KYJRdMN1zis7N7n7GpW4himBveTC+MVcbSfVcCGut5gt+hdN6R8HZj3Rtj2HvFy+jkezwe0cbT/WaFxboJDj0jPLdhRS8X9Zi+g8YLW4JWl/qiCQny4SunH0Dqj4Gjf2QDsdU1uE3CUgWAHcLeSjHW0Oy3OI797mB3FX5j+Tp/tkXTOkTGRl7HsnYk93DC7FPQ5iTpwSxObr5O4T7FzL3L4AxDMhB0MVP9si2n3SQ/wA3dA4Hhc3Eo+Ejkerk1UeZ0RdQs27pWy/+6ToxxijYwPnjh9Jh7+OPtgDzsR7V8ZNcNxsV9v5Jx1uaMi4Ti5PE6qpmmUf0wOF4/rAr4/ztl5+W8+4tgscZIgqXCBttXMceKP6nAIQsnkzufubcv+j5fxLH5WWfWyiniJGvVx7kebif6q2/8uflLp5bg8brxYTg8kkg/wDVlkj+xob/AFlncpYPDk/IWHYbI4MZQUo65x24rcUjvpLiuO9COMvzH0y5lxmW/FWUskrQeTTKzhHsaAPYkX0pHRumv3n8c/Ri++Yvm/o3Fuk7Lnz+P7V9IdNfvP43+jF96xfOHRwD++dlz5/H9qBS/EfZfJfJWNdHmb58fxGaLLeJPjkqpXscItHAvJBHsX1ryWuS9IGUIZnwy5kwtkkbi1zXVLQWkGxB170mXJJny/8AvcZzH/djE/7H/mtfZG6OsayRpa9kga5p3BDrEL6+/fDycf8AvLhX95b+1fJdVwy43O9jg5rqpzgRsQZCQkzNquh9sD1fYvk3pZcR0sY7Y2/Os+7YvrIer7F8m9LIv0r478qz7pibLn0MjlnFBimHfnTeogIbJ/SHJ3tXWOixoFfiJAteNn2lfO+A15wzF4Zi49U/83KP6J5+w6r6H6KeM1mJFwAHAy3jqV4iwd1rItdH/Y9WOfvNM0+qNtzu4syXiLhuGN/XC5FC7jFydV1vPTuHJOInuY39dq42yotC5ziBYWCz7TV5V7fVmmif3b9z2Nc0k7Cx08fFengjlZ2j2rLASVBfrzHcjHWugBJcSvL2ndZpeLY+7C81ztip42vLgwvlbxB3Cbt0235rpNfidNmXLbqjC52STPhDfzrQSRza4d4PNaBmuhbi+HT1DWgSMPFeywuWa10GICkbWGF0zONryNGygbHwNrfQvWWGOXHGUeJRPIzNwyO+jM3AZXAxVEbh1JLzIxtjHyJI7tllswywV+QatkzYo5aGWF8IhZwsPES0+081VLmDC6yrjFTFCxpi4Z5BKWPc7mLDl5rC5kxekly0aSlLYWmoDg3j43SeLj4BaKTnOPhrkwkqT5NW6zqnXaU4rXPuxxPCeS8ZffW6rJNl69HDuL8Tq5G00NKwHgbqfLkq5WOkibJw20Xnke7VoYXOPM7ItBD+J7iXeapKiW7I0G+qYP4XBoGigOt0g5uKYWXX0SuHECDzQYbhR2mqQ7FwOpNNiBgebMkPD7eS2V2602o4o6kSN0O/tW3xv62GOT47QfqWOaPKkaYpeQLJSLJ3CxS2WJo2LzTBC2qYbphYDooEXbFBqAsVynJM4XCFuygVlTtlByRKgFymFjHZVv3VtlW4aoBlbdSoQmYNSg8apk2Jw6oEaprIG90ws9rggRomKB1UDsGzVvXQz76WG/Jz/duWjW0W9dDPvp4b8nP925VHqgRiOkP3x8f+ev8AwWucwtj6QvfHx/56/wDBa73JPqDY51SuGgTlK7ZShi/BSKw+qltqmKzsXufcVbFiuLYU9wDqiNlRHc7lpLXfU4fQutZ0wN2ZMl4phMdutqISI7/HHab9YC+V8v43V5bx2kxaiI66lfxcJOjxs5p8CLhfVeV804bm3Bo8Qw6YOaQBJET24nc2uHI/buFvB2qKTPkKSGSCZ8Usbo5GOLXscLFrgbEHxBUtovqPNXRZlvNdW6tqIZaStf689M4NL/0gQQT42usJh/QRlmlqWyVVTX1zGm/VSSNY0+fCAfrUPGwowfQDl+WP8o5glYWxytFLASPWsbvI8Lho9hW/9J+NMwHozxysLgHupnQRi9rvk7Dbe131LY6enpcMoGQQRxU1LTss1jQGsY0fUAvnLptz9FmqWPCcMl48Mo5ON0o2nlsRcf0RrbvJJ7ltFKNImbqJxB7A022tsjw3HEParpWi5BCouWG4C2OOzvXuXf5RzL8lT/bItr90n73FF/8A2Uf3ci1X3L1jiOZCNjFT/bItp90oeHo4oT//ACUf3cinzOhflnj9zXj/AKVljEsCkfeSgnE8YJ/0cm9vJzT/AFlks6dH35Z6dsr4wIeKkdG6SrNrjigPEy/mXNH+6uQdBmPjBOlKhjc/ghxJjqJ/m7Vn/E0D2r65Q+GOHijTOe9N2Yv3P9GFc1j+CoxEiijsde365/qBy5Z7mwtOfMUt/s4/esSe6SzD6dm3D8CifePDoOukH/qSbfQ0D+sl9zP/AD+xX/8Arj96xKuBOV5KOv8ATSbdEONn+jF96xfOPRw8HpOy7b/X4/tX0Z02e89jn6MX3zF829G7v86GW/n8X2pBN+JH2dyXxLj7v+k+K6/9sm+8cvtvkuY1fQFlGtrp6uWbFBJPI6V3DUNAu4km3Z7ykaTi30PmRr/FXRyhj2ucdGkE+xfSH8HrJw/0+Lf3lv8AhXAc8YLT5dzviuE0bpHU1JN1cfWO4nEcIOp070qMmnHqfZtPMyopYpozdkjA5pHMEXC+X+mjDZaLpQxGV7SGVbI54yeY4A0/W0rqHQj0g02P5agwCsnDcWw6Pq2tcdZ4h6rm95A0I8L81uebMkYJnSjjhxanc58V+qnidwSR33se49xuE3yavxLg+OpncERvzX0X0CzPxDAaqvcHWaGU5cdi5tyfqI+lAe52y26cGfFMVliH+jD4239obddMwPAsNy3g8GF4TSspaSAWZG3XxJJOpJOpJ1UPGm1J+Q8blG16mH6RqllLkLEHOtd4Yxo7yXhcDNRLUSWHZat+6Uc4wYvVx4Lh0olp6Z/HNI03a6TYNB5ga+0+C0IMsbbkrxtbJTyceR6+li4w58z0sf1bbEarzVNU1jS550almnLGHjdcrV8ZxmNoMLbyF2ga3dxXNiwub4NcuZQXJZUZkfWVLqCljPVkEvcOTRuVrlG9smOlwHAwv7DySALeKMs8WFU74y21fNdsjmuv1bDbs+a8X5YkpAxtDNMGt26wNNvIL3MeDansR4eXPufiZuxfQ4fQzve2kIcO08v4j/8A9Wk1df6TLaJpZE09kH7V4Zamapk4ppC8nXVQ3toNlpiwd3y3bMcmbfwj0sltunE7b2J1OwXjuToFdFHaxdqV0UZWer1iQD2hr5pLkusQpw3ALdCOasB4h2gLjmpGUF44Dwu1KUOuErWknTVMRZyYrHY7tWVp1XnJAsVdxaApUOymZgdHcj1Vs1O3hpYWnkwfYtftxXbb1tFsvDYgdwCxy9EaY+orghZM/dKFiatic0QjbVG2iYrFIuFANE1tEAgLARdCxsnIQKAsqIQaNVaRoltZAhiFU8aq7kqnBANiDS6Qp7IWvdOhWA7JSE5GiCoVnqJuoUxCBGikdgW9dDfvp4b8nN925aLyW99DXvpYb8nN925OPVDT5MP0he+Nj/z1/wCC10clsfSF74uPfPH/AILXdrJPqDY51SP0smCDhqFNBYOQQI7N0x2QOjUxWQHsr14TjOJYDXCswutmo5xpxxOtcdxGxHgV5eSUg30TQWdOw/p5zNSxBlZSUFcRu8tdE4/1Tb6l7ZfdAY09locGoI3d75Hv+rRcksnAVbn6j3M2bMXSDmTNLDDiOIEUp/7PA3q4z5gau9pK1Sqb1lM8WvpdWjVA7KU3dibtGuTBrNdSCvI999gshWQcL3DkCvG5oBXcchs2QukbGOjyetlwmno5jWtY2T0ljnWDSbWs4fGKyWeOlzHs/YJFhmJ01BFTxTioDqeNzXcQBFjdx07RWhlKCWm/LmEUVudUemiq5qGtgq6d5ZNTyNljcOTmkEH6QuuD3SGcCNKHB/7GT/GuOixFxsna5FApNdDI5hxuszHmCtxivLTVVkhkeGCzRoAAL8gAAPJZTI+ecTyDi9RiOFQ0ss1RD1DhUNc5obxB2liNbha6RcJNkUK3dnSMz9N+ZM2ZcqsExCkw2Omqg0PdDG8PFnBwsS4jcDktNwPGJsDx2ixalbG+oopmzRtkBLS4bXtbRYpEGyVD3Nu2dmZ7ojNz23FDhH9jJ/jTfwhc3/6jhH9lJ/jXHI6gxHvBXobWR210KlpmiyP1Otfwhs3c6HCP7KT/ABrnOP43UZhx+sxesZGyorJOse2IENBsBpcnuWMNbFbU6INrae+sbneF7JUwc76sthlmpqmOemlfBPE4OZJG4tc08iCNQV0zA+nTOeEwNirvQ8TiaLB9Uwskt+k0i/tC5j6cb/mYmxjvA1VL3ySu4nOJRQKVdDs9R7pbFw3hgy/Q8fxnTvI+i34rVcd6XM35phfBVVzKOkeLOp6NnVtcO4uuXHyvZaHDBzcvYLAW5JMe5vzL219VRxSGlmcCW7K7D811vUcDg2Qs34x2vpXhPMeCphYGPLrbt1WUsUJLxIuOacX4We3Ecdr5gQ1lm21ssNFNMX8cXEyoILmyk6+Q7llWtHVv4te4rHTB0NSwtF2g/aqxwjDiKJyZJT5kzGzwvidd13cWt+9VWus++Nr4i1wBBFrLHuw/UFh05hbJmLR4mjVXM4iwtbe5Rq4xDI0N5tuq2zSNOh+pUI9UNOWetqruyL2C8rK1zPggqx1eyRtnRkeIU0xpovAvGOaFrNVcdRE7dxb5hO54c0lrgQO5Kh2UtcGN8SgTpdAd5HkiTcJisqeTsrojxREcxsqbcTrnZMH8LhwnZMVmQw5glr4m8geI+xbA71lisCgJ6yoI0PYb+Kyzh2ly5HcqOiHQRwuUNkx9ZQjVZ0VYh3RtdqNtkeSYWIPVQA7V04RsgViEKJkLaoCxCCEttU5Otkp1KdBYQErhqrQNEjhqkFlTglA1VhCUNuSqEK61ilGydwS2QI9bkpTFApUFigLe+hsf50sN+Tm+7ctGC3rocH+dLDfk5vu3JrqOL5MR0gj/ADi4988f+C121wtj6QPfFx/54/8ABa8NkmDfJLLLYRl2pxqGSWCaKMRu4CH3ve1+QWJK3jIf8m1fyw/VV44qUqZ53aWonp9O8mPrwYw5ExA/9qpf+L9iEmRsSDOzNTPPdxEfgtwxXFIcIo/SZ2PeziDLMAvc+fksbT5zwqZ4a/roL/CkZp9IJW7x406Z4GPtDtHJHvIK17GmV+B4hhjOKppnNjH+kb2m/SNljtnLsPYlj+C9jx5hwP2hc1zPhbMKxl0cItBIBJGPijmPYVnkxbeUen2b2o9VLusiqXzBg+XanGoJZYJYoxG4NIffXS/ILJfuFxD/AFqm/wCL9iyOQ/5OrPlW/qrO4ricOE0XpM7HvZxBlmWvc+auOOLjbOHV9paqGqlhw+vHBqIyLiA/7VTf8X7F5sQyjWYfQS1ctRA9kQ4iG3udbd3is9+7rDv9Xqvob+1eLGM20WIYPUUkUM7XytsC4Cw1B70nHHXBti1HabyRU48Wr4XQ55WQvkq+rYxznSGzWtFyT3ALOUHRnjNZGJKmSChB+DJd7/aBt9K2jI+FxO63E5GB0jHGKIn4OnaI8dQFsGOY7R5fw/0qsLiHO4GMYLue7uC1xq4psjXdo5Y5u4065+pocnRJU8F2YvCXdzoXAfasFinR7mDDWOe2mbWRDUupncRH+7ofqW4M6VcO6y02HVcbPjNc131aL0Y3n3CX5Vq58MrWuq3N6uONwLZGl2nFY9wubq6RjDUdowmlON3+n9jmOXsFqMdxhuH00kcUjmOfeW9rN325raKjowxWnp5Z3VtGWxMc8gcdyAL93gvF0ZC2dovkJfsXXMT/AJIrPkJP1ShI11+uzYM6xwfFI+fGu0BTnUJAOw0juCLTqoPfNqwbo/xHGsJhxCCqpY45r2a/i4hYka2HgsfmTK9Vll9O2qnhm9IDi3qr6WtvceK6hkL+ZGH+T/13LWOlj+Pwr9CX7WqmuDwMGuzT1jwyfht/tZq+W8rVWZn1DaWeGL0cNLutvre+1h4LIYv0e1+D4VNXz1dNJHDa7WcVzcgcx4rMdE/8fiv6EX2uW055/mXX+TP12orgM+vzQ1iwxfhtfvRxcQNVjIWAbJtiiNws2fQm14bkCvxHDKetiqaVkc7A9rXcVwPHRen97PFNP8so/wDj/YshgefMLw3AqOimhqnSQRBji1jSCfDVZrC874bi2JQ0UENS2WUkNL2gDQE9/grSifOZtT2jCUmo+FX5eRrP722KAW9Mo/pd+xEdHGJgf9co/pd+xdIJsLrUv3xsIvb0es/qN/xIcYo5sXaOvz33auv0NRxzKtXgFNHPUTwSNleWAR3uDa/MLAB7R2RrYarbc45qosbw2CKljnY6KQvPWNAFuG3IlafTMdIW8LbuedB39yzaV8H0ejnmliTzqpG04NlCsxzDfSoaiGBnGWDrASXW3Oi9MnRjiLiHflClcRrbhdr4Lf8ACKAYZhFLRN3iYGu8Xcz9JKegrocRpjPAbsEj4/a1xB+xaqCPmsva+pc5Sxvw36f0OHvDmzuY4Wc3Qg8jzVY3IWezvh5wzNVQ5g4Y6kCdnt3H0grBxjsgncrJqj6vDlWbHHIvNGaw3ItZmOgbWU9TTxsa4x2k4r3Fu4eK90HRPXN6wT1lI4ObZpbxXB79ltPR4f8Aoy/5w/7GrLY7j9Ll+nhmqo5Xtmf1Y6sA2Nr63K0SW3k+bz9oapamWHFzzxwc1l6JsbaCY6uhkPdxubf6WrX8WyfjmCsMlZQPEI3ljIkYPMjb2rrkedsLe8B7KiMH4RYCPqKzlNVQVtOJqeVssTtLt1Hkf2ITjLowlr9bp2nnhx7V+583DRWRvaw3sSV0vPOQYS12KYS1kAGs8IFm/pN7vEe1aIMCq++L+slJpcM93S6iOph3mM8bXS1ErY4o3Oc42a1ouXHuAW3Yb0aY5WxiSpMFA08pSXP/AKo29pW55FyhFgNC2tqmNfiM4uXb9U07NHj3n2LYsRxSkwqAS1UnDfRrQLud5BVSStnjantXJLJ3WmVv16/0OfHoimLdcajv3CnNv1l4ZuivFaeTibUwVUI1Iju159h/aty/d1S8dhRT8Pfxtv8AQs3hmL0mLRF9M88TfWY4Wc32KU4y4TMZ6ntHTrflXHsvocx9H9E/MdWYjH2eAixCDl0TMWCMxSkdLGwCriF2OHwh8U/gueELknBwZ9FoddHWY9y4a6oQ7hQhE7qDZSd9iEI2RcpZArFA1TW0QG6bkgLFI0S2T8kLICyojtKW1TH1rWQ5pisYbJXDVOBdBw1SHZSd0tu0rCNULapkiEaoWsnIN1CEwsvISlMoQkKxAt76HB/nRw35Ob7ty0a2q3rod99HDfk5vu3JrqOL5RiOkAf5xMe+eP8AwWujZbHn/wB8TH/nj/wWvAaJA3yALd8ifybV/LD9VaQBqt4yL/J1X8sP1Vpi/EeR2x/xJfD5l+df5AHyzPxWgBdaqqOnroeqqoWzR3DuF211TTYRh1JIHwUUEbxs4N1HtK2nicpWeLoe1IaTD3bi27FwSGWnwKjimBEjIgHA7jwWqZ8e12I0rAe0yIk+12n2LZ8XxykweK8zuOZwuyJu7v2DxXOK+tmxGskqZyDJIb6bAcgPAJZZJR2o17JwZMmd6qSpc/Fs2/If8nVfyo/VXtzhDLUYDwQxPld1rTwsaSba9y8WQ/5OrPlR+qtnkljhbxyyNjbtdzg0fWrirhRx6zK8WveRK6a+SOVfkyv/ANRqf7J37Ek9HUwMDpqaaJt7cT2Fov7V1P8AKFH/AK5B/at/atfzpVU8+BsbFURSO65ps14cdj3LKWJJXZ62n7Wy5sscbx0n7jZGqGPweanv24pS4jwcBY/UU+dMuS5hwuJtM9rammeXsa42D7ixF+RWmYXilRhNeKmCx0s5h2eO4rfsIzPhuMHq4phFUjQwSGzr+HxvYtMUk1RxdoafNptR9pxq119vWzieJ0NVh1WaesppKeUfBe21/Lv9i8YAsvoevw6jxOmNPXU0dREfgyNvby5g+S5fm/IJwaF+IYa58tE3WSN2r4h335t+sK2ju0nasM7UJqn+x5OjQf8ATaI/+hL9i61if8kVnyEn6pXJ+jYWzrF8hL9i6xif8kVvyEn6pVLoeZ2r/wAqPsvmz55jdwtaDtYKwjVUN1YPIKyJxGh1Cg+rO25B/mPh/k/9dy1npX/j8K/Ql+1q2bIX8yMPt3P/AF3LWelb/rGF/oSfa1U+h8ppf+xfvL6k6KP4/Ff0Ivtctnz4bZJrz4M/XatZ6Kf4/FP0Ivtctmz5/MjEPJn67ULoGq/7Fe8foccD+IJwvODYq5rrrM+tTLQFsGStM4UH6Tv1CsA0hZ/JQvnCgPi79QpLqYav8ifs/kddPqnyXCjZpPmu6n1T5L5/qatvWOaDzVzVnh9hP8z4fUeaQOFuS2LI+HHEMywOe27IPz7u7TYfTZazA0yAOdtuuo9HGH9Tg82IPbZ1U/hZ+g3T6zf6FMVyer2jn7nTya6vhfE2PGq4YbglXWE2MUZLf0joPrIWn9GWJGRuIYe51wxzZme3R312PtV/SdifouDU9E09qok43AfFbt9ZH0LUcnV/5IzHQl5s2Z3VSnwdp9tlbfJ4ul0m/Qzfm+V8P9ZuXSThhqsGgrmNu+lk4XfoO0+o2+lc5GgXcq6jZX4fPRyjszMLD4X5/SuG1gNHLJDKLSRuLXDuINipmuTt7Fz7sTxv+X5M6d0dC2V3fOH/AGNVPSPTPqcLoGMsLVBJJ5dgpujOQy5UkeedVJ9jV6M8/wAm0vyx/VKcuIHn4+e0/izSGx9XE1gJPCLXPNZzKde+jxpkPF+ZqTwObyvyP4e1YVpuLFerCwfyxSW365n6wXFFtSs+r1MI5MMoS6UdQexssbo3i7HgtcDzB3XNKHDgczR0D9Q2o4HeIB/YF0081pFJwnpHkPLrn28+Erryq2j5LsrLKEM1f+Lf9Dd91zfMVY6uxuoeTdkZMbB3AafbcrpI3HmuVVIPpUt9+N1/pKnO+Ejo7BgnknN9Ul+//o84Fl78ErXUGMQTAkN4g1472nQrw21Rjv1gt3rlVrk+pyRWSLhLozrWx8lzTH6YUuO1UTRZvHxNHgdfxXSxsufZut+6OW3xGfYuvMvCfI9hSazyj6r6owRGqIRO6AXKfYWByIUKKAsS2qYIbFMEBYvJBMggLFOqS2qsOyS2qYrGAUO4RaoUh2I4JbJyk14kxWCyFkx3QsgVl4CBHcmUskKys9y3nod99DDfk5vu3LRn7reOhz30MN+Tm+7cqXUqL8SMXn8f5xMe+eP/AAWvAaLYs/8AviY988f+C134KTBvkC3fIv8AJ1X8sP1VpAW75F/k6r+WH6q0xfiPI7Xf/wAWXw+Z7s1VlRQ4MJaaV0UnWtbxN3tqsdlXMM1XUPoq6YySO7UT3bnvb+I9q9edP5AHyzfxWhRSSQzskjcWPYeJrhyIWk5OMzz9BpMep0bi1zb58zo+YcHGLYeQwD0mK7oj397fb9q5qbh5BBBBsQeS6jg+JsxbDY6ltg/1ZGj4Lhv+1axnHBepn/KcDfzchtMANncne37fNGSNrcieytVLDkely/D39Pj/AL1PbkT+T6z5Ufqr051/m9//AJmfivNkX+T6z5UfqrOYthkeL0Xo0sj428Yfdlr6eauKvHRyajJHF2i5y6Jr5I5bwi2wS2tyW9fuGov9bqPob+xePFspUuH4TUVcdTO98Tbhrg2x1A/FYd1Jcnvw7W005KKfL/Rmn7krF1rerr/B4B9q6jgGEUGJZXphVUzJHXeA/Zw7R5jVeTEejmjq3sdBXTQcPJzA/wDYtIQa5Mpdq4FOWOdpp0YfJ+bcQZidPhtbI6qp53CNjn6vjJ215jzXR5ImVET4ZGh0coLHA8wdCtawXJFJhNcyskqH1U0erLtDWtPfbmVlsdxiDAsHmrpnAFgtG3m9/Jo/+bLoPntZLFnzr7MuvzOXdH5FP0gshJ2bNED32B/YuuVcJqKKeEbyRuYPMtI/FcDwyvmw3F4MRj1lhkEn6Wuo9tz9K7xhuJUuLYfFW0cgfDILjvaebT3EJI6+18co5I5fKq+J89mMxkscLOb2SDyI3QtYE7LseO9HuGYzWvrI5ZaKeQ8T+rAc1x7+E7HyK8mH9F+GU07ZKyqmrWtN+rLQxp87XJCVHortbTuO5t36UZnJFO+lyVhkcgIc6IyWP9JxcPqIWpdK8jTWYZGD2hHI4+RcB+BXR5ZYaSmfLK9kMMTbuc7RrWhcNzZj5x/MU1ZHcU7QI4Qd+Ac/Mm59qb6Hmdmxlm1Tz1xy/wCpt3RP/H4r+hF9rls2fP5kYh5M/XatY6JnB02K2+JF9rlveM4XFjWET4fNI+OOa13MtcWIPPyQuhGtmoa/fLonH6HA07CunfvV4Z/tCs+hn7FB0V4Zf+Uaz6GfsU0z2P4tpvX9mc3a6y2LJLyc40A73O/UKwWI07aLFqukY4uZBK+NpduQDbVZnI5vnPD9PhO/Ucprk7dRJS082vR/I7E71T5LgPoTOMufqb3su/H1T5LgE1Q6dxFuFgO3eqkeL2H/APZ8PqWxh1RPHTQNuXuDG2+E4mwXc6CjZh2HU9HH6kEYYPGw1P0rlvR9hvp2Z2Tub+aommU/pbN+vX2LqlXUsoqKapk9SFhkPsF0RXmR2zmc8kcMfL5v/f3Lizi3ZfzbdDqh/wCGP6q4VU4jUyzPcaiXje4vfZ53Ott15ZMTqY/VqJv7Q/tRuH/BJf8A6ft/k+gD4rkHSRhTqLMslUxpEVYwS6fGGjh9h9q2voyxV9dl+almkdJLSykguNzwu1H1gr1dIOGCuy2Zw276R3H/ALp0d+B9ib5RzaNvR6zu5P8AT+vT6Hn6Lv5oP+dSfY1XZ/k6uhw++zqgg/1Sk6M2dXlN4/8AyZPsaszj+X4Mw00MM88sIhf1gMdrk2tzQ1caJlljh17yS6Js5wQQVncp4e+rxhlQWnqabtuPLi5D8fYs9BkvDoyDJLUTW5Eht/oCztPTQUcAhp4mxRt2a0WCwhiads9PWdsY5Y3DD1fmO+RsUbpHmzGAuce4Bc2ocQ4cyRVz9A6o43eAJ/YVnM0ZhZLE7D6N/G12ksg2P9EfiVqISyTt8eRfZWicMUpZFW7j4f5Ou7HyXOcfo3UWNVDC2zXuMjD3g6/bdbVlrGm4jRMp5XWqom2IPwwNiPxWQxHCqXFYRHUsJLfVe02c3yK0nHvI8Hl6TNLs3UOOVcdH9Gcx5r24NRur8YghaLguDnHuaNStkOR4OO/p0vD3dWL/AGrN4Zg9JhMbm07DxO9aRxu53/JZxxO+T19T2xhWNrE7b/Q92581zXH6gVWPVUrTdvHwg+A0/BblmDGmYXRujjcDVSizG/FHxiufFPNLyOfsTTyjuzy8+EKd0OaY7pTusD6SyHVEBTkiEDsQjVEbokaqAaoFYCELJiNVEBYhGiRWEaFLbRNCsjUSFGpnJDsS2iUhOBohbVMLEIQTkbpbIEXKWujZQJE2VuC3fod99DDvk5vu3LSXLduh33z8O+Tm+7cqRUH4kYvP3vh4988eteGy2PP3vhY988etcCTFJ8sm4WWwbMM2DQSxR08cokfxkuJFtLcliRoVOaabXKMcuOGaOzIrRm8WzLPi9EKaSmiibxh92uJOnn5rxUmA4xXwCoo8JramF1wJIqd72m2+oFllsk5Pq854+yjh4oqWKz6me38WzuH9I7Ae3kvojFcZwHo+yzCJnNpqWBnVU9PHq+Sw9Vo5nvPtJVcy5Zrp9NDHCoKkfONCzHsrCSqnwirhp5LMd6RA+Nl+WpG+6unzpNUQvglw+nfHIOFzS52oRzpnvE86Yj1lSTBRxn8xSsddrPE/Gd4/RZavftI3NcI5cuk0+Se+UbfqZnCMwzYLDLHFTxytkfxdtxFtLW0WR/d3V2v6DB/XctXOyHJClJcIjJotPkk5zjbfubV+7qq/1KD+s5ebEM21GI4fNSPpIWNlFi5riSNb/gtfGyHNG+T8yY6DTRakocr3MphuZMQwqMQxOZJACSI5G3A8iNQsrJ0hPgh45MNa62/BLb7QtUO689cL0Mtvi3VQk1wGXQ6fK3KUef6fIztX0q1ZaW0mFwxu+NLIX29gAWnYrjOIY5UifEKh0zho1uzWDuAGgXl0cEq6Aw6XDhd440wLI4TjmI4FOZaCoMXF6zCOJj/NpWPUdsg6JRjNbZK0b7S9K1SGgVOFRSO+NHKW39hBT1HSvLq2DCGNdbeSYkfQAFoETdbpTrKfIoOH+Haa72fu/wC5k8czVi2YDw1tRaAG4gjHCwHy5nzWFsrOHVThQdkIRxrbBUjNZXzVUZXfUugpYqj0gNB6xxFrX2t5rYh0s15/+10v9o9aEWpbIMMmjwZZb5xtnQR0r1x/+10v9o9EdKtf/sul/tHrn4PemDkcmf8AD9N/4fM9VbVurcRqKtzQx08jpC0bAk3svTguKyYPi8FfHGyV8JJDHEgG4I5eaxt0eJI7HGLjsfTob+elGuIt+TKX+0ctGcdSe9Vh9yrGRcer3Bre9JmeHT4sF92qs2HK+ap8Ahnip6GGbrnhz5JHOB0FgNPb9K9mPdINXiOFTUBpYIeuADnMc4kC97arVJaxkbergG3NeIkuJJJJKOSZaXDKfeOPi9S0zgXAFz3lU6vPeUQ25XpghsbkFHQ6TL5Tx+oy9VzSwRMlMjOBzHkgb3B07vxWzVHSJVVNNLTy4ZTOjlaWOHG7Yiy0d7OqeJ49besPBekEPaHDUHUJWznnpMOWW+cbZsOAZwqcBw40cVJDM0vL+J7iDrbu8lkz0lV1v5Opv67lpdtUeSVsU9Dp8knKUeX7m7wdINfUuLG0lNE639J34qiuxvEK9vBPUO4Duxg4W/QN1qlNJ1VSx/IHXyWc5rLI2aYtJgxO4wViOGqUBWO5JbbrI67Hhe+Nwexxa5puHNNiFnqXN+IQANmZHUgc3dl30j9iwDESmpOPQxzYMWdVkjZtX7uNLfk/X5X/AJLyVWca+ZpbBHFTg8x2nfSf2LXza6nwlXeSfmcseztLB2ofN/MaWR80hkke573G5c43JSW0RsodlB3rjhCkc0u6cjRLZMLI3ZEBBvNMgLFO6IGqh3RQFgcEisdqEvJAWCyW2isskPNMVgaExGyDE52QOxANUpBVltUCEBZXZCya2qBGqBWWoBNbspUE2Kea3bod99DDvk5vu3LRydVvHQ976GHfJzfduVJFY340YvP3vh4788f+C14FbBn73xMe+eP/AAWvc0qFJ8sPNbLlbIGN5wpKipwv0bq4JOrf10vAb2B00PIrWOa7t0A/zdxb5237sJpFY0pypmEwfo96TMApX0+FYnS0cUj+NzY6gWLrAX1Z3ALx4r0UdIGN1pq8TrKSsntwh8tUSQO4dmwHku0ZmzPh+UsJGI4kZRAZGxfmmcZ4je2nsWpfv4ZR+NX/AN2P7VVHTKGNcNnKMb6Kcy5ewWpxSu9C9Gpmhz+rnLnWJA0HCO9aW4artmeOlfLeYclYlhVC6s9JqWBrOOAtbcOB1N/BcTJ1SOXJtT8LIdkOSJW+dFeQ2ZvxiSqr2k4VREdY0adc86hl+62p8LDmiiYpydIwOXcl5gzQOLCsOklhBsZ3kMiH+8d/ZdbpB0C5hewOmxPDoXH4I4329tgu8MZTYfRhrGxU1NAzQABjI2gfQAAtAxPpuytQVLoacVmIcJsZIIwGHyLiL+xFI6+6hBeJnPq/oJzPTxl9NU4fWH4jZHRuP9YW+tc9xvAsTwSeShxShmo5i02bI23EO8HYjxC+lctdKeWsz1rKKCeWkq5NGQ1TOAvPc0gkE+F7rPZhy5huaMIkw/E6cSxOF2uHrRu5OaeRCdCeGM1cGfDQuPMbohZzOWWarKGba7B6vtOhfdkgFhIw6tcPMfQbjksM1twug4XxwxbLY8OyJjGKYdBW0/o3Uzt4mcctja9tRbwWviMldpyaLZNwwf8Ao/8AuKEeb2hqZ6fGpQ9TndXkDG6GgmqXsp3shaXuEcvE4gb2FtVqjNZR4r6KXF85Zf8AyDmI9Uy1HUkyQ9ze9vsP1EJtGGg7Qlnk4ZOvka6RqtiwrI+L4zhsddS+jdTISG8cvCdDY6W8FgCNV2PIH8yaLzk/XKSOjtDUT0+NTh1s5TjeBVmAVrKWt6rrHsEg6t3ELXI/BYwhbx0oC+Zaf5q39ZyxGUsuHMWMCJ5c2lhHHO4b25NHif2oNcWovTrNk9LZjsKwHE8bkLMPpJJg02c/ZjfNx0WzQdFmLvaDLWUcJ7ruf9gXUqWlgoqVlNTRMhhjFmsYLALW8S6Q8Cw6odA18tY9ps7qGgtB/SJAPsTo8h9o6nPJrBH6/wCDUZ+i3GI2Ew1dHOe7icw/WFq+KYLiOCzCPEKSSAu9UkXa7ycNCusYX0gYHilQ2DrJaSV5s0TtAaT3cQJH0rYK2hpsRo5KSshbNBILOY4fX4HxRQLtLUYJbdRH6f4Pnm6jWvke1rQ5znGwAFyT3BZnNGX35dxp9ISXwPHWQvO7mePiNitx6MMCh9GlxmZgdLxmKC49QD1nDxN7ewpHr5tXDHh75cryNfw/o4x6ujEkscNE12oE7+1/VAJHtXuk6KsWa27K6iee7tN+uy6LjON0OA0Yqa2Qta48LGsF3PPcAsHT9I2DTPs+KrhHxnRgj6inwePHW63Kt+OPHsaBW5OxnCQX1NE50Y3kiPWN+rb2rwtHCF1PH800TcsVE+H1kcsso6lnA7tNLtyRuLC617o+waKsrJsQqGB7aUhsbSLjjOt/YPtUNcno4NbNYJZc8ar9zH4dkrGMRibIYGU0bhcOndwkj9Hde+Po2xKFjmtraRwvdo7Qt9S3/EMQpsLon1VXJwRN52uSTsAOZWvDpCwjiPFDVtb8bgB+oFOkjz467W5/Hijx7GnYhlDGcPaXuozNGN3QnjA9g1+pYQtI0O4XWp82YY7BKiuoquOV8bLsZfhdxHQaHXdcrjZLV1TY2gyzSvsBzc4n9qTVdD1dDqc2aMnmjVfArgglqZ2xQRvlldoGMFyfYt3ocpYrNTMM7Yqd1tQ91z9Autmy9l+nwGiDGhr6l4/OzW1ce4dwV2KY9h2EOYyrntK/VsbRxOI77ch5ocE1yedl7Vyzns00fqa6/JdZbs1VOT3WcFjK7L2JUDTJJBxxjd8Z4gPPmFs7c4YeXgPjqGA/CLQfsKzdPURVUDZoJGyRu2c0qVCD6ES7Q1unaeaPHt9UcrZ6ycrZ80YFHB/9QpWBrSbSsA0F/hD8VrDgVhKO10e/ptTHUY1kiB24QO6JGyhCR0WQ7IFNa4QIQKwIEIoICyNCKAR5JhYCjZAphqEBYp2Q5pjshZAWKL3soeacBBw3QKxG7JjsoBZE7IHYNkSgRdMgLKraqWTkaoWQKyHayVHklKdEWI71lu/Q776WG/JzfduWkHdbx0O++jhvyc33blVFY340YrPvviY/89f+C107rYs+++Lj/wA8f+C14oFJ+Ji813foA/m7i/ztv3YXCV3boA/m7i/ztv3YQjXTv7xGU6cIpJuj9jYo3yO9NiNmNLjs7kF89+gVn+p1P9i79i+yJJGRN4pHtYNrk2VfpdN/48X9cftTOrJh3yuz45fTVELeKWnmjaTa743NH1hVHdfQHTpPFLkWmbHKx59OYbBwPwHr5/O6Rw5Y7JbbIdgvqHoqwpuE9G+FtDeGSpZ6VIe8vNx9XCPYvl1/qHyK+vcrADKGDhvqiiht/ZhM30vMmznfTtmGWjwiiwSCQs9OLpJ7c422s3yLj/wrhPNdR6eyf3Z4cD6ooRb+0df8Fy4JMzzyubAHOY8Oa4tc03BBsQeRHivqzo/x+TMmRsNxGd3FUOYY5j3vaS0n22v7V8plfRHQYXHo7cDsKyUDy7P43TL00vHRpnulsGj4cExtjbScT6SR3eLcbfsf9K4XG380V9K+6NYHdHNI62rcRjt/Uevm6MWjC1j0I1HGRihnsXY8oWOUMNtt1X/uK43K6wsuxZN/mZhnyP8A7irR8/2v+VH3+jKqTG+rzpX4NUP/AIwNmpyf0BxN/Ee1X5pwJuP4HJTAD0hh6yBx5PHLyOy0DP1RLRZ4FTTvLJomRSMcORAXSMDxaHHMGgr4rDrBZ7PiPHrN+n6rIPMzYpYY49Rj80v619Thckbo3ua9pa5pILTuDzC7DkD+ZNF5yfrlan0jYD6JXtxaBloao8MoHwZO/wBo+sFbZkH+ZVH+lJ+uUI7u0Myz6WOSPm/ozTuk7+ctP81b+s5bP0cULaXKoqLdurlc8nwHZH2H6VrPSaL5mp/mzf1nLd8lgDJmGW/8I/rFBlqZNaHGl519TwdIeKyYdlvqIXlkta/qrjcNtd34D2rkBaukdKpPDhY5XlPt7K51a6Geh2XBR06a87K+G4XZshYrJiuVouveXzUzjA5x3IFi0n2EfQuOcK6Z0V3/ACZiIO3Xst/VQie1IKWnt+TL+k+gbPl6CsA7dNMG3/ouFj9YC9HRtURy5RbC0jjgme1w7rniH1FerPzQ7JVaD3x2/rhc6yxjlRl3EDNG3rIZQGyxXtxDvHcRyR0OHT4ZanROEeqfH+/E37POXanHKKnlo+3NSlx6q9uMG23jouavgkp5XRTRujkboWOFiPYuyYVjdBjMPHRzhzrXdG7R7fMf/AnxLB6DF4erradktho/ZzfJ26TVk6TtCWk+5yx4X9UcX5roXRxOw4fW09/zjZRJbwIt9oWv5kylNgf+UQvM9ETbjI7TDyDv2rGYPitRg2Isq6cgkaOYdnt5gqVwz2M6jrdO1ifU6XmzBpcbwbqadwE0TxIxpNg7Qi1/auW1VJU0U5hqIXxSN3Y8WK6xg+Y8PxqMdRKGT27UDzZ48u/zC9tbh9JiMHU1lOyZnIOGo8juFTV8ni6XXT0X3WWPH7nEIpOF74ToHat8O9bZkWiiqMxsmB4hTxGQ35O9UfaUua8kyYZTursOLpaeM8TmnV8Y/EL29GojfWV8rN3RMv8A1iprk9fUamOXSTnjfkb5PM2mppZ3+pEwvPkBdcVraubEK2WsncXSyu4ye7uHs2XXcw3GWsR4d/R3/YuPEEJyOPsWC2zn59DMU8nXUzXHfYrZMnVzosTfRk/m52lwHc4f8rrT8NmHE6I89Qthy7pmOjt8c/YVilUj1dZFTwTi/RnQaiBtTSywPF2yNLT7VzCRpaS0jVpsV1MbhcyrgBXVAG3WO+0qsq6M8jsWb8cfY852CCPJTksT6GwgCyBsmGyVA7FQsmQOiYrAN0QpzRQFinZMNtEN0zdBZAWAjRA2CYpdLoCxmt7IKQ+sQrBtZK4a3QFiWTWQAsU41QFi2U5bI96g9VAWK4aqWUOpUQKxLXS2VnIpSqM7KyNVvHQ8P86GHfJzfduWkHdbv0Pe+hh3yc33bkysT8a9zFZ+98TH/nj/AMFr1lsWfvfEx754/wDBa8gJvxMWy7t0A/zdxb5237sLhXJd16Af5u4t87b92EGum/MRkOnX3vGfPYvscvnYAdwX1hnfKTM6Zfbhb6x1GBM2brGxh57N9LEjvXPv4PlP/wCY5v7q3/Eg31GGc53FHEgNdkCuq5s6Gocs5VrsYbjctSaVgcIjThoddwG/FpuuVkWumcU4SxupA3C+p+jPEm4p0cYNMHAuigED/BzOwfsXyxyXT+hnPMOA4jLgeJTCKirXh8MjjZsUu1ieQcLa94Heho202RRnz5md6fMGkfFheNRtJZFxU0p+Lxdph+kOHtC4qvsXEcOpMXw6egroGVFNO3gkjdsR/wDOa5NiXQDC+pc/DMcfDCTpHUQ9YW/7wIv9CRvnwSlLdE4k7TUmwC+oui/BZcD6PMNp52GOeVrqiRp3BeeIA+QIWvZY6EsKwevircUrHYpLEQ5kRjDIg4bEi5LvabeC6NiGIUmFYfNW1s7KemgaXvkebBoQXp8LhcpHJPdCVzH4VhWE8QL5ZH1Dh3BreEH6XH6F88AmO7XDVui33PGZ5M35qqMTc1zINIqeN27IxtfxNyT4laZiUPBIJQNH6HzWkHXBxZZ75to8DjxLsmTf5m4Z8j/7iuOD1l2TJ+mT8N+S/wDcVoeF2v8AlR9/oznvSMP+l8nyMf2Kzo8x78mYuaCd9qasIAvsyTkfbt9CTpEF84S/Ix/YtXjFnhB1YsUculjjl5pHecTw6HFcMnoagfm5m8JPNp5EeIOqxeTKObDsuiiqBaWnnljd3HtXBHgQbo5SxwY3grXSOvVU9o5h3nk72j67rOpnzM3PEpYJepy3pM/nJT/Nm/rOW19HtW2oyjDED2qaR8RHdrxD6itW6Sx/0jg+bN/WcvJknMLcDxR0dS7ho6qzXn4jhs7y5Hw8kj2p4Xm0MVHquTaukrDn1WX4aqMXNJLxO8GuFifpsuWWX0C9sdRAWODZIpG2IOrXNI+sFaTiHRlSzTufQVzqZhN+rkZxhvkbg/SmY9n66GKHd5ePQ5nYrrfR3h76LK4mkaWuq5DKAfi2s37CfavFhnRpSU87Za+rdVtab9U1nA0+ZuSR9C3QmOCEklsccbdSdGtA+wJC7Q10M0O6xcmr9IlUIctsgv2qiZoA8G6n8FzNrvBZ/NmMjHcXDoifRYBwRX+F3u9v2ALacGyvhWLZUoH1NMGzGM/nYzwv9Y79/tUvlnbgmtBp4vIurOexTGKRskbnRvbqHNNiPat6ynm6pq62PDq93XGTSOb4V7Xs7v8ANV1HRt2iabErN7pYrn6QVksv5JjweubWz1XpE0d+ANbwtaSLX7yUJNE6vV6TNidu35cO7NjrKaOtoZ6aUBzJmFhHmFxMxOaSL3toV2PGsSjwnCJ6qRwBDS1g+M4jQBa1lXA8PxfK4NZTtfIJngSNPC8bcwm1ZydnZ/s2KWSa8LaXzNEZdrgQSCNQRoQtvy3m+riq4aOueaiCRwY17vXYToNeY817Kno8jLr0uIOaPiyx8X1iyuwnIkdFXR1VXVCfqnBzY2M4QSNrkqUmd2o1mjzY2pO/g7Ntc1r2lj2hzXaOB5jmFzfJfDhGfa7Db2ilbIxnm11x9QK6HWVcNBSS1VQ4NjiHE4nn4eZXITXzNxUYizs1DZuuae51728uSpujz+zsMsuPJHya/c69V04q6KenO00bmfSLLi9RE+CZ8MrS2SMlrh3EaFdgwfFqbGsOZV0zt9HsvrG7m0//ADVY7Hco0WNTGoD3U1SRZz2i4f5j8UNWToNUtJOWPLwn+zOVscYpGvbuDdbzk+m9KxZtUB+bhYXX8SLAfb9CkXRuetvLiY4P6EWv1lbdhmF0uEUTaWkYWsGpLjdzj3kqdvNs7db2jiljcMTtvg9UkjYYnyuNmsaXH2armEjjI5zzu4l30rbc1YuyKnOHwuvLJ/G2+C3u8z9i1G91GR26L7JwvHjeSX83yE1sjyUA1Rssj2LABohZOApYAoCxCECNE51KFkwsVEhC101kBYgTtF0h3VjdkBYCNEugN1ZyVThogLHGoSvUF7KFAWAbpwlG6cBAWLzR+CmtqhbQoCypRQopisB9UhKRoE3JAp0Z2Id1u3Q/76GHfJzfduWkkLdeh730MO+Tm+7cqLxP7yPuYvP3viY988f+C15bDn73w8e+eP8AwWvJCm/EyLechdJRyNh9XSjCxW+kyiXi6/q+HsgWtwnuWjFAp0KORwdxOy/wgnf+Wx/fP/0QPug3/wDlsf3z/wDRcaQKKNftWX1On5p6ZnZmyxW4OcDFN6UwN630nj4bOB24RfZcwPMoKJ0YzyyyO5ECCPNBOiLN6yt0s5jy1TspHPZiNGwWbFU34mDua8ageBut4g90BROYPSMAqWO59XO1w+sBcPamaFLRvDUZIqkztFf0/jqiMPwB3HydUTiw9jR+K5tmfO2OZuna7E6q8LDdlPEOCJh77cz4m5WCI0ShIJ55z4kwkKqeETwOjPPbzVygQZWa5Yh1iNQdQtvwjpDOFYRTUP5MEvUN4ePrrcWpO1vFa7idOY5xMB2X7+axoFytkzPLhhnjtyKzKZhxn8v4u+vMHUcTGs4OLi2HfZY1g7QUsmbo4JmkIqEVGPRGXwDHpsvYoaqNnWse0skiLrB45a94K2j99A/7JH9v/wDqtCfuUAEGGXSYc0t042zL5lx390OIsq/R/R+CIR8PFxXsSb3sO9YdEoAoN4Qjjiox6Iz2CZuxTBGCGKRs9MNoZdQPI7hbRB0mQuaOvwyRrv8A05QR9YXPBZWNAQc+TRYMr3SjydBl6SYi38xhkhd/6koA+oLXcWzJiWNN4J5BHBe/UxizfbzPtWEBsrI3C9rqW2Vh0eDE90Y8j8K2HB8312E0zKUxxVFPHo1rhwuA8x+KwKFwpOjLihljtyK0b2zpCpy385h0wP8ARkBCpqekI8JFLhp4uRlk0+gftWlXQJKds4l2bpk72/uz04rjFfi9SJayTj4fVYBZrPIL24JmuvwSHqI445YOIu4Hi1id7ELEckdkWdcsGOUO7cePQ3eLpIpy387hsoP9CQEfWEs/STFwH0fDXl3/AKkgA+oLSSAeSrMdzoE7Zyfw3TXe392ZDGMw4hjkg9JlAiabtiYLNb4+J8SsfrZEREaoSEgapHdCEca2xVIalxSswXEGVVFUOiedHgahw7iNitzpOkaVrQKvD2vPxon8N/Yb/atDqXNfDbhAsrYjx0zXcwLJ9DDNpsOZ/eRs6A/pIpA08OHTk+MjQFjZc/V1fUdRDFHRxuFuJp4n/SdvoWmuJuix3A4OG4Q22Yw7P08Haj9TYi4ueS4kk6knmmAsqKaYVEIeN+avvdYNHamAbpkvNOEgsVA7piReyBQFktqgigmFgA1TW0Q+EmJ0QFlRCZuxUTbBFCsISEaJwg7ZA7EHgoRqiwaIuCAsUDVO0JQmCAsh3Uso5RAWVkJU5SEapisKBRQOyozsQrdeh/3z8O+Tm+7ctKOy3bof98/Dvk5vu3J+ReF/eR9zE5+98PHvnj1r62DPvvh4988f+C18IJm/Gyc1ncvZIx/NdNNUYPRsqI4H9W8umayzrXtqe4rArunQF/N3Fvnbfuwh8GmCCyTUWaB+87nb/ZcX96j/AGqqfojztAzjODdYByjqI3H6OJfRWP5iwzLOGivxWoNPTl4j4gxz+0b2FgCeSw+H9JuT8TqWU9PjkAlebNbM10Vz3XcAErZ2vS4U6cufdHzNieDYngs4hxPD6miedhNGW8Xkdj7F4l9j4jhlFi9BJRYhTR1VNKLOjkbcH9h8V8u5+yocn5tnw5jnPpXATU7nbmM30PeQQR7PFNOzl1GmeJbk7RTlzI+P5rgnnwejZURwPEby6ZrLEi/M9yzH7zmd/wDZUX96j/at+9z/APyBjHztv3YXSsezDhuWsN9PxWoMFPxiPiDHP7R2FgCeSG+TfFpscsanJnzyOh3Ow/8AtcX96j/avLivRnmrA8KnxKvw+OKlp28UjxUMcQL22Bud12z99/JX+1nf3aX/AArXs99JWVscyNieHUGIulqqiMNjYYJG3PEDuRbklyEsOBRbUv3RwsjRbZg3RhmvG4GzwYYaeB2rZKp4iuO8A9r6ltnQrlCmxOpqMfroWzMpJBFTMcLt6y1y8jwBFvEnuC7FjeO4blzDH1+KVLaanaQ25BJc47AAakpWTh0ylHfN8HCJehLNkcfEw4fKfitqCD9bQFrOM5LzDl8F2JYTUQxDeVo44/6zbge1dxp+mbJ88wjfVVMAJtxyUzuH6rr35lzzhdLkauxfDK+mq3BnVw9W8O/OO0aCPrse5Bo8GFpuMj5socu4lmioOF4TTtqKx7S9rHPDBYbm50XqqehXPVHSTVU+ExNihY6R59LiNmgXPPuC2vocv++TT3Nyaea579Au9Zk/mtivzSb9QqlJrgnBgjkg5M+IAbgEc07RchJGOw3yCuabFbHGbdgnRXm7MmDQYrheGxzUdRfq3mpjYTYlp0JuNQVjsz5Jx3J0lMzG6RlM6qDjFwytkuG2v6pNtwvpPoW96LBfKX7165/7pEj07L1//Dn+2NZ7ndHbPBGOLeuvByzLGSMczjJUswSkZUupQ0y8UrY7B17esRfYrJY30UZty7g8+K4nh0cNHT2MjxUxvIuQBoDc6kLoXub7GtzBb/w4Pteuh9MQv0T4yP6MX3rEnJ3QQwRli3vqfJoiBTCA30JXpEVyiGcPNVZyG1YR0TZwxnCafEqHDopaWpYJInmpjaS0+BNwvd+8nnrlhMV/ncX7V0/IvSflDBsiYRh9fi4hqqanbHKzqZDwuHK4bZbZhHSXlPHcVhw3DsWE9XOSI4+pkbxWBJ1LQNgVFs744cTS559zg46F8921wmL+9xftU/eXz1/smL+9x/tX1ESALnZaSemDIwJBxxumn/V5f8KVst6fHHqz56zHkPMOUqSGpxmiZTxTv6thbMx93WvazT3Ba8AuwdMmd8vZqwHDqfBsQFXLDUmR7RG9lm8BF+0BzK5Bc7AXPIDmqRx5IxjKovg2fLfR1mPNmGvr8KpIpKdkhiLpJhHdwAJsDvuFln9CudmRud6BTGwvYVTST5Lv2RsBGWsk4Zhjm2ljiDptN5Hdp31kj2LLYfiNNilKaiklEkYkkiJHxmPLHD6WlTZ2R00aV9T4ssb6ixG4Klwtp6UsAdl3pFxKmjbw09Q/0qAWsOF+pA8ncQ9i1EB3NWcEk4tpm2Ze6PszZpws4hg9BHUU7ZDEXOnYztC1xYm/ML3P6FM+yHtYRDb53F+1dZ6ARbo4l+fy/YxbvmPNeD5TpIanGKo00Uz+rYRG593Wvbsg8govk7YYIOClJnzPWdC2e4YC4YJ1luUdTE4/RxLVa3AcYwAmHF8Mq6B1+z18RYHeR2PsX1PS9LeSKuURtxyONx0BmifGPpc2y2iaHD8bwwxysp6+iqG7ECSN4+sFPcxfZoS/BI+JeHmQUpBOwXXOlborjyww41gzHHCnOAmhJLjTEnQg7lhOmuxtyOnLrsA5WTXJxzg4OmCgmNNJc+qd10DBejvNGOwNnpcLfHA/VstQRECO8A6n6FvnRB0ZUtNh1PmXGqZs1XOBJSQyNuIWHZ5B+Edx3C3NdSxjG8My/h7q7Fa2Gjpmm3HI61z3Abk+A1UPk6semTW6bo4d+8lmks4uuw0H4vXO/wAKw+K9Gua8GidNNhbp4W6l9M4S28bDX6l1o9M+UhNwCWsLb/xgpncP7fqW3YNjuGZhovS8LrI6qG9iWHVp7iDqD5pUUsGGfEWfJh0KvoaOfEa+CjpWdZPUSCONt7XcTYC67h0o9HVPiuHz43hUDY8RgaZJWMFhUNG+nxgNb89u5c46K6D0/pFw3S7KfjqD/utNvrIQcssLjkUH5lp6JM5/7Mi/vUf7VrOFYHiGN4y3CqCES1ji4BheGjs3vqdOS+ls7Y2MvZNxGvDrStiLItd5Hdlv1m/sXJOg/D+vzfV1jgS2kpS0H+k9wH2NKDXJgiskYLzMHU9FmbqKkmqp8NjbDAx0j3ekxmzQLk79wWpHVt+9fRPS7jYwnIk9Ox1p8QcKZmuvCdXn+qCPavnY6hBlnhHHLbEQ7qX0RIuVALlM57GbsiRcKDuRtokFiAaFQ+oiNyodkBYoTDdKnsgLFdupzRdshYooLF5pCNVYRqlO6YWBDkjzU5KjKysjRbt0Qe+dh3yc33blpa3Tog987Dvk5vu3JvoaYX95H3Ric/e+Hj3zx/4LXgtgz974eO/PHrXxuhEZH437gK7p0A/zdxb5237sLhZXdOgH+buLfO2/dhD6HRo398jIdOvveM+exfY5fOptbXbndfXeZssYfmzCRh2JiUwCRsv5t/AeIXtr7VgcM6IsnYZUsnbhrqmRhu30mV0jQf0TofaEoySR16nSzy5Ny6GUyA6sd0fYIa7jNQaRnFx+ta3Zv7LLlHT+6P8AdNhLRbrBSPLvIv0+wrsOYs0YRlTDXVeKVTIWgdiMaySHua3mfqXy9mzMlTmzMtTi1S3q+tIbHFe4jjHqt/E+JKIq3YtZkjDGsd8nXfc//wAgYv8AO2/dhZbpx97wfPIv/csT7n/+QMY+dt+7C609jJG2e0OHcRdJ9TbBHfp1H1PjT2ot3719j+i0/wD4Mf8AUC5x04QxR5EpyyNrT6dHqGgfBeizkyaLZFy3dBug2qikyRUU7XDrYax/G3nZwaQf/ncvT0vZVxLMuX6WTDGGeahldI6nbvI0tseHvI7vErjmRs5VWTMc9LjaZqWYBlRBe3G3kR/SGtvMjmvo3L+aMIzRRCpwusZMAO3GdJIz3ObuPsSZ0YJwzYu7fU+UJYpIZXxSxujkYbOY8EOae4g6hBo1v3r6qzFkzAs0wluJ0LHy2s2dnYlb5OH2G4XC889G1fk93pUbzW4W51hOG2dGTsHj8RofBOzly6aePlcot6HB/nJpvm832Bd6zJ/NbFfmk36hXBuhz3yKf5vN9gXecyfzWxT5pN+oUvM7NJ+Uz4gZfgb5BWR6FIwdhvkFc1mxXQeWfV/Qtp0RYL5S/evXPfdKf9ey98nUfbGuh9C/vR4L5S/evXPPdKf9ey98nP8AbGsV+I9XL/x17Inua/8Ar2Yfk6f7ZF0TpmcW9EeNEbhsX3rFzv3Nf/Xsw/J0/wBsi6H0z+9Hjf6MX3rEP8QYv+P8GfK8NTxGzt1eCCvAG66L0McQFbR5qZeRdbl0Rj/Orgv6cn3T1pbXjvW69EZ/zq4L+lJ909SzXG/Gvc+ppP4t3kV8UPP5x3mV9ryfxbvIr4lfcyOtp2j9qUTr1n8oeJbX0YYF+6PpEw2mc3jp6d3pU2lxws1APm7hHtWpBoG6757n7ARBg2IY9IwB9XJ6PEbfAZq4+1xt/upt0jlwx3zSOm5kxdmA5YxHFHkAUkD5Rfm4DQe02C5j7n7HX1OE4rg9RLxzQTelNudSJPW/4hf/AHl7en3GzQ5OpsKjdaTEZxxC/wDo2do/8XAuWdEWOfkPpJw/jfww116OTX4/q/8AEG/SpS4OzJlrMl/vJ0b3QWX/AEnBsPx6JnbpJDTykfEf6p9jhb/eXAS02X2VmjBY8x5VxHCZLf5VC5jSfgu3afY4Ar42mEkMz4ZGlkkbix7TuHA2I+lVEx1calu9T6Q6ANOjiX5/L9jFjfdFOLcr4OR/rp+7csl0AX/e3lv/AK9L9jF4vdBkDLGEk/64fu3KfM3f/H+B8/NdM4a2aF0joTztU4RnSLL805fhuJktYwnsxzWuC3u4rWI5mxXMp5+LsMWVyiHQ52wB8R7bMQp9vlGq64PPxzcZpo+w8Sw+nxbC6nD6tgkp6qN0UjTza4WK+RcGyy+q6RqXLdTc/wD1D0Wbxa154v8AhaV9icl884LCz+FFPoOEV1Q4efVOP2qInoamKbj7n0IxrWMDWNDWgWAAsAF8r9L+aKjMWfq2HrSaLDXmmgjvoC3R7vMuvr3AL6q5L4pxZzpMar3v1c6plJ8+MpxFq5NRSPVQT9fTC/rM0K3Lo9zDNl3OVFMJC2mqZG09Q2+jmuNgT5Eg/T3rn+HzdVU8J0DtFm4iWzRuG4cCPO6JLk8uMnCVo+v9wuKZerMC6PukzMYxOd1Oxp6ula2Jz+w88fIaWHCF2ppJaCd7L516XmgdJNYRuYoSfPg/5KD1tVLYlNdUzI9KmfKHM8VDQ4TM+SjiJmlc5hZxP2aLHuFz7Vd0VZuy9lTCq84pVviqqqYWa2F7+w1umoHeXLmRQ5Jnm9/Lf3nmbp0nZwgzbmCE0Ejn4fSRcMRc0t4nO1c6x1HIexaWFANEQgznNzk5MBGqDdCmKCZFhHrJiltomCQWIN0SoBqVOaAsW2qcbpTumHJAWQ7JSU6UhAWApSNU5QsmBVzU5IlQbKjKxVunRD75+HfJzfdlaWt16IvfOw75Ob7tyH0NMH5sfdGGz/74eO/PHrXhutiz/wC+Fjvzx611UuhGR+N+5Oa7p0Bfzdxb5237sLhfNd16Av5u4t87b92EpdDp0T++Rs3ShmbEcqZRbiOGGIVBqWRfnWcY4SDfS/gsL0WdJdRmuepwzGDC3EGfnYXRt4BIzmLX3B18j4Kzp0971nz2L7HLgOF4nVYNitNiNFJ1dTTPEjHcrjkfAjQ+BSjG0dOo1EsOdc8eh9B9LmRv3T4D+UqKLixTD2ktAGsse7mefMeNxzXzgvrvK+YaXNOXKXFaQ2bM3tsvrG8aOafI/gVw7pgyP+5/GvyzQxWw6veS9rRpDMdSPAO1I8bjuTg/Jk67CpLvofH+5tnuf/5Axf5237sLMdN0skXR810cj43emRC7XEH4XcsP7n/+QMX+dt+7C3bP2U5M5ZaGFxVbKRwnZL1jmF47N9LAjvUv8R0YouWlqPWj5e9Mq/8AWqj+1d+1B1RPKOGSaWRu9nvLh9a6wOgCt/8AMFP/AHZ3+JYzMnQ7VZby5WYvJjENQ2lYHmNsBaXagb8XiqtHnPTZkraOdN2V9JV1NBVMqaOolpp2atkicWuHtC7Bkvo3wDNfRxh9VVQyQVrutBqYHcLnWkcBcG4P0LxV3QNiLJT+T8ZpZY+XXxuY7/huFNlLS5aUoq7Pd0c9K9biOK0+CY9wzPqD1cFW1vC4u5NeBob94trv3rq+I0FPimGVFDVMD4KiMxvaRyIsuY5L6HZ8Ex+nxXFq+CZ1K7rIoacOsXciXG229gF0fHMYpsBwSqxKreGxU8ZdqfWPJo8SbD2qWerg3rG+9/1HB+iWP0XpTip3m7mRzxX7yB/yK73jVO+qwKvp4xd8tPIxo8S0gL5dwHHpcDzXS42Wl7oZ+tka3dzTfjA8wSvqbDsQpMWw2CvoZ2z01QwSRyNNw4FDMNDJODifDTWloAIsQLEFXE2AX0BnPoBjxfGZ8SwHEYqL0l5kkpp2ExtcdSWubqATraxWOwX3OlR6dG7HcZgdStN3RUjHcUg7uJ1uH6Ctt6OZ6XJuqjonRBA+n6JsDbI0tc6J8lj3Okc4fUQua+6Se04pl+MHtCKdxHgXM/Yu8ww0+H0UcMTWQU9OwMa0aNY1osB4AAL5T6V81x5vz5PU0j+soaRgpqdw2eASXP8AIuJt4ALOPLs7NS1DCoG7+5tFq3MPycH2yLofTKL9EuNfoxfesXP/AHOAtW5g+Tg+1661nbLkmbMnV2CxVLaZ9UGASubxBtnh21x3Il+IrCm9PS/U+OLdwRXaP4OWIX/nHTf3V3+JH+DnXc8xU391d/iV7kcP2bL6HFba7reeiAn99XBf0pPunrVsYw38kY5XYa6VsrqOd8BeBYOLXEXty2W0dEJt0r4IO98n3T0PoRj4yJfqfVcn8W7yK+I5JLSOt3n7V9uSfxTvIr4gc08bvM/aogdmt/lGjbJNKyKJpfI9waxo+E4mwH0r7IyrgkeXMqYdhEdv8lgaxxHwn7uPtcSV839DuXDjnSPRPkZxU+Hg1knddujB/WIPsX1BW1cVBQT1c7uGKnjdK89zWi5+xE/QrRxpObPJieX8GxqSOTE8Lo618YLWOnha8tB3AuNF5I8kZWilZJHl7C2PY4Oa5tKwEEagjRfNlR0j5vqKuWduYK+Fsr3PEbZLBgJuANNhslHSDm8b5kxH+1/5JUweqx3+E+sl8v8AS9lxuCdItZKxnDBiIFXH3Xdo8f1gT7V17oczRVZjynPHiFVJVVtFOWPkkN3OY7tNJP0j2LGdPmBmsydBjMLLy4bKOM2/0T7NP0O4T9KFwzTNWXFuXueroHsOjuW3+vS/Y1Yf3RpP7lcIt/rp+7csn0AOLujiUn/X5fsYs30l5Cmz7hVFRw18dEaaczFz4y/i7JbbQjvR0YKLlgpeh8nxx81vvRFl6bG+kXD3tYTT4c70uZ9tBw+qPMut9B7lvND7nUNlBrswkxg6tp6bhJ9rnG30Lq2WcqYRlHC/QcJpuqYTxSPceJ8ru9zuZ+oclTkvI58OmluTlwZeSRkMTpJHBrGAuc46AAblfLOX8xMd0z0uOvdwxVWJueSeTJHFoP0OC6N029JMGHYRUZYwqcSV9UOrqpGHSCM7tv8AGcNLcgT4LgNNJxxtNyHDS45IiuLHqcy3pLyPuDkvkHP+DSYFn7GKJ7C1vpLpo/FjzxtP129hX0X0aZ3gzjlqLrJQMUpGiOqjJ1JGgePB2/ncJs+9G+GZ6gjfNI6jxCAcMVVG0E8O/C4fCb9Y5KU6Z0Zod9BOJ8nltiCN1tuTKGTMOYcNw9gLnyTsD7DZoN3H6AVuR9zzjvXWGNYcYr+sWScVvL/mul5A6McNyK2SobM6uxGZvC+oe3hDW/FY3kO/Ukqm1RxQ0s5SW5Ujd+S+Z+kevbiPSHi0rCCyOUQgj+g0NP1gruees3U+UsvyVBc11bKCymivq5/fbuG5+jmvmV73SPc97i97yXOcdyTqSoRprsi4ggckOSPJBM8yyDRQKao7BMVgKA3THdLayAsITjkk1TBAWAixQ5ondSyAsV26YbIOGqLUBYSFFDspySHYCgRqmQI1TFZSUVCFLKjKxStz6IffPw75Ob7ty0w7Lc+iH3zsO+Tm+7cm+hrgf3sfdGJz974WO/PH/gtdstiz974WO/PHrXrJroZ5fxy92Arf+jvpIpckYZWUs+HT1bqiYSh0b2tAHCBbXyWgHdRNqwx5ZY5bo9TpGf8ApSpM5ZbbhcOGVFK8Tsm45JGuFm30081zQhMUCmkkLLllllun1Nz6O+kOXI9TVMlgkrKGpAc6Frg0tkGzhfTbQ+zuW34100YFj+DVOGV+XqySmqWcLgJmXHcR3EGxHkuNopOKbs0hqskI7E+DoHR10kUmR6CupZsPqKz0mYSNcx7W2AbaxvzW5fv/AOH/AOwaz+2YuG2RCHBMqGsywioxfB3L9/7D/wDYVZ/bMWIzZ0w0WZMq12ER4TUwPqmBgkfI0hvaB1A8lyYJgp2ot63NJNNnQcmdK9flTDIsLkoIK2hiLiwBxjkbcknXUHUncLe6fp1wB7B6Rh2IxO5hrWPH08QXBQmScUPHq8sFSfB3Ku6dsKjjPoOE1k77adc5sbfqJK5lmzPGMZwnaa+RsdNGbx00Vwxp7zzcfE+yy1xRKhZNTkyKpPgBF9F6cmdJeP5FmfDRSMqaBzy59HPcsvzLSNWny07wV5+a12ojtWSN7nFVFJmeObjK4s+g8P8AdG4HLGPyhg2IU0nPqSyVv0ktP1K6s90Tl2OImjwrE6h/IPDIx9PEfsXzqGAIkJ7Edv2vL6m/5y6X8fzjBJQtDMMw5+joIHEukHc9+5HgAB33WhueB5oRizjZM6LjIOydJGEpym7kzeOjHpGpsgz4lJU4fPW+mNja0RPa3h4S7e/6S6D/AAkMM/8AL1b/AGzFwUQWTCC6Timaw1GSC2xZ3j+Ehhn/AJerf7Zin8JDDP8Ay9W/2zFwjqB3qejtHNLbEr7Vl9S7HsUGL5jxLEo43RMrKmSdrHG5aHOJsT7Vksj5lhytnChxipp31DKUuPAwgE3YW8/NYkQNO6ggjHJVwc6k1Lcd7/hDYZJGbYFWEHT+OYuFFgLibWubpWOa020Cs4mnYqKroazyyyfiN/6NukDDsiUtd12F1FZVVb23kje1oaxo0brruSfoWdzf00wZhypW4TSYXU0klWwRmV8rSA244hYd4uPauScSRzgNyiilnmo7U+By4DW6pkqWtFhuqpZr6N0VYbfVxVUYWbp0a9IRyJjNZUz0stZTVcIjdFG8NIcHXa7XTYuHtW94z084NjmCVuF1OXa0w1cLoXfno9A4Wv7N1xGydrNL2ScUaxzzjHanwdO6NulikyNlV2FVGFVFW91Q+brI5GtHaAFrHyW3D3RGHEfzfrf7Zi4O1hJT2ACTSLjqMkVSZ3Go90PAI/8AJsuylx262paB9TStKzN0z5qxuB1PTzRYVTv0LaQHjI/TOv0WWhk6bql5uhRQpajJJU2UThzwXOdc7m51JQpHWDmppBxA2SU2khHgr8jn8zL4RjGIYHiUdfhtVJS1UXqyMOviCNiD3HRdbwX3QtRDE2LHMGE7hoZqR/AT5sdp9BXF7pTqpaTNoZZ4/wALPose6DysY7+gYrxfF6pn28awONe6GkfE6PBME6t50E1ZIDb/AHG/tXEgna1LajR6rI11NhqMfxLMdfNW4rVvqql3wnaADuAGgHgFWF5MNa3gkeDe5svYEmcMnbbIojZQBImxUbKHZEbIABSlMUCmIl0QEEQUBZCpyU5okIHYp2RapZEJCsh2QKayBCB2BQjVGyKAsoKhRQK0MbEK3Toi987Dvk5vu3LTCtz6IvfOw75Ob7tyH0NtP+bH3Ris+++Djvzx613mtiz774WO/PH/AILXU10M8r8cvdgO6ihXvwXBa3H8Vhw+giMk0p9jRzJPIBNtRVszScnSPC1jnuDWNLnE2AAuStkpuj/G30Ta2uFNg9G7afEZ2wN/4iug5RyoOC2XHxxxNPDNj8sQkdK4btpGO04QdOtdcdwdustmejyv0e4BLmGtw12MYgHNijlrXek1E8rvVbxvvwjQ+qAABoFzPLJ9OPme1h7NTV5H8DlByvgDOzJn3AeL+g572/1gLJ4sg1GIhxwHGsGx4tFzHRVjXSW/QOqzFNj/AEz4i04jSQ4dTUg7TaQxxhpHxbWJ+v6Fu+VosC6TstvnzBlqjixailNPVNEQZJHIADxMe2zmgg3GqiGbf+Gd/wBP7HZk7LxxXii0cOr8NrcLqnU1dSy0szd2StLSvMF3PMOVcUwahcC2ozfl5gu+hqXB2IUrfjQTHWS3xHa6aFcszBl6GhpKfF8IqxiOB1t+oqQLFp5xvG7XDYgreOR3Ujx9TopYVujyjApgUqZbM4UxgmShOpZVhR5IXRCmh2BYWtYBiEh7wCt6wTJmKZhwisxKi9H9Hor9Z1knC7RvEbC2ui0vEW/5SH8nNCcTVJqm/M8XNEC+p2UtqodwArLsjnWIsmZMQ1bC/IWM/uF/dbel/JltB1v5z1+D1bd/itZDN+RSKacep6OMoh4V+C4VWY3jFNhVDGJKqqfwRtc7hF99TyFgSvZmbLGJZSxk4bijI2zcDZQYn8bXNN7EH2FIdOt3kY3rB3oF/il4A4bJDGQihDGQhIZHE7o8BKIiKYCFvFzTMuw+srWxeC2SqyFitNkuDNEhpvyfPw8IEl5O07hHZt3jvSsai30NebIHDxVch11PsTNjDT5IcIcbkJBZWBfZO1hPinDbkAC5OwWQgwasnh6xsfB2uHhf2T5rbHhyZXWOLZnPLDGrm6PA2K2pTXAV9XR1FI9zZYzwtNuK3ZPkV5g3S5Wc4Sg9slTKjJSVxdobisEtzdQpSbKSiONrqpx3KjnW81W56dCsDzolgNpgo43CEI/OhMVnqJ37kGi7rqHa3NWRM71IxgxJK8t7LfaUz5N2t9pSWACBnvwl3CXxnmLrJc1hqOTgq2HkTZZobqWjGXDAoN1NiiEqJsDlAoRuoExWTkhyTJUBYNkwsgQogLDzUKKhCAsUIhQaIjdAWEoFMRqgUh2BQKDdRAWUoJkFoYilbn0Re+dh3yc33blphW59EXvm4f8AJzfduQ+htp/zY+6MRn0/5wsd+ePWvLYs+j/OFjvzx/4LXiNVS6GeV+OXuwLr2Tsp3pYcDIcx9bA2sxiVps5tO4nqqYEbGSxLv6LSPhBc6ylhjcYzdhlA8diaoaH/AKINz9i79kUCqwmrxojt4xWS1I8Ig7q4W+QjY36SuXUT5o9XsrCpN5GbLFDHBEyKJjY42NDWsYLBoGgAHIBaf0nwR1GXKaB1O2V5qmvjc9t2sc0HU/Tot1GoWPzBRwVuA1UU7A+0ZezvDgDYhcmS3jdH0WNpTTZyChxLNdHTz08dVhdmW6qOVvafc20/+Fbz0b072UWJzVFM2CpnqWmUsN2uIYBoVz2vwKaGkjxQx1Tpmm12EyyxEnsmO2jW3tcW0XYMp0Bosr0bX8XXSt66UuFiXu1P4LHR8qzr1tLgyxauWZywWkytjb8QfGBlnMUraXF4fg01Q7SKraPgm9mu79CuqEWWHzVgkOY8q4ng87bsrad8XkSOyfYbFeg+eGeY1fDPmbHMInwHHKvDKkfnKaQsv8Ycj7QvCFs2Y5pMZyjlTMM4JqqqjNJVOO7poHGMk+J4VrI3XRjblHk+T1GPusrgdNy/0ZYRimR6TH63F5qIPaZJy4N6tjA8g8r7D6Skwno5wrMGYa9+G4s/9z1G1l6o2c97i3ic0EgAW1uSNFl5XAe5uiAcL8LdL6/x6q6KMRoq7LOMZYmqW01VV8boi424w9nCbd5BG3cVNvk9BY8W6EHHqk/d+hRH0dZYzHh1U7KWOzVNZS7xzWLXHkPVBANtCLhYvJXR9BjWF1eMY5WSUGHUrnMPDYOJb6xJN7AbbalbjkrLEnRpDimL5hrqWON0bWMEbyeINN+YFydAAFXlGeDOfRri2BwTx09fLLM7gcdg+TrGm25HI27krKjhg3HdGpU+PkZLK2HYJQZGx12AYk+vop2SuvILPjcIiC06DwO3NczwHo/wyvyrJmjM+JS4fhEAIaIQC+TW19QeegAFyV0nKmW5Mq5Gx2jrKqnlrJGSSSxwv4hF+aIaCe8jVeXI+JzYv0Vx4Zgc1CMaom8AhrG8TD2rgkb2IO/IouuhrsjJwU1Tp8fqczzf0fYXQ5Wos05ZxKauwepe2N4naA+Mk2B0A5gggjQrasU6HcnZddT1WNZmqqShkuz86WNc9+lg0hp0AuTp3bLydItfnihylFQ5jbgkFLWVLGNgo2/nOyePi3sBcfWvT7oWYCPLwa4HSbY3t6iq26QnHHFSlt6UXVDWN9y69sbuJjSQ13eBVGx+hYGj6Osu4JlGixzO+LVNEa7h6mnpmguaCLi+hJNtTyCzDpGj3KgALeLh2vr/ANZW5DGMTzXkXDK/JjsKqaljWtnp61odwWaAW/0XAjnuFN0abIyq+u1HNcR6Mhgef8uQ0GLVBw7FZQaesiIbNEQOLQ7XsQQe4rA9KmDy4Jnh9NLidZikjqeOQ1FW4OkN76achZdArMRzP++Tk7DczPwsSMqDO2OiB/N3BbZxv4LVum2z+kZxBB/yOHb/AHk03fJjljFQltXn9DnETu2GnYkBdsxLohyjgDaarxnMlTS0MnZPWFjXPebWDSG91ydDyXF2s/ONuOY+1do6fXg0eXeFwNjLsb/BYm+pnhUdkpNXVGsV3R5htP0VnNkFdUvnL7NiPD1Zb1xYDe19hdJHkChd0QPzea2pFW0H8zZvV6S8HdfbVbxlnD/3a9AYwLDqiEV0JLHNe6wa5svGA7mARzVmM4UMD9zxV4W6rp6qaBvDI+B/E3jMwJaDzsTb2KbN+5i1urjb+5rOE9GeA4dk2nzBnHGKigbVhroooALtDtWg6EucRrYDRbVm+hw7DegyhpIa11ZhkctPw1MYAc+IyE8Q5XsfpCbH8Fd0odGmCvwKqp+vpOBzo5H8IBDOBzXWvYg66hebO+HxYP0B02GR1kNX6M+GMyxOBa5wkPFbwvcexI02KEZbVxXX1NG6ROjuDKseEz4TVT11PiRMbXSBvrmxbbhGxB+pebpJyTh2R/yZS01fU1NdUsMkzJA0NY0WGlhfV19+QXS+jSekztkXDaKud1lRl+tjcL7kNuYz5WNv91co6QccGZc+YjXh3FAx/UQd3AzQH2m59qpN3RhlhBQ3pdar9PUwWDUzKjEY2zNeRuOHvGuvgtqmrYIHvbI/hc1vFYjceHetThqnUtQ2SNxbY625juWwsxXDqpjJpS1jmPs0Sbg96+m7J1EIYpQTSlfn6f4PmO0MMpZFJpuP6DVzfSsIkfUwuYWgvaxpuRba/wCK1Muus5jGNMfE+mpnPDg6xe0izhzAWAuuPtbLjyZUoO6VN+p09n45wxvcqt8IyFPhYnw+OrOIUUXHVNpuqkltI24v1hFvUHMqVuEikpq6UYnh8xpKkU3BFNxOm3/OMFtWab+Kxj3BV2uvIo9K16AN3ICMu2CtjjLl6A1rG37kyTwPYW7owfxoVs7bji5KlhLHhwNiExHsc0MaHFVlzz4BNxF7iSgSCpKCNtAg7RAOsnsHjxQAodw68wthjJdGx3eAVrhjNtVsUNjBGRtwhJmUxzugN0UbJGdgPNAJiLJUCsKBTBA7oAChRKBQAUSgmvogdindRqig3QKxilKY7KHVIdihFSyiYWUmyCKFlZlYCFufRH75uH/JzfdlaYVufRH75uH/ACc33bkPobaf86PujE5898LHfnj/AMFrxC2HPg/zhY788etfITXQzy/mS92bZ0X2/fFw34x6wN8+A2XaujtzXdG2Xi3b0CIHz4dfruvn7K+JjBs1YbiB9WCdrnfo3sfqXeMgyMpKfFMv8Q48HrZGxi9708pMsLvLhfw+bSuDVJqV+x7/AGRNPG4/qbi36F5qqGOphmim1iezhJvqrncRY4N3tp5quZzXwaixcNR3Lz8rtHtR6mgyynD4Jo8RLaeJhdwyuIAe0H1h3HvHiuhUtRFU0dPNC4GF8Ye3ytosX6FQ1T2sq6aOUtcHDrQHNB77LNBgeGjiBaDrbmtNLFKLUTTU5HNrcgvA4b2CpIHED4hWSsHG0gC613PWYYsq5HxXGJHAGnp3dWPjSEcLAPNxC7jkRwetId0U4W4eo7GcRMf6PWn8VrFls2Z6Z2BZZyvlmQ/5Rh9CJqkfFmmJkcD5cS1kLpw/hb/30PltfJPO6GBO1zZEaG43GysFLP1HXdRL1W/WdWeH6bWVa0OMd8sspHWyPkttxOLrfSjG90buJj3McNi02P0hLGx8sjY42l73kNa0C5JOwCaSJ8Mr4pWOjkY4tc1wsWkaEEJDvzIXOcSS5xJ3JO6rqHOZTSOY5zHBpsWmxHtCsAQkbxxPb3ghIdmvySvmfxySPkd3ucSfrXne4ucSST5q09kW8bKrmqOqxm3tbW3mnZNJC4mGV8ZOhLHFt/oS2s3RKgVlgmkEheXFzjqSTcn2rP4FimDQCX8q4O7E3OtwWq3QcFr39UG99PoWugao2sbg2Q1ZUZNOzb67FstT0M0VJld9JUPbaOY4jJJwHv4SLFa+Rxcz7SqIqkerJ9KvGuoNx4Kaoty3Ba+SEkxyPYSLEtcW3HsSXIFrm3cnBsFAWlAgxzPjBEcj2B2h4XEX87IxdX10TZi4Q8Y4+H4t9bey6QtHJIQ/4qAs6yM7ZPydlDEMPya6uqK7ECQZqmMtLLi17kC9gTYAbm5XKDY8ylseYRt3pJUXPI51fkT60pbfZOGpiAEyDz8JAS2c7QBXFpc7uCsa1rBdxACBHlELr7K1kGuugRkqomaN7RXndLJMdTYdwTFaPQ+djDwsFz4KsHiN3G/gqw0BMDZAWM8cTCFRwWBPcruJB57BQBGjYo8O6AI+hG5KAF2RDrHRA3QQFlweHb7rLUNQx8LYtnNFvNYMKxsjmEEGxSoUluRsgGyhC8VBXdeOrf642PevalRg+OAHZCyO4SoEOBogRqo1EoCxSEbaIoIFZNLKckbKckDFtqiBqoigVh0QKKCB2RSynJFAHnURQsrMrFK3Poj983D/AJOb7srTSsrljH5sr5hgxaCCOeSFr2iN5IB4mkbjzQ1aNMM1DJGT6Jo9GfPfBx3549a+QvfjWJvxrHKzE5Y2xPq5TK5jTcNJ5C6x5TS4IySUptr1JZdOyxmSoNPS4/SMfU4jg8HomJUjBd9ZQ3u17BzkiJJA5guHcuZWXrwvE6vBsSir6GZ0NRCbtcPsPgs8uPeuOp0aTUvT5N3l5n1ThmK0OJ4TDiNFUx1NJUMEkU0Zu1zTzXlnqHMq5mOY5kJZ1nGWkDx1XIcv42+WqfXZTqabD6+d/WVmAVj+CjrH83wv/wBE88x6pO4W50/S9heHkUubaOtyxXE26utpz1RP9CVt2OHjcLysmJzW30PrsOaE1vjyZllQx1SZnyetGCb6WBJI09iyNHWaBxa0nQAtJtrrf6NbrHnPWSKulMr8yYI9hF7+mRk/auR5g6VGYdmmbCco1kOK0nBGaf0SB1Q8OLe01oboddddiVjiw5MUrXKOqU45FXRnfhO2RrnnstbcXOm2643mLMVLnjMPpr3cWS8rzdbJL8HE61vqRs+Mxp1J/aFhJIs0V+GVLs74vNlzAayTrpMOY8GvrNLcFh/FMPMfUtdzDmL8rR09BQ0seG4NQt4KSii0bGO897juSV6MIubpf+v8nkavVw08aXLMfi+Jz41jFViNU681TIXu8L8vYvI0aoWRC71FRVI+TcnJ2zqWEzvho8AkjxOZ5gwd8pwhgdasaHSXGp4DpqRvZui1jD8CoKiuyfE+JxZit/SQHnt/nnN07uyBssG3GcQZUUE7KlzJcOa1lM5oAMYDi4eepO/evdSZuxuhDBTVjY+rldNH+ZYTG5xu7gJHZBO4Fgo2s7O/hKlJdP8AH9jL4dRYVhNTl91RQyVlRiNR1gkE5Z1LRPwNDQNHOu25v5L1VGAUWL4y6pAdG2LFamLEncR0jDnSB47rsa9vmFrVFmfGMOgZDTVnAyOQyx8UbHmNxNyWEglt+drL1w46ymwHFGtqJpcRxlwFQOAMjjYHlxIN+05xNtAAASk0xxyY2qa4/wB+bMJM6OSeV8MZiic4ljCb8Lb6C53sEoCnNB7xHGXuOjRcpnLZrkwtM4b2JVbRzTPPE9zu8qWsFR1IgUIF1EbXQMXmjdC1ijZAgWBRY98Ru0qBFAz0x1THaSdk96tLWuF2uBWPIUBIOhSodnuLCDoiBdeVlQ5osRdWCst8DU+KVBZfcjSygab6iy87q1x2aAkNVKfhAeQRQWe61tTsqZKiNuzrnwXjLnv9ZxPmiGd6KCx3VD3eqLBVHicdSSrBYbI2TEVtZ3qwCylkQ1AAUsmspZAxQ1R+gATgWQcLyDyQBANNVNkSgUhgsjwoqAF3ggBT3DdMIuZKcM4UbjvQIMTupka8cis80h7A4bEXWB5LK4dLx0xYTqz7EmZ5F5npQsmQOyRjYWhQqNUKAIpuFFECDbRQDRBEIGA7IBEqJiDZDmiEDukOw20UspyUQBRyUsoitDKxChyTFBMQqCZDmmKyWUsipZIAC4NwbLYcNz1mLC6Y00eIGemtYwVLRMy3dZy19BTKEZdUXDLPG7g6NkdnClldxz5NytNLzkdhrLn6lY7pExyKB0GHCiwiJ27aCmZD9YF1qyinuYf62bPWZ2qcmWVFTPVzumqZnzSu3e9xcT7VUiotEklSOVtvlgRCiNkwJZFRFIZOSIugEyQxglewSMLXC7SLEJlEirPBXwRQ4dwsaG8LgQsRyWcxON0lEeEX4SCfJYMbJo6Mb4AoL3RUQWG1woRYIAp7XCAERUuogYLIW5prXKhBJ2QAqFirA0o2AQBWGEpxHpqjxIjVAAAtsjZNoFEgFsjZFFAxbIo2USACGqYoJgB5s0KAi9+aWTkl4rFAi0lLcpQ7vQLu5FBZaETIBoFTxE7JgzmUBYeJzkQLblNoAggZYHaL0UEvV1QHJ+hXkBTtPCQRuNUhPlUbBZQ7JYZBLC145hPySOUgQTNCB0KAIoFFOaBWQqBDcohA7IUDsmQKBEGyBRChQMl1LqclECspUUKi0MxTugiULIEBREhCyYiBFSylkABRGyFkABBGylkwAojZSyAAipZGyAJZHkookMIRShMEh2MooFOaQw3stcmcJJnuaA0EmwC2MBa/VQmCpfHyBuPJBtifJRZFA7qINg2UabFBHdMCO0KA1TbttzCACQw2spfuRA8Uws3xQAoa53JERnmUxf3JS4lADBjQppyS6lGxSAiI1Ua26sADUDFDUbAKF9tkpJKACSgpYo2QApRARsgdGk9yAKnntFIodTdTVMQVLDmUeFx5JhE4oAAcByR6w8gmbD3pxEAgCoF52CPC7nYK3h0QLR3pDEA1VoGirtZOw3CAMphct43RH4OoXvWEo5OqqmHkdCs2kc+RUyDdAjtJkCNUGYFESpZAAA1RshbVNyQAECiggCBEhABMgAW0Qsm5JUAUqIoBWZgKCYoJiAUESgmIgRQCKQEQRQKYAKiKFkCIopZSyYEUUsikFkUURQMATBAbohIYwUUCJUjCFicYAE8Z5lqyoWMxhh6yOTkRZBpjfiMWUbKWRTOkCNlEQEAQaIC6a2qNgd/pQMW45gojhRLbeKlh3JAEcJ2R4UtrIglAxg25R4RzKW5U3SAbjA2SlxJUsjYIAACa1kbhAoGFAlRAoAl0sh/NnxRQlHYATEUoh1vgo8BR4CmInWnuU61ynAVOApAHrnI9cUOrU6tAB61TjHeh1YR4AgYbhMw2cl4QFBodEgLSbEEbjVZ9huxp7wFr52Wepzx00bu9oQY5fIsRdqgiRokYAQTckBumBOaIUKgQAChZMgUAQbqHZQIpADkgmSpgVlBRRWQA7peaiiBEQ5qKJkhCiiiBkUUUQACooomIiiiiAIooogAqclFEhkTBRRIaGGyKiiQEC82ItBoH3F7ahRRBceqMGgVFEjsInGyiiYE5qc1FEgCNkeaiiBgUUUQIiKiiBkUKiiBhamUUSABQKiiAIkkJ4h5KKJiFBPejc96iiBBue9EE2UUQMl0LlRRAghRRRAyIFRRAiy+gWboD/kMaiiRnl6I9HNMVFEGABshzUUQIJUaoogCIKKIAgTKKIAiVRRAH/9k=',
  'walter_1': 'data:image/jpeg;base64,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',
  'reinaldo_2': 'data:image/jpeg;base64,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',
  'rogerio_2': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAcFBQYFBAcGBgYIBwcICxILCwoKCxYPEA0SGhYbGhkWGRgcICgiHB4mHhgZIzAkJiorLS4tGyIyNTEsNSgsLSz/2wBDAQcICAsJCxULCxUsHRkdLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCz/wAARCAKjAhwDASIAAhEBAxEB/8QAHAAAAgIDAQEAAAAAAAAAAAAAAAECAwQFBgcI/8QAYBAAAQMCAwQFBQgLCgwFBAMBAQACAwQRBRIhBjFBUQcTYXGBIjKRobEUFUJSdLLB0RYjMzU3Q2Jyc4KSCBckNDZTVZPh8CUnRFZkg5SipLPS4hgmVGPCRaPD8WVmdYT/xAAaAQEBAQEBAQEAAAAAAAAAAAAAAQIDBAUG/8QANhEAAgIBBAAEBAQFBAIDAAAAAAECEQMEEiExEzJBUQUiM3FhgaHwFCNCUpEGFcHRNLFi4fH/2gAMAwEAAhEDEQA/AOxui6jdK65HYndBcoEouhCebtRe6gSEr2QCkjJdnY7LINAefYexTiqA85HDJI3e0+0cwkoSxh7Re9xqHA6hAZBOqLrGjnLXCOawcfNcNzvqPYr7oSyV0XUPFF0Fk7ouqHVEbTYvBPJup9SgagnzYz3uNlRZklwCRcALk2HasQvkJ1eB2NCOqLjcgntOvtSiWXuqIwbB2Y9guoGoeb2aB3pCE21NlIRNGp1VoWVF73b3k9g0TbEb3DbK8WHAIuFSFYh11d6FPq2Dh6UXRdQEr20Rm7VC+qenNKBK+iLqJKV+xCkiUXUbhK4QWTzJ5lXdF1BZZftVErMuosWnep31QSN28Kkspp5OqcIXHyT5hPzVk5liSRixab2O5TglLrxyH7Y3efjDmjFmTcEEEXB0WKIGQm0bWtHYFfok4BzbcV6NPkWOfPRxzRc48dnNY1tJW4ZWtpafCTOXsziWSYMjtx9HaQucrdsq0XFVj+H0N/xVEw1EndcXH+8uux/BafHMNdSzxsLmnNG5wvkfwPdwPYvN2Nr6CeSB+I4bgLo3FrmU1MXTekAn/eC9Wqc4u0+GcMGySprlGY+WbEG+6G4Zi+JM/wDUYhMKaHv14frLFfihpAS7FcIwy3wcPpzVTf1jrj/eWS3Z2mqx7rq4sYxXj19ZKKaL9p1z/vBP3fgOEm4qMEpHj/08Lq6buzHML+IXgts9XBrgWYxLnhw7HNoZQfulVM4R/ssBt+0FmR0WM0zvIOD4AB/NhplHiM7/AFhZQxioxcZaTCcdxlvB0z+ohHgM2niFZFQbSPd5AwXAmcwwVEo8Tn+hQphs2dZicvWVNbi+Nv4mKMtZ+0/MR6ArX0+C4SbSQYNRObxq6g1cv7ALvmrNOyDsSGbFcaxfFgN7Q7q4vXfTwCvgwXZvCgBFRYdG4cZCal48NR6ggNQdpoKxvuWkkxfFRwhoqcQRej/tVjKPaCYfwfZ+gwxh3PxCYyv/AGSR81dE3FBIwR0sVZURj4MLBFH6r+xa+rxqOkBE02GUHZLL1r/2Rf5qgMduz+KVjOqr9pql0Z30+Gw9Uz/4+wq2HY/Z/DbOmoWOd8euqLk/q3HsKxPsgOIHq6V+L4qT8CjgMcfp/wC1ZdJs/tRW60ezdLQtP4yumMjv2RYepRs0lZsIsRoKFvUUbgy+nV0NOGX8fJv61XPiEkLc7qJlO0/jK6cR+ryfpWRHsHjEjbYrtX7lZbWGgjEQ9Vj6ljSbP9HeBvMmIVnuycbzUT5ifDT2LNotGpn2sgjJY3FwXH8Xh1OXOP61m+0quFmLYk7PQ7M19SXbpq6UsB8Bb5xW9i2+2boT1GzuCSVUg3Clpjr42Cor9udq5GktoKPBozufXVDY3fs3DvUU5HC7Y6bY3a+dmaaqw3Boz/MRAvH6x19a6F8T6UNiknbO9rQDK3c821K88mxfEsUkyTbUVNU/+Zwqje8/tEN+lbfZtj8PqZKeSmr4W1PldZiFUwyOcOAj3i479y9Wlm4Tp+p5dVFSja9DpKCT3NXS0+5r/trPHePSt211wucqj1RjqW74Xa/mnQ/Wt3Tyh8YINxwXHU49mR+zO+myb8aZk3UZPKYQeIUcyRN15T0GDJcscBv3jvCzI5BJE14O8XWNOMshtuOoRSPyh8fxTcdxUNGUSldIk2Ub9qAldK6V0jvQo8yCVElImygJX7UrqF0roU3F0rqAKL9q9BwLLpXUAUXQhO6LqGa2twO0qszt4EnuCoL8yLrGMrzuAHfqldzt7nO7tAqSy6Uxlpa+xB3g8VWZpafQgyx8HE2Le/mO1DY7agAXUw023qEEZJnfCawdguUsmfzszz+UVXZ0DszBmZxZy7vqV7JGyMDmkEFUA2Ow4NHYpiNo3m6WZGZATFhuACMyjdK6AnmSzKN0rqgnmRdQui6EsnmSuoXRdCWTui6hdF0BLMjMVC6LoLJXKLlQuglC2TBRdQulmQWWXRmVd0X7UFkz5QsVjyAhwINnt1B/vwV17qLxmHbwQhOKYSsuNCNCORU72KwS50UnWNFzuc34w+tZLZGyNDmuuDqCEKTkGYZuIXKbV4PPVRivoKqakqIhaV0LQ5z4xy43HeNF1V9VTK2xuNxX0NPNZI+DP8jxZouD8SB5nTbOYdWtbWYjHiFeXa9diFUImHu4/wC8tzTOwTDLe5IqGFw3Glp+tf8Atu/6li43ghw7E+vo6KidHUu+6VUjwyF3xcreB3j0LdU2xuKysDq3aaKhYd8eH07Yj+15y8WSDxy2yPVjksitFc+ITSR9Y6kndGN0lZN1bB4bv95aqXaamhfl99aSN383RQmd/pAPzltZ8D6PMGeZcXrzXTjUmrqS8nwuPYrqbbjZ+mHV7NbOT1hGgNLSHL+1YLnfsbr3NGz3zxVwNLgGL4jfdJWPEEfoNz61tKfY3aydoMjsJwaPm2MzPHi+49CqxDpB2huW9VhWDN/0urDpB+pHdy0MmNYrjEhb7+4tiJO+PCqLq2/tu19Scjg6yfYPC2RiTaPaetrWjUtfN1cfoGixW4p0Z7PPy0lLTVM43ZGGZxPr9q5Cow+GB/WVtBRQPH4zGsTMr/6tpHosVbSVjpB1WH4hVS206vA8L6tv9YQ0+1NvuW/Y7OTpBxF8P+CNl6iOHhLU5aeP0uXPV+2mPVBLanaDC8PB/F0odVSD0Atv4rT1UETJM9Zh1NG/+cxrFc7/AOrjsfBEGIuc/q6LFHl27q8EwsNPd1j7OTaiWy99NVYlGZZfsixZnx5Xto4PSbrEPvdh79fsdw5wPN1fN/8AJt/Qsp2z9bWPEs2A1E7jr12N4ifmNyn2rZUeA18dmsxChw/8jDKAOf8AtuF/WqQ1oq6muiyQfZHikQ0tDG2hp/VfTwCw3NFG4kwbPYU7iaiU1k3oGbX9VdHVYBhbPLxepq6s774jXZB+zcKMWLbO4YbUMdK0j/0dJnP7bh9KA08ba3E4sgr9oMSi3ZKGmFJB6SQP91ZFBs3LS1MdTBg9BRyscHCWtrXVEoPPLHYXWe/aSorHWpsLqqk8DPNYehoPtRfaSoPkx0tE3siBPpeSVqMW3wZbXqdEXMkabEOa4WNtxVmDzlsbqd7ruhdk7xwK1lAysp4HNrar3VITcOO8dm4LMpYpHV7ZWNIDmlr9NOxenU1PGpPtHm01wyOPoze5kXVbSQE76r5p9IhUi7bjgsWN2SpYeDvJP0LLd5QI56LAkBLS3iN3eoyo2V1Em4VUU3WQtduuLozetQpO6L9irJukXIUsLlElRJ0ulm3ICRKNSqnTMabFw7lETs/K9ChTdZtLqJnYONzyGqxw1z99z3lTEXM+hdzgSM5I8lviVHO93wj4KQa0cL96lm5aKkICNxNyPEqxsY4n0JZu1GZATDWjgncDcoEovyVIWXRmVWayeZATdZw7VQ5ro3l7DZx3g7nf29qsugkHeqBxzNlBAuHDe07wp3WJKzUOa7K8bnD2doUoqjMerkAbJy4O7QgsybouoXSzaISyzMlmUcyWZUhMlLNZQuguKAlmCdwq7ougJ5gjMAoXSugJlyA5QzIugLLqN1HMndAO6L6qN0XQErouo3RdASui6jdK6AHi+o3hUsk6h5P4tx17DzV11VK0bwNDvCAyC5MkEWKxIZCw9U46fAP0K8O7UTrlE7MWupY6mCSCYEskFjb2jtXnGI0VbDXS0tcyvxLq9Q+XEG0tPlO42AHouvUHjO219RuXPbRYKzF6MZY4DVQEuhM0Ye2/FpB4H22X0mlqcd/1I8Kb086flZw9PLR00uSnqcEpJr+ZhtE6vmv+c4OF/FZdWyomjzV0GMVMfxsVrmUMX9Xcn0K6joqmoidHNi+Jtiacr4qOFlFCCN4LtPYpMo9kMPeXvjoppucsz6t5/Z8lfOo91mqjrKOmcGwVOE0zydG4fQvrZf25PJWc6mxXE2APw/Hq+I7jiFYKOH9ho3eK2TdqKanHV4fR1JG4CGJlM31XPqR7u2grSXU+GQQA/DlDpXelxA9Sqi30RyS7MSk2croXjqveHCj/AKNTGqlH6z83tWdUbOxOiDsYxfFKuP4s9Q2mi/Z5Je9OPVYtVYu+Fh3siPVj0MAUoNi6LrM8z5al/F1vpNyuvgz9Uc/FiYsb9kML/i9PQOeOMcT6l3pPkq87WOe0RUVBWSDgMzYGfstBW7p9naSK2SjZpxebrYRUORuUFsY5MFk2RXmkN8n5YnJCbaOp1goqWjaeJjzu9Lzb1JnA8XrABXY1NlPwI3lo9DbBdiKSIb7u7yrGxxs3MaPBZcsS9GypZH+ByFNsZh0bsxjlnfxNrXW4gwGCEDJSQttxdqVurhIlZ8avKkXwr7ZiDDvILXSZQRazBZSjw+njaBZzrC3lOury7tRdc5ZZv1OixxXSE2KKPzWNb3BMlLMFEuXJuzokSvZGZVOkaNS4DvKrNSwbiXdwUNGRmWLUC0lxxSdVH4LP2iokTTnzTbhlb9ahQpnHM+Pkcw7ir3SMZ5zgPFUtw573BzmC40u530BZDKAN3vA/NapRoqMw4AnwUTM6+4DxWWKSIHXM7vKsEcbPNY0eChTX2lk0DXHuCsbSSvGoAH5Rus7MkX6KGjGbQNtZzz+qLKwUdOBq0nvJU8yMygLcwTuq7p3XpPMSJRdQLrouqCd07qu90wVQTui6hdGZCFl0XVd0X0QE7pgqvMi6pCy+iqkia5vMb+0dqeZPMhkgycsOWU3G4P8Ar7Vdm1VL4w4Ht4c1SyR0Ghu6PlvLfrCAzCdUXVYeHNBBBB3EIulAmldRzILlQSRdQJRdATJRmULougJXRcKN0iUBO6LqGZGZATui6hdF0BO+qLqF0XQE8yLqvMjMgLCUXBVeZGZSgVysAuNbHceSnDLnBa/z27+0c0HygQVjSBzHAg2cNQVQZwKqqGBzcw3jelFMJWX3HcRyKkSt48jxy3I5zgskaZy2J7J4fiuJe6pC8OPntaAQ489dxWXS7L4dTAZKO9uMhv6lvb2OmiMy6yzpu1FHOOFpU5Mw6fDhA0gdUzXTq4w3RZApY7+US7vKsvzKWbVc3mm+LOixQ7oYjjZuYE7qN+1LMuTbfZ0SS6LMyLhVZgBqQB3qBnZbzr9wUNF+ZIlYxqQdA1AM7/NYbdyzRbMjMEnPaN5AVfuWd/nEAdpUxQ21dJfuCUCDp2cye4Kt1SODfSVlNpIW72l3eVa1jGeaxo7gpRTXgzP8xh8Ape5Kh/nHKO131LPLksyhTEbh4+HJ6GqxtHA3eC7vKtLlEu13qFJNbGzzWNHcEy66rzIzKFRPMjMq8yL3UZpE7pXUU7FZNASldI3UCVCk7pXUMyWZQpfdF1AlF16jzE79qLqF0ZlSEwU7qvMi6ELMyLqGZF0JZO6LqF0XVJZZdK6hdF0BZdF1XdGZWgWXSewOHbzUcyeZWiFFnwuu3cd7eB7u1XskbI27T3jiFF1nCxVEjHMcHNNnDjz7CrQMtJUxziTySMrxvHPtCndSgTSuoXTzK0CV0XULpXSgWXsi/aq8yMyUCd0ZlC90XQE7ouoXRdATQSoXSulAndF1C6MylAndF+N1DNZGZQE7qL2h7SL7lEytb5zgO8qHuhvwbu7ggK7uikztBzDQjmFkska9gc11wVjPkLyLMt2k/QEmRTZiYy4A7wG6X8UoGXdRLwN5A71AUkzvOJ73O+pWMoWje4D80JQsgZm879yiZuQ9ayRSwt3gu7yrGtYzzWtb3BKFmGDO/wA1h9CkKWd/nODR2n6lmZu1GZQGM2gb8OQ+AsrW0kDfgZvzip5kFyFG1rGea1re4ILlDMlmQlll0syrzJZlktlmZIuUMyjmUNky5LMoFyRcsgmSokqBckXIaJ3TBVWZZ+EU8VXiMEMzzGx7iCRvvbQLJStkDn2sCVksw+UkDJqdy7CWDCKSNgldEwMO4v1Kqm2gwuJ7Sz7Y5u4tZu8SsU/c0pL0RoY8BqXTNYY3AnXcs+HZaUzgSWDbXvwVk+2DA77TTE9r3fUtbUbYVznfa+rj7m39qVH3LcvREdpMLGEtiexwcyQ2JPArni5ZOIYrVYkR7qndK1pu1psAPALBLlnhdG1dcky5LMoFyjmQGXfVO6xM0kWnnN5E6+BVrJWvHkndvHEd69J5i66V1C6Lqiyd07qu6LqmSeayeZVXTuqCzMjMq8yLoQsui9lC90KkLLouqy6yLq8AnmTzKu6MyUCzMjNcWVd07qghLFcXF9NRbeO5KOcghkh1OgdwP1FWXVckYcDoCDvHNCF90rrEZM6G4fdzOZ3t+sLIBuLggg7iEKTulmULougJ3RdQui6cEsndF1WXhu9wHeVEzs4EnuCAuui6xzNfRrfSVICd+5pHh9aEstukXgbyAkKWZ3nOA7z9Sm2jb8J/oCtCyBlbwJPcFEy8h6SskU8Q+CXd5Vga1vmtaO4JQMMCR25p8Ap+55X+dp3lZRcUsyUChtE0HV3oCtbTxDe0u7ypZksyEJhrW+a0DuCea6rulmUBbmSzKvMlmQFmZLMoZki5AWZkZlVmRmUNFmZGZV3SLlAWZlEuUMyjmUKWFyWZV5kZkKWZksyrLki5YZSZcolygXKOZQ0WFyjdQLki5QqLc3apNly7lj5ilmWDRl9dbdvSMxPFYueyWdTg0jIMpPFQMl1TnSLu1Q0WFyiXKsuUS5QpYXJZlUXapXWTRsL37VW+K5u02I3EHVGZO69R5SAncw2lGnxh9IVwcCAQbg8lA2I1VJjdG4mI25jgfBUhk5kZlRHOHHK4ZXcufcVZdUyTzIBVd0ZlQW3SJVYci6Atui6rui6pCy6Lqu6Lq8AsujMq8ykCgJXRdVOlY02c8A96galgGmZ3h9apLMi6d1iiaV2jIj4m/sUxFVP/ACB4BBZY5ufv5qjOad+hFjvbf1hW+4nu8+S/iSrGUETeZPZoqSysVMZbcXPgUhOXGzGErKbDE21ox46qy4aNNFaBiBtQ7czL/ftUhSSu854HjdZOZF0oFLaKMec4nuFlYIIW/AB79VK6MyoJCzfNAHcnmVZKWZAW5ks3aq8yM3ahCzMlmVZKLrILMyWZV3Rm7UBZmSzKsu7UsyAtLks3aqrozKAtzKOZV5ksyAtzIzKou7UsyAsLkZlXmSzKGizOlmVRclmWQW5u1LMq7pEoUtzJF6qzdqWdZKW5ki5VF/aol6yUtLlEvVRekXKGi3MkXdqqL0i5ZNoszIL1SXJF/aslRbmSzqrOlmUNFufRIvVRelnWbKW5ksyqzWSLkNFuZLNqqsyWbtULZssyeZVXTuvSeQszIzKvMndaIN7WvBBG9Vhz4jbVzRwP1qeZBcANSB3qkJNlbINDqOB3hGZY0joibtdqN1t6Gzv3Fubt3FUGVmsjMqW9fJ5sdh2qYp53ec8N8UITuomZg3vF+9AoWu+6PLv79qtZSwMHmX7yqQoNS0bg4+CBJM/zIT43KzWhjfNY0dwTzKksxBBVP3uDPQpigzfdJifSVkZ0Z1RZBlFCzgT3lWNhjb5rGjwSzIzqkLMyLqrOjOgLcyMyqzpZ+1UFuZGZVZkZwqC26lcncqC8hpIFzyXR0ODMnoWTGdhLwHAs1Cy3RUjStY48Fa2BziNF0PuTDaZ+aSZu61nOCiMQwqnZkYM9jfRt/WVjczVI56opnwnymkd6xsy2+M4tHW07WwRmORp89xG7lZaQuWosyyeayMyrzJZlohZmSLiq8yWdQFuYpZlUXozICzNdBKqzJZlAW5ks6qzdqWdLBdnSzqrP2pZ+1SylubtSzKrOlnUsUXZki9U9YomTtUspdmRnVBkS6xSy0Xl6XWLHMnakZe1RsqRf1iiZFQZbqJkWbNUZGdRzqjrFEyab1mzSRkF6iZFjmRBkWbNJF+dLOsfrO1IvUs1ReX6ozKjOjOsmqLs6WdVZ+1LMoC3MjMqsyRchS3MlmVeZGZClmbtRmVeZGZQGyzgbyFEzM5qbaWMby5x9CsbFG3cweOq9J5Sjrr6NaSVINnfuZbvWSHAaDRPMqQoFPKfOkAHYVIUbPhOJKszpZ1oyNtPE34N+8q1pa3RoA7gqs6M6pLL83ajMqM6M6pC7MjMqcyMypC3Mi6qzIzKgtzJZu1VZu1GZAW5kZlTmPNGZAW5kZlVmSzIC7MjMqc6M6AtzIzKkvRnQF+dWx1L42lrXENOtr6LDz9qOsQpmGc87JGY81idYkZEshkmS/FQL+1UGTRIvQpfmSL1RnSzqWC8uSzdpVJkUTIpYovLksyoL0jIllovzJF6oMvao9YpYoyC8JF6xzKomVTcXaZOdRzjmsYy9qRk7VNxdpkmTtSMixes7VEyrO41tMvrO1RMgWIZbDeomXtU3F2mWZe1RMqxTIomRSzW0yjKo9Z2rGL0s/as2WjJMvaomTtVBeVHP2oUyC/tulnVGdLOoC/OjOsfP2qDqqJm+Vo8VKBlZ+1GZYD8Sp2/DJ7hdUOxmMHyY3u77BKKbbP2ozrSuxeQmzImjvN1B+JVLho5re5qFRvQ9MvAHLvXOuqqhw8qZ58bKrM5w8pxd3m6FOidVwRnypmD9ZUuxSlbueXfmtK0IsHjgLKVtb8EBuHYuwebE53eQFS/F5T5kTG9pJKwTqFFQplnEqp5+6Bo7GhVGrqHG5qJB+sVULhyV9UB32ZGYlZEOHVMvmxOItfcs2PZ+qkGrQzS/lFd7PMzVZrIzrNxTCp8NiE77Oh+E9uuU9v1rWZ77iqQuzXQHKnOjP2q2QuzIzKnP2oL1bM0W50ZlVmSzdqpC7MjOqc6M6pC7P2ozqnMUZlbBdnSz9qpzdqM6WC7OjOqC8pZ+1LBf1iWdU50s6WC/P2ozqjOl1ilgvz9qWdUGTtSMilloyM6WdY5k7UusU3F2mTnS6ztWMZO1Iydqm4tGSZUus7VimXtSMqm41tMrrO1RMuu9YvW9qRlU3F2mUZO1Lre1YplSMhU3DaZJl7UjJ2rFMnakZO1SzVGSZO1IyrGL0s6WKRkdYkZFj9YkXqFLzIVEvIVBf2pGQDebIC/P2qJesV1VE3fI30qs18I+H6ioWzNL0s61z8SYPNjcfUqnYk8+axo7zdBybUvRnWkfWzubpJl7ggyyOAzSOPig5Nw6ZrRq4DvKpdXwN/GA92q1JOuqjHqD3oDaHEmbmtcfUqnYk/4MY8SsFpuU3IUu98Zy4gFre4KqSrncDeZw03A2VQ0JKi430trZCk2vc4nM4u7yrL7lVGOKtvqoCD9WqvirX6hVX1CAm3zmqeuXxUAfKCnw8VCkuCiNykNQo3QCdw71Lh4JE6qRPDsQpP4KQT+Co8QgHxCgd5UzoQkgPTRtTXGMNPVAj4WTf4XsqJMer5d9S5vY2zfYtRmRmWtzOO1GTLUyTXMkjnH8pxKqLlVmRmVsUWZ0Z1VmRmVszRZnRnVWZLMrZKLs6M6pzJFytkov6xGdY+ZBdZWyUX50s6oL0s6bhRkZ0usWOZEs/aruFGRnSzrH61LrO1TcXaZPWJdasYyXUesKm4u0yesSMqxusKWdZstGT1iiZVRnSzpYov6ztSMnaqM6Rffilmi8yJdYqC/tSL+1QF/WJZ78ViuqGN3vaPFVOroR+MB7kFmcXpZ1rX4kxo0a4qs4o4+bH6SgNrnRnWoNdO7cWt7gqn1M79DIR3aJQN0ZLKt1TG3zntHitHnebXcT3lAG9Abg10I+ET3BVuxJvwWOPqWvAIcUAWBSimYcQkI8ljR3qt1ZM4+cB3BUhF9UASTykm8jvSqrk6kk35pvuC7cotKAmNb2SJTZuuhC2I7lF5Ck7QKB+lBYyb2Vh4Kob9VYXWIQEHHWybBZuhvcqJN3JgkDWyCyTfORIdVAO1Q86XVolivokXC4H9yo5lEuF+26lCy5h0TzalVtKC7VKFk3PNlWTqglRulCyYdqFaXaFYpmjYQXSMb3uAUTiFKDl69hJ5aptY3GcDooh2gUWu8nQoB8lvaFk1ZN2/0hSve3coXzOAT3HXkhS0G7UuIQ3zEX9qhSTtySRNzbtRc3Kgs6slGZQJRdUwSzIuoXSugJ5ksyhdF0shLMkXKBKStkJ5u1LP2qBKRKtkJlyiXKF7JEoCwvUS9QJtvIHeqn1ETN8rB4oC8vKWZYbsQp2/jL9wJVZxKM3ysebeCoM8uSzdq1rsRPwY/S5VOr5juyDwugNsXWSzgrTOq5z+MI7gAqjLI4m8jz+sgN4ZAN5A71W6qiG+Vo8Vo7Xdrr4qwBUG0dXwN+HfuBKrOJRfBDz4WWtegWShZsDiBO5npKrNdMfijwWKFLglAtdUzFv3QjuVTnvcNXuPeUaBqVr63VAtLIPnhS0yqPw1AQcgakb1J2hSGhCostA0GqR0TvooOPFALQJgaFQJGYKQKULLUaZSoZt6WbyUoWWWslfXeol1lEO11ShY5CLntUBaw1Scb31UQVaJZaHWaAjP7VVfVJ0rGg5ntb3mybRZc52irvqAsd9dTNFjM2/Ybql2J043Z3dzVVBk3IzrqTjuWqOLAeZC495soOxWd3mxMb3klbWKTM+Ijb38pBPJaJ1fVO/GBv5rQFW6eol0M0juwH6lpYJMy8qRvg+17kDvVclVC295mD9ZaZtDVTatppn9uUq9mCVzvxAZ+c4Bdo6Sb9DjLV449tGW7EqZv4zN3AlUuxWL4LHu9AVjNnak+fLCzxJ+hXM2cb8OrP6rPrK7LQTfoeeXxHCv6jBOMP+DAB+c5VOxSpO4Mb3NW6ZgFE3znTP73AewK5mFUDN1K135xLvpXaPw+XrR55fFMfpZzT66pdvqHDusFWBLMbAyynsuV2DKeCPzKeJvcwK0PIGhIHYuy+Hr1Zwl8V9onEywSQOAlifG4i4Dm2JCTPuje9bfaT+OwH/wBr/wCRWnafLb3rxZsahJxR9PBleWCm/U6SN/kDuUg7RoVEZ8gdyuGoHYvln0UTGul1adw7lU0cFeAozRKMXTymylG3VSy3CyUgRYp5VNzRvSAFghTokLXOxdpHkQuPeQFU7FZjo2ONveSUoxZtUr8lpTiFU86Shv5rQFTJPM/zppD+srQN8XBou4gDtNlS+spmedPH4Ouufy3Nzqe3VWAW3aJRLNs7FKUbnOd+a0qAxaBwOWOQkGxuAFqTqUofMcebj7VaIbJ2LfFh9LlX76TuvZsbfAlYRCbRvVKXvr6k/jMvc0BUvqJn3zTPP6yTtwUChB2vqdT26oHJP4JSQEeKbNx70ifK8E2mze9UDdoClbck8k3ATJ3ISwIURuKk91lXfSyosBq5XBUNOqnm3pRLB/nICg46ozK0Sy0JuN1UHJ5tUotll9FAG+u6yiXaKJdZWiWXZtAlfyj3Kl0zG73tHeVU6tgbe8rT3aq7WTcZLjqo3WG/EIb6ZndwVZxIcIie82WlBkc0bMu0UXO8lat2IzHzWsHrVZral34wDuC0sUjPiI219VK9rErSGaZ++V57iomJ7zchx71tYWTxDdGojZfNIweKqNfTtH3S/cCVqxA74gHisiDDKqpjkkhhc9kY8stF7aXWlgMvKZD8UhA0ZI7wsqXYq74MI8XJ0uEz1ufqWl+RpcTuGnC549ivoMMiku6eJxa5gewk2BBJF9O5dYaZSe1HHLqPDi5P0MF2I1DtwjaO66rdV1DvxxHYLBdEygo2bqaPxF/ar2MYzzGMb+a0Be1aBerPmy+KL0RyrY6mbc2eTwJVrcIrHjSmcO1xA9q6fMTxKWi7R0UF2zzy+J5H0jn2YDVneYmd7r+xXt2edfy6lo/NYT7Vurouuq0uJHF6/O/U1jcApgfLlld6Ar24PQs16ku/OeSstF+5dVhxrpHCWpzS7kytlFSx+ZTQj9QH2q4WaNAG9wso+KL9q2kl0ji5Sl2yRN96CopXWrM0SuldK6LqWWguhK6FC0CajdJBRoto/wCNU5/9s/OWmb57e8Lc7R/d6f8ARu9q0w84d4XxNT9SR+m0f0YnQwn7W3uWQ0XtyWLCbxN7QFlM5cl8hn10y0aG6uAVQ1urR5oWTRc0J7ie9Jm4dyZ496yWyRFwO5VjcrPghUgkXCAG7kHimNQkdxVMkW70OTbzQ5UhC1gpDcUkzuKAiN6hAP4O089VInKxx5A+xEQtCwcgFQM7k2+YUEaJgWYhCLtwVd9VN/cqs1jroqkSy6+hUHOsqnVMLQc0rB+sFQ+vp/5y/cCtKLZHJIyCdVPNYBYBxCLg158LKBxI28mE+Llvw2/QxvRnk3uUF3lBaw4jLwaxvfqqzWVDz5L/ANlq2sUjLypG2e65UHEW1K1oZWzbmVDvAhTGGVj9XREfnPA+ldI6ab9DlLU412zM6+Nm+Ro7yoOrYB+NB7hdUtwac73RN8SfoVzcGPw6gfqs+srstFN+hwlrsS9St+IRcM58FA4hyiPibLMGDwDzpJXegKxuGUY3xud3vK7LQS9Tg/iWM1hxCW+jGjvuVA1s5+GG9zVtp6CkMDsrGQljXPBtq4gaN15lROG4ewnNi0LQL2AjLifRpqsS06g6Z6MWo8WO5GpNRO/Qyvt2Gyhle7fnPeStzLHg7IX5KmqlkIGUBgAHfzUnTUQpnRU2Gvkfn0klFzkzE203G1hcIsaNPJXbNGIXHXKPEq2OkmlcGxsc9x3BrS4n0LftqmtdniwSEudfMZRv5aaD1BNmIYq0WZ7njBJJFgb3PiuixN9I5PUQXbRzwgtvcfQmIGjeSVsve6SR5L5mlzjcmxJJO9ZMeAyuaXWlLQLk5Mot3laWCfsYeqxejs03VM+L6VkUUNO+qa2dzY4rEk3y3sNBfhc8VnNoKcbxI7vd9SyvekRNDjRvsRe5BK6LTS9aOL10P6U2VTNwJ80mWSaJgDQ3qwTc2NzY8L/2BVh2Ct0bT11QeZeG+xZDYo2ebExv6oUwSNxsuq03uzzv4h7L9TEnkhmpTFTYN1TjoJXOLnAXv6eF1dQ1NdR0LqdlPHckua9zrFhI104q26LLotNH3OUtfN9JGJFT1kdE+kbLHHFIbvA1Lt28+HDmbq2lpTTZ80mcuAG7da/1q5C6Rwwg7RwyanJkW2T4HdF0ii67WeWh3RdJCWKHdF0kIKHdCSEsUNCSCUsDSQhBQ0JXSUsUBSTKV+wqWaSBJO6V1Cmm2hAL6Y/ku9oWmst3j/8Akxt8b6FpuK+PqfqM/RaP6MTcQ/cW+CymGzu+yxID9pb3LIi3XPNfJkfXXRkg2urWnyQqArWnyFk0ZLTp4I4lQadE8wt4rILB5oUCLkqQd5KgXa7kAIO5B3oKpAb5pUSmPNKj4KkGN6Heae5JqbtQgKZbiB/aLK0KqYfagObgPWrgNFTIjdDrhqVtVI72jtQGgqqiZ1TKOtflDyAA4gAKYwusf5zGj896xvuk5/KefWV0sh8t3evrafDGa5Pk6vUSxVt9TTtwaX4UsTe4Eq5uDt+HUOP5rbLPumvfHT416HzJazK/UxG4VTN84yu73W9gVraCkb+IafziSrrouuqxwXocJZ8j/qYmQQs8yGNvcwKwOI3G3coIW0kujk5N9skSTv1RdRSurZKJXRdRuhBRK6LqN0XSyikjZMA2RocAbi6QhhbuhjH6qki6jSbto0pSSpMYIHmgN7hZMuPM+lQuhUyyV7q+lpZKuTKzQDznHcE6OifVOv5sY3u+gLdF0FBTXPkMG4DeT9JWJTrhHoxYd3zS6JRQwUEBIIa0aued5WprcQkrH9WwERX0bxd3/Uqp6mbEJ2tDTa/kMHtW0oaBtKA91nSnjy7ljy8vs7W8vyw4RGgw3qbSzi8m8N4N/tV1diTaQZGWdMeHBvafqWPX4mIrxU5vJuLuDe7tWDR0T6omWRzmxC5c7i7u+tKv5pCUtv8ALxdhBBPiFQ5xcTc3e88P78lLEKVlJO1rHOcHNvrw4LcUroHU7fc9urG63Dv7VjYlQyVLhLEQ5zG2LexFk556MSwLZxyzTJi5vZQnlZS2a/y5DuY0+1YU0ss7soJtpla1c8urjDiPJcOhnPmXCM/QcijjbceS01TRTU5yvAjcd4vc+KVNVSU17We3iHce3sXKOtvtHon8OpfKzdoWBBiTX6PB72hZrXB2oN17MeaOTo+dlwTxP5kS1RdJC6nEaLpISwNCSEsDQki6gJJJIuhBpJXQhRpFCSllGUrpXRftSy0arHtW0/e76Fpit1jn3KnP5TvYFpjuK+RqfOz9Bo/pI2tOftTe5ZLCbi5WLT/cWq+M6r5bPqp8GQN6uZuWPdWscFijVmQ3ch27xUWeamTdQtlo82yid5TbuUCbFBZP4SRT+EgnRDIBRA0UxuUDuKCxgeSiyY80BI8UBXILuiHN9/UVaNAq3azxjlmKsOjQqBAIcQAXcgSnxCpqnZKaZ3JjvYqiM0NE3PUQDm9vtXQE6laPDheugHI39AW74L7ml6Z+f1z+ZIEJJr3HzQumkhUg0JIUAFCElQNCEkA0kFCWAui6SnDE6eVsbN7j6O1SypW6RKBrJKiNkhIa5wBstw7C6V7rhjm9gdotTWQe5aosYTYAOaT/AH5rbVNeIaZkjWlzpGgjTQd5XOTuqPXiUVakui2oqYqKEXAGlmMHFagmoxGq+MeXBoShhnxCcuLr/Gedw/vyW6hjho4CBZrW6ucePaVLUfuap5u+IipaSOkjIbq4+c88fqCwa7FM14qd1m7nPHHuVNbiLqq8cV2xet39+SvocOykS1A13hnLvRccyDk5fJj6IUGGmW0swIj3hvF39i27mWhcxgA8kgDcNy1eKTPiq4XxuLXBh18VkUmJxzNIlIie0EnkR2fUsyba3GsbhF7F2a6n6+knBF4nDQgjf4KGJ4xLPmggcBbfl1A7+Z9iorKufEJyY3OaJDlaAdQ3h3KEEbWPETALOOXdyK+dmzPIz6GDAsS/Ex2QtYXuc6+VpJvrc/31WQIerlpJASx72OaAOJFt54KUsLWyshbZzn3HcAD7SFi1tY6QUXUOBeHOGu7W3q0Xn7PV0SmjE3ugtkL2xtLr8ytTI9rYLN1L3b+4fWVkVM05klzy5y42JbuUWUTpbE7lVwKswmPcx41K2tFXAWZIbDcCg4a0ssbg81r5I308mV+6+hXTHlp3E55cO6NSOjui61tDWEARSajc039S2INxzX18WZZEfns2B4nT6GhJO67HAE0roQDukhCWB3SUmsDhofK5c1EgjeoAugpJXQDKLG17G3NK6uhnMYLCMzHbwUsqKUrq+SEFuePVnrCoUKa7Gxeng/PPsWlcNFvMYF6WL88+xaUjQr5ep87PuaP6SNhTfcWrIbwWNS/cmrIG5fMl2fUi+C4C6mzd4KoEgq2P6Fk1Zks81HFRj8096lxWTSZJInVCR36oCy+qHFCiTvVM2Sv5AUTZMnQKJKCyY3BJx1TJ1Cg46lKFkQb1I7GH1lXHgqI9ah55NA9qtdvQljHnLFxB1sPn7W29JWS3zu4LDxR38AcObmj1rUVyiSfBg4YL17Tya4+pbZavCx/CXnkw+0LZL7mmVRPz2sd5BphRTuvUeIaEkK2Qd0XSRdLA7pISUsDQkhLA0kXSSyjWwwhzfdLwR5RbofHVYMbDLKyNu9xACupHGDEGA6WcWH2LMnao6Y+JJmXjDNYpR2tPtH0rIwyTPQht/MJbb1/SjEI+son2Fy0hyxcJkLXyx21IzAXtqFzu4nr8uX7myklipoi95DGjkN5WnqaqWulDWg5b+Swf33qVTDW1FQOsjOu63mtCz6WlZSt08p53u+gKqo8ke7I66RCioW09nyWdL6m9yzQVAFO6w3Z3jFRVIU0EdQzLI2/I8R3LSYlRy00IaHAiV4YCOPFb4HVanH35GUzwNQ42J4aBc8kmotIsYRlNNoxYMuf3PDqcpBd9PsVr4TSVzw0C7Y3lnYdw9F/UtTT1JgLiCfK49izI6o1NPKXvtIyB9jzN7n2L5rTR9FMVM3LRyVDz8IMB7xu9fqWma0yvZY+SRewW8xCzMLLWec2zjY7+P0rUUYzSGx3aqrqx2zMgpA9wJ3DkthHC1jbNaB3q2lpnGMP3BWPa0HX2rzSnbPZGKSMUtuFhVdMJ4nNtrwWwmcxmgWDPUs81pBKsbszNqqZoLuicWngbELeUVR1sAJN3NIa6++x0Hf3+C1GIC1TnAsHi/isrCsxLt+QgNcey9/oX0MEmpKj5epinB2bhAKiCS0E7ymvr2fAGmCohNCDukhG5AO/JTzh+j9/xlVdF0sEnDKbXB7lG6EIUEkJKWCccro3XaVKR7HnM1uU8VVdCF5MLF/4oz9J9BWlPFbrFv4kz9IPYVpSvmanzn2tH9JGdS/cgskLFpvuQWS1fNkfTj0XcVJm9Q3qxnBYNF8e4pjeoRHQqY3oVMkD7Er6IBSB0UFl3BQJUuAUL6qksle9kuSLpA3KEsmTr4Ktx1Kkd6gRcoLIwm75T2gepXOKpg3PPN5U3b1SWSB3rBxY2poxzf9BWaOK12LHSFvaT7FqHmMzfBHCxrMbcAPWtgVhYYLQSnm4D1f2rMX28PEEfn9S7yME7pIXezzDui6SEsDui6SEsDui6SFQO6LpIQAhCVkBm4YzNWZviNJ+hQxBpjrnkfCs8KzC35alzT8JvsVmKs1jkHa0+1cr+Y9NJ4rRsGuE8AOlpG+0LT0croq2MO55D7Fn4dJnomjiwlv8Af0rX1zerrX20uc48VI+qOmR8Rmbu6FW1/WMa8bnAFSXM9BJF0gUXQEwVptoyepp9dMx09Gq3AK1G0QDqanFzmMhAHZZc8nlNw8xopLDKOxAcWAC9raHx3+1N1jIOTBdVg3bcneTdeU9Jl+6DLT5X8WgX8LfUsGmc6CrczepRuIYNd2iZLPdPWAGxFrHms1RU+Tbe+crY2sjbewsoid7/ADjqVhvE2ZrWtAaeN9yyoIXuc1pGpXBpI9UW2KpJJAJs0hYr5GxMBbCX3NrrpaukZNSHK0ZmjRaXqxutpwAWYTTNTizWVsbpoGlrDna62UdqzqOkNNThjj5RN3K58bQBcaXF1Yd6+no0pXI+N8Qk41H3EmkjcvonxxoukhAO6EkJYGki6FANIoQlgEkkIULounlvuSshTDxX+JD9IPYVp1usSH8B/Xb9K09tV87Uec+vpPpmTTfcgslvBYtP5h71ktHFfOfZ9KPRcrGXsquCsasmrLYjvUwdVVHvKtHFQtgCgHRK6gDooWzIuojcSmd6iNxVMkik3fvSJQEJZK+9RvrvTHmlQcbBx5AoLCA/aGnncqW871CIWhYOxSJ0VFkh3rWYq688Q5NJ9a2QWqxI3rO5g+lbx+YxN8GTh4tSE83n2BZV1RRC1EztJPrVy+zj8qPgZnc2NF0kLqcaHdJCEA0XSQpYH4oukhWwO6LpISwO6LpISwW00nV1Ub76B2vduW0xFuejdbewhy0y3jSJ6YX/ABjPaFzn2menC7i4mHhUlnyR33gOHsTxVtnRycwWlY1E/q61l+JynxWfiLM9G48WkOUfErLH5sTXsFBJmo2i+rCW/wB/Ssm61uGSWfJHzAcFsFl9nfG7iiV0wVAKShsmCsPFads1E9+50QzA+1ZQKHt6yNzODmlp8VmXKoqdOzjHus0tB0O881W1wyEbtbrIfBlqupcRyBG48lJtGQ05m7xo4G4XkfHZ6l8ytFTWHJZupO9ZUNMRqRf6FfS05jjGdZJaQAuMpHeEPcoEYtoFlwZY7O4qLLZtVb1TnObl4G64NnoSNgZAyElxtotPI9jqh1iLFFTT18tS6V2YRNHm3FisWNmRxde90jEkp+hbUeY7nZMm5vvUS7MCOaGm7WnsC+nouLPj/EudrJISRdfRPkDQldCWCSSEksDQldF1LAIR6EkAyUkJJZR31TLr71FCWKMbEf4k785q05W5xD+JP7x7Vp7LwajzH1dJ9MvpvMPesoLGpvMPesgL58uz6MXwW35KTDp3qA1Cm3QBZNWWx7yVMHUqDN/gpg2uoWxE6pBpCOKLgc1BZbfUpN3IO8obu8VTIE6pg70jvTG7xQD+CVVKftL+5W8BqqpfMI5kD1qoE9zLeCHbrJneEnb96AYGi1Nab10nZYepbfgtLUm9VMb/AAiuuNcnOfRsqYWpIh+SrEmDLEwcmj2JhfXj0fAm7kwQhC1ZkEJpIAQmhUgk7ISQDskmhAFkIujxQUJbqkjdFTMY7zh6lqIn9XK19gcpvZZpxTlD6Xf2LE030ejC4x5ZB1K5+JOa3RoOcnkN62L29YxzDucCFrziT7kiJgJ43KicTm4NjHgVhqTOkZwjf4k8Pp3AmVwt8ED2rPWsOIT8Mg7mqJrqj44H6oVcWyRywiqRtQpLTmtqP50jwCiaqc/j3+lTYzXjxN0qquQxUr3DeRlHeVrqasfHOC+RzmHQ3N7dquxOS5jjB/KP0KbeaDypwbRr30MlYxzoh5cTb25jl38VQyvY2O00bjIBvb8Lt71vsOaIqXOSAXm9z6loMahjjr3PhPknfl3NJ3hcM0VJ2ejTzcIpGwpZm1NO2QaX3jkeSuIWro3Np6WGWMlzHhwlHxS03v6CFsg4ObcOBC8Uo0z6MJqSBjBmuVmRvYxhdf8AsWHu4qieTPaNj8rd5K57bOjlRl1lfHEw53b9zQdStW6r60gQQZWgakm6Ye2EEhoceJcAVU+aSUmzTbuWoxozusm2RxJuLLIAs0DsWLEC57RvuVl1ckdNJHnNhJpfgO9e3TSjBuz5uthKcVt9BIsmUL6NnxxWTQgIULJEKSSEFZCaEKKyLJpIASTSQokJ+KPFAY9d/EpOy3tWoa4tcDyW4rh/Ape4e0LTFeLUeY+lpPIZUbg57nBoaCdwVwWNTeaVktXz32fRj0TG5WN3BQG5TG8arJsmzf4KXFRZvCnxCgAaFStZR4qV1AGibbWULqQOipA4qQ0aohS5IAuq5NSwc3BTPBQdfrYx2k+pCFnJRIuU9UhclCk+IWiec0jz8Zx9q3hNrnkFpYQXSRjmR7V2xdnHI+Db2tpy0QCmdSUL6y6PhMWiE0KmQ0RohCAEaIQqARZCYQCsiyaFQJCd0XQAsmjghnzB5cHjWwO8LGumyR0bw9ps4LMuUai0nybMYfT8nH9ZMUNOPxd+9xWGcQnPFo/VUfd1T/OD9kLnUj0eJj9jPFHTj8U30lMU1OPxTPQtca2oP40+gKJq5z+Od6U2seLD2NqIYRuiZ+yFMRsG5jf2QtN7pm4zP/aR1spN+sf+0U2MeMvY3YAHABaad/uircW/Cdlb7As73VmoHS7ngZSO1YuHx56kOO5gv48EjxbGR7moo2oyQxfksHqC0rG+6Jw1wzB5u4c+K2OISFlLlG95t4KjDQGGSd5ytYMtysriLZZu5pGCcPbBXOe+FvueRpIjzEAHQbuP9+SmySOYu6ok5DlJ5lZFTWGV2YnJCzUXPrVIw+SnnM0DS6J3nt4jtC82VbY0evBPfNsg8njdVEA6XWTIBvGoVDrcF5Ue5lTo8pudQFEuANhvSke4nQ6qrLfV78reJKtGHKjPo2B8nWcG6ArVYnVCqrCWm7GDK3t5lOqr88fueC7IQLX4uWGN62lRzbszqfEjHEGSMMltzgbG3JXtxOAmxjkHoK1iXFd45prhM80sGOTto3La2md+Ny/nAhWNmhcfJljP6wWmAKm1l1tamXqc3pI+jN0Nd2vcboWnDBvtbuVrKiaLdISOTtQtrUr1Rzlo36M2SNFTT1Im8kjK8C5HA9yvXpjJSVo8couDpi0QjVI3uqQSEI1QoaI0RdCAprLe4pvzfpC0hst3V3NHN+aVpC0lePP5j6Ol8rL6XzSssbli02gKymrwS7Pox6JDcrAoAXCm3QLBom0aqdtQoN85T4hQAbXUrqJ3hSF7IUVtUbggBBQgAaqbQotU2hCWJw1Crt9vb2NJVrt6g3Wod2NH0oBoaNVIiwQBqgK5zlgkPJp9i1dI3+ExDtC2VYbUkp7LLBoherb2An1L0YVycM7pM2KEIX1D4oIQhCAnZCEIFkWQhAFkWQhUBZBQhAJCaEAkJoQDa7K4Oyh1uBGhWxg9yzjyYmNfxaQtanuWWrOkJ7TbiCPhEwfqqQiaN0bR+qtOZHne937RSzE/CPpWNjOvjL2N3lHxQPBMdi0fesqjqRCSx5sw6g8io4NI1HMm6LMSf5kV/wAoq3DossBfxefUFgVcodO55JsdGjjZKTEJnxCKM9Sxot5B1PisTmoxo1jg5zcvQyMRd9vs45WsHHmtdJWOyCOM2aDe5587KuV+VhJNyeKphGc5iuLytqkd44Yp7nyWPzSXLiXabyrqPGKikIDj1jGiwB3gd6iRwWPJFy3rld9ndcdGzkxOnrKh46pkTALh5flJ01v4rDqJqaF1jKXH4rdbd5WukicDexCptqptRdzM2Svba0cendZYb5Hym73X7OCYjcdzSVLqXAXIsqQrAUgLKVrG25FkBGyGi8gUrIDfLCAttYKbRYJPGoHNSA0UKCifNUgOKrP3IHmUBIGxBBsRqCOC2VPMJma2D27x9K1o3KcUhika8cN45hdcWRwf4HDNiWSP4m0USFK4cAQbg6goX0bPkkbJWUjqooUSaEKArqB/BZfzCtIQt5PrTyD8k+xaYheXP2j36XysspxqVlALGp/OKywF8+XZ9GPQwLKdkh9KnZZNkmizrqRGqbRqmQoUg4KTRomQkNFAG5BCAmBqtGQG9WAaKDRcqwDcgIkaqMYu+Q9oHqU7XciEeeebz9SgGR5KTWqZCAEKYlfpRu7XAetYtALzuPJpWVielOwc3/QsegHlSHsA9a9WBco8mofyszLJJoX0T5Ak7ITshBJosmqBJJ2SQDshNJAJCdkkAIQhBYIQhACEIQAhOyaoFZVPntIY26EfC+pXaN8o7gsBxPuxt+IN158064R6tPBSe5l7j6VFvnJkpE2YTdeM+gYtQ8vIYOKyY2ZGgclTEzPMXngsngjYEd6XYVIhRUAso5JZG8QFJQJ1QtidZugVThcqy1yjLqgspMV1ExLLy2CWW5SyGKIlJsWqycgTDQgMeVvkAj4KD5t1a/zSOax72iI4g2QWTOkJKre2zWt5BWu81jfEqt+rwhbJW0CFK2iVkBl0Ul2mI7xq3u4hZK1bHmOQPG9putoCHAOBuCLhe7BPcqPmanHtluXqIhJSSK7nmIoTSQpGXWF4/JPsWlJAC3b/ALm/80+xaF2pXlz9o9ul6ZkUmrnLOaFg0XnFbBo9i8E+z6Uehgb1MDRAGqmBYBczY2i7gpEaoaN3epkKFKyErKzKo5SUBAbgmNSU7WaEAclTI2WurQoMbrdWAaICLR5QSgH2kHnc+srZYJgeIbQYm2gwun90VTmOeGZ2tuBv1JA4rDMD6ZxglblkiJY8b7OGhHpQv4kCNQnZSA1RZQGtxU6Qt7z7FChHkSHmQFLFDeojHJhPr/sTohaAnm76F7dP6Hh1L4ZfYIumkvafMC6LoTVsgroumhWwK4S07VJKyAEJ2QlgSNFNjC8PN7ZRdQSxQkXV4pjmOZwa1oBc48L8EdTHID1Mji4C+VwtfuU3GtrKNEaLI6uBrGGR0mZzc3kgWR1cL2u6pz8zRezgNU3F2Mx9E7qTWhx1NgBdO0fN3oVsm0hdMKWQl1gdLXv2KMpa1oDSS4+oLMpqKtmo43J0VSODnWvo31lYzh/CI3d4V53Kl3A8QbrwSk5O2fTjFRVIsO9QfutyVmmmqRbcLJoUTQ1qkUwLBFkAkipAWSKAi7TiqxvVjtSogWKAEAaqXFAFkAJJotqgELJFwUiNFE6ICpztCqX2se1WuO9VHcgJMdmcdeAS3y2UYjZ1ips+6koSyxxyqLdU3alTYNEKVO0KzaN+aIsO9p07liSKymfkmaTud5JXTHLbI45oboNGekUykQvoHyxaJaJ2QhROsWO7j7FoDuC6C1we5aEjRebP6Hs0vqX0P3QrYsbb0LXUP3Y9y2rRrqvnz7PpQ6GBopgCwQBZSAXM6A3d4qyyQCkoCJCQGis5qIboqCrgi2iZRwWjBJu5WcFFo0UuCgO96Fh/jKg+TTewLkMWH+Gq75TL88rr+hb8JUHyab2Bchi336rvlMvzyh1fkRiWRZCahzNRiWtbbk0BW0otTN7ST61TWeVXSnkQPUFkwC1PGOxe7AeDUPgkhNC9h4GJNCEMiQmhAKyAmkqBoQhAWR/cJvzR7VURfQKccnVuva4IsQeIVgkhjOaNji/hmOgU6NcNE6o+TYbs5B8AAqaa/uqO3A3QyUAObI0vY43OuoPNSMkbGObC1wLhYucdbLNUqNNpvcOXJ1kYeSGiMeaLlGeKNruqDy5wtd1tAq5H533AtYAegKKqXBHLngbdzu5Ay21Jv2BANge1C0SyV25HEktaOXILEcS8lx3nhyVszvJEY4nM76AqrryZZW6R7sMaW5kNctlU4lWuKocL3IOoXE7koHEyPN9LBZF1iwHynDjcLJ4oykrIQEyoBKPFSUSdUIIjVKyZGqaFFbVNBRdAIoQSok8kAE2Cpe8lSdqqyN6ArcSoEqblA2KpAGkre1Wxeebqnc8d6tj88oC1wurGeaqzwCnfKwlQFTtXpgaJA3N1PigNhE/rIWu47j3prGpX2eWcHajvWSV9DHLdE+Zljsk0JNCFs5gtE9tit6N4WjkN3HsK8+f0PXpvUtof4x4LatFhqtVQ/wAaC244FeCfZ9GHRO3koaLWuU27gnpl7lzOgxoplRbuUyoBHee5MDQJFS4IDH4JpkItqtGSQ81PggDQJlQHe9C34SYPk03sC4/Ffv1XfKZfnldf0MadJdKOdPN7AuRxb79V3ymX55Q6PyIw0953pW1C9V6FMLw3FKjGYsQw+lrMjYnM6+Jr8urgbXGnBSjMVudHiM7s1RK4fHKzmC0bRyaF6p074RhOD1OAMw3DKOjMhlfL1ELWZ7Flr2GvH0r1yo2T2Yjw+WYbPYWMsReD7kZ8W/JeuGTacZ6WWRuKfR8n2KFLfrzXd9HfRrUbZSurauR9LhMTsrntHlzOG9rL7rcT/cexyUVbPlwxyyS2x7OBJA3kDvQHA7iD3FfWWE7CbM4LCI6PBaQEDWSSMSPPaXOuVkV+yOz2JwmKswWhladNYGgjuIAIXD+JXse//bJV5uT5GQvVukboiGBUcuMYCZJaKPyp6Z5zOib8Zp3lo431HavKmjyh3hd4zU1aPn5cMsUtsiKa+tmbGbMZG/8Al3C9w/yRn1L5c2khjg2qxaGKNscUdZM1jGiwaA82AHALGPKpukd9RpXgSbd2axK66PYKmgrOkDBaephjnglqQ18cjQ5rhY6EHevobHNkNnIdnsQljwDDGPZTSOa5tKwEEMNiDZJ5VB1QwaV5ouSdUfK+5K45r0XoTwyhxbbCpgxCjp6yIULnhk8Ye0Ozs1seOpXuf2GbMf5u4X/sjPqUnnUHVG8GilmhvTo+R7rOhgijiDpWhzyL2PBfVX2GbMf5u4X/ALIz6lpNuNmsBpNhMaqIMFoIpoqSRzHspmhzSBvBtouGTO5Ko8Hrx6Dw3uk7PmWXJ1hyaNUV630GYLhmLDG/fLDqWt6rqMnXxNkyXz3tcabh6F679hmzH+buF/7JH9S6ePs+Vo4R0LzLfF0mfI6ZcGtLjuHrXonTJszT4DtZBUUNNHTUddAHNZEwNY17dHAAabi0+K4TC8OkxnHaLC4fulVMyFvYXGxPgL+hdHk+Tcjy+A1l8N+hrtSSSdTqSouOq+vYth9l4omxjZ7DHBoDbupWEm3M21XNdI+y2z2H9HON1VLgeHU88VM5zJI6ZjXNNxqCBovFvPrvStK7PmR97XVZbvspSVFiQ1quwRravaPDoJ2iSKWpjY9h3OaXC4Wzxt0rMDM6OTMBuWa11wDY6i69tOxGzN/vHR/sn61P7C9ngLe8lMAPyT9a04nz/wDcYezPEQbJ3Xq2L9HGFVcDnYeDQ1Frts4ujJ5EHd4Lyyvo58Oq56SpZ1c0JLXN5FZao9WHUwzeUqvre4RfVe40WAYO7D6ZzsKoi50TCSYG6nKOxeQbTwx0+1WJQwxtjiZO4NYwWAHIBGqMYNUs0nFLo1oJukSoao1UPXZO6V+5bHZ3DDi+0NFREXZJIC/80au9QXtP2PYL/RFD/UN+pVKzyZ9XHC0mrPBb3W2w1gjpOssMzyTfsXZ9I+z1JT4LBX0NHDT9RLllEUYaC124m3IgelcTRyg4exo3t8k+lYmqR6dLmjmW5GurGhtVIBoL7liOK9I2Bw2irsVrzV0sNSBC2wlYHgHNvF12dZsngdZRTU5wyki61hb1kcLWuaeYIG8LUVas8uo1ccORwaPACokLOxXDKjCMUqKCqbaWB2Ung4cCOwjVdV0X0FJX47Wx1lLDUsbT5g2VgeAcw11VR2nlUIb/AEOEdvCtjPlr17pCwTC6PYqqnpcNpKeVr4wHxwta4XdrqAtX0V4Xh9fhWIvrKGmqXsnYGmWIPLRl3C6tc0cFq08Ty0ed3F0pXfBBX0CNnMFO7BqHwp2/Un9jWDf0LRf7M36k2nD/AHGP9p8+NGilYr1fpFwbD6HZdstLh1PTSe6GNzxwhptY6XAXl2XTgstUe3DmWaO5Ig0lpBG8ahZ4cHNDhuIusEtXrmwmE4dVbHUktRQU00jnSXe+JrifLPErtintZw1klCKkzzEgpa8l1fSDR01Hj8EdLTxQMNO1xbGwNBOZ2ui5Q7l607VnljLcrAXuFo5B9scO0r3vZ7ZnD6bZ+jZV0FNNUOjD5HSRBzrnW1zyvZTxfZDCK/B6ungwyjhnljcI5GQta5rraG4HNebJLd0TFq4wlTR4PRfxpq3DfqWopWOZWNa8ZXA2I5FbcBeOfZ92D4LRwRa+o8UwNyNQuZ0AaBTO8JAaeCnZQEbaqSXFNBZTa5RxSTC0ZJjgmdeKTUX1QWd50Mi/SbTdlLMfU1cji337rvlEvzyuu6Fwf3zITypZfoXI4t9+a75RL88odX5EYnw16r0ESW2ixaP41Mx3of8A2ryoecroMVr8JZPPh9bUUcrmFpfBIWEjlcdqnqZjPa7PQ/3Q8pO0OCRfFppH+l4+pex1dRfYaep//j3Sf/auvkmrxTEcYrIpMSrqmukYMrXVErpC0b7Ak7ltnbUY+6lNM7G8RMBZ1ZiNS/LltbLa+62ll6o43JI5PVqE5OuzW0lPJVTwU0Wskzmxt7yQB7V9fYJhNPgWCUmGUrQ2GljEbdN9t5PaTc+K+Vdk8g2zwUvAyCugvflnC+tpcxhfl86xt32WtQ+kPh0VUpHzj0h9JOK43j9VR4fXTUmF07zExkDywy2Ni5xGpuRoN1lpdmekHHtmcRjnjr6ippg77bTTSF7JG8QL7jyIXNvDhI4O84E3vzuoi116VCNVR8yWfI5775PsakqafFcLhqY7S01VEHtuLhzXC+vgV8qbYYK3Z7bTEsLYCIoJ/tV/iGzm+ogL6Q6OhI3o4wIS3ze5Gb+XD1WXh3TFlPSlW23iODN35B/YvLg4m0fV13zYYzff/wBH0qz7m3uC+Rdqf5YYz8tm+eV9dM+5t7gvkXan+WOM/LZvnlXT9snxLyxNh0dfhJwH5UPmlfTWPi+zWJD/AEWX5hXzN0ci3SRgPyofNcvpnaH+S+J/JJfmFTO/mRfh3OKX3/4PEOgiF0e21SS0ge97tb3+GxendKxkb0dVxikkidni8qNxa77o3iF5j0COcdr6kEHL7gdY2/LYvea6upMOpHVNdUw01O2wdJM8MaLmwuTpvXGU3KVnp0+NRxbEfJtVi+IRx5G19Y0dk77+1YHvhXysInrq18bhbI6d5B7wTqvqz7MNlt/2QYT/ALVH9a4Xpf2gwPEtgZKegxWgqp/dMTurhnY91g7U2BWsXm5VnHUY9uN1I1v7ny18ftf8Rv8A9YvU8UxQYfimEwOIDK6odT68+rc4fN9a8s/c978f/wBR/wDkXQdM2ISYRhGB4jFfPSYpHMP1WuJHoutTW7LRdPPZpVL2/wCyXTdg/vhsC+ujbebDZBMD+QfJd7QfBebdBeBe+O3j8SkGaLDIS8E6jrH+S31ZivfcRpqfaHZmppmkPgxClcwHgWvbofWF5/0CYI7Cti6yqmB66rrHtJI4R+R84OXO/lo7Sxp5VJHd4ni3uXaLBsMabOrXTOI/JjjufWWrUdKgv0V7QD/RHe0LnanGBiH7o6goWOvHhtBLGQD8NzczvVlXR9KYv0WbQD/RHe0LNHVy3RkfIjgWk3Ww2b/lXhXyuL54WG+JxJ8oLYbOx5dqsK1H8bi+eF3Piz8rPf5tIZPzXexfPlDitfGXPZX1TXtNwRM7T1r6Ee3Oxzb2zAhea03RJJFITLjDC0/EgN/WVpo+Po8uPGpbzrdi8XqMa2Yhqao5p2vdE59rZ8p399iuH6VKeOLHqedoAdPTHP2lpIB9HsXpWFYZTYLhcVDSgtihB1cdSd5cSvH9vscixvaKV9M4Pp6aPqY3Dc61yXDsufUo+jWl+bO5QXHJ7LQ/eyl/Qs+aF4ptZb7MMV+UOXtdB97KX9BH80LxDa0kbY4r8pckui6D6kjWXHJBIsoZxyQHhrmuIBAINuawfYs9F6L8IeKqrxOaMtDGCKK/EnVx9AHpXTbUY2MHrMEZnyiorAJPzLWPrcPQsvZaj9x7N0jXNyvlb1zwd93a+yy5DbyqNTjzaURue2njA80kZjr9S03tjZ8dRWp1LXod1jGHtxTB6ugfb7fG5g7DwPpsvA4nvpp3MkBaQcrxyIXvuF1fu7Cqaq1BljBIOhB4+teUbd4E+i2oqZoWAxVX29oG8E+d67+lJU1Zv4fNwnLGb7o0cDiNf+hb85d/NURwPhbIbdc/q2ntsSB6l5z0Uh3u3EQ5pGWNoFxbTMup23c+LZ0TROLZIqiN7XDgbnVSPyxMaqPi6rb70abpM2a98MNGL0zL1NI20oA1fFz727+660PRJ/KCu+Sj54XpODYnHjWDxVIDbvGWVnJ3Ed30FcnsxgX2OdI2I0rGkU09KZqc/k5xceB09C13yjMcjWKeGfaNj0l/yEq/0kfzgtN0P/efFPlDPmLc9JP8hqr9JH84LT9EH3oxT5Qz5ir7JD/xX9/+iXSxUz09BhhglkjLpXg5HFt/JHJedivrgLGrqif0rvrXvlZiFFQNa6tq4KZrzZpmeGgnsusU7RYGP/q2H/17PrUaLg1LxwUdl/v7HhktXUSsyyzzSN32e9xHrKxjMBwXedKGJ0Vb71+4aqnqsnW5+peHZfNtey4ESAnVgWWfVwz3wUqoYla4r2no8/kRR/nSfPK8XLGP+DbtC9o6O25dhqMXv5UnzyrHs8uv+mvv/wBnLdJf8o4PkzfnOWi2cw7312ho6Qi7HSBz/wA0an2etb7pK12jg+TN+c5ZnRlh15qzEnjzQIGHtOrvVZetOoHiUtuKzt8WqxQ4PWVR06mFzh3209dlRs5XnEtnKGqLrvdEGvP5TfJPrC1PSDVOh2YNPGHF9VI1mgJ8keUfYFr+jCufJhtfh8rXtNPP1jMzSPJd/aD6Vx9DzqF4nI4fbXChhO3dQ1jcsVSRUR9zt4/ausIHReg9KWF9dQUOKMb5VNL1Tz+Q7d/vD1rz7evLkXJ+g0eTxMSZaCMt0xYOtwKi3ViY88aLme2yR3jkrNLKocFZwQlhognVJI71C2QQEWQOCpgmEX1QFHigO/6F/wAJUXyaUeoLj8V+/Fd8pl+eV2HQv+EiH9BN7Grj8V+/Nd8pl+eUOr+mjEG9U1h/gj+0getXt4rGrT/BwObgquzjJ8GHFcSgjhdZOd3IehYzCGuuVZ1re30L2RdI8kopsyoZpqeeOojGV8T2vabbiDcexfXWz2NU+0Oz9HitK4GOpjD7fFd8Jp7QbhfHvXAixc4hdnsD0lVexVS6FzXVeGTOvJT3sWn4zDwPMbj61nIt6PTpciwyp9M6jbHo5xnAtrnY1geFMxbD5Juv9z9WJMhJu5jmHe062Ivv7F6C7YjZra7ZJl9n2YNJUsDvJphDPA4bxuHdyIWRhPSrsdi8TXR41BSvO+Oq+0ub6dPQVk1vSRsfh7M0+0VARyil60+ht1yc5Oj3Rw4Y2+KZvo46bCsMZG3LBS0sQaLmwYxo+gBfKG1mOjaDa3EsWa0llRMXRgnXING+oBfRu3WE1O1uwtRS4PXBj52NljLHDJUN35CeTufdwuvluZroJnwzAxyxuLHsdo5rhoQRzXTD6s82ubdRrg+wsGxGLFcEo6+BwdFUwskaR2i68G6RejbG6XaisxDDMOnxChrZXTA07c7o3ON3NLRrvvY8ljdHHSrJslF714kx1VhZcXMLCDJASdbA72nfb0L2ig6SNkMRiEkOP0TLi+WaTqnDvDrLK3Y5Wjq3i1UEpOmeX9FnRzjEe09PjWLUMtBTUZL42TeS+R9iB5O8AXvcr1vbXEYcJ2JxarmcA1tM9o7XOGVo8SQsHEukzZDDInPkxummcBcMpndc53dluvEekPpIqds5G0tPG6kwqF2ZsTjd0juDn207hwWZbsjtli8Wmhsi+zf9B0zX7a1TGndQO+exej9LFDVYj0c19NR00tVO90RbHEwvcbSNJsBqvIOhzG8NwHa2qqsVrYqSF1G6Nr5DYFxew29APoXtf74+yFr+/wDRftn6lzOuFp46bPm07G7TbvscxW3H+CP+pKo2Vx6lp5KiowPEoIYwXPkkpXta0cySNAvo9/SfsXGAXbR0IvzefqWg206RdkcS2Hxijo8fo56ielkZHG15u5xGgGi6wyOPSPLl0uOStyND+59tfH/9R/8AkWy6f5DHsbh5DQ7+HDf+Y5cj0JbVYJs6MaOMYnBQ+6Op6vriRmtnvbuuPStj00bY7PbRbK0VNhGLU1bNHWCRzInEkNyOF93MhRtue41DatNsv92dp0NY8cb6O6aOV158PeaR999hqw/skehdbT01Hs5gsoaerpafrah55AudI4+sr596F9saDZfHK+nxSsZSUNZCHdZIbNEjDp6QT6Au26Uuk3AKzo/rqDA8Yp6ysrcsGWFxu1hPlndyBHisNcnfHlj4VvtHEdFWLy4504++c3n1bamYjlcXA8BYL2bpV/BXtB8kd7QvnzokxnD8C6RaWuxSrjo6VkMrXSyGzQS2wC9e6ROkPZLF+jzGqCgx6jqKqemLI4mOJc43Gg0Va5OeGS8J2/c+a3XuVsdm/wCVOFfK4vnha87ys7AJWQ7SYbLK8MjZVRuc47gA4XK6nzJ+Vn0K8lrHuG8AleX1fSXjEDGltPREudYeQ4//ACXeSbSYKY3gYrSElpt9sHJeI1Lc0jOQBXR8JnydJgUm96NtjG2GNY1G6Coq+rp3b4oRkDh28T6VpDE0McBbcVCV2RygZzlIA4Ll2fXjGMFUVR9DUP3tpf0LPmheSbTYDilRtTiU0WG1ckb53Oa9sLiCOYNl6FR7X7PMoKdjsXpWubEwEFx0IaL8Ff8AZhs9/TNL+0fqW3TPi4ZZMMm1GzyA7NYyf/pNb/UO+pbjBcHirMTpsPdAPKeBIHN1sNXX9BXpLdrtn3Pa0YvTEk7sx+pclsvU4fQbRYniFbXwxxlzxDmJ1zOJJHZa3pWJJccnvx6jJKEm41SPQ3OZHGXEhjGi55ABaf7MNnv6Ypf2j9S1+0G1eFvwGpjosQhnnlb1bWsJvY6E+i684kp4pvKF2nm1JZKdHm02ieWLlO0ex4fjWG4q6RtBWw1LowC8Rm+UHcue6Q6LrMHhr2jyqZ+Vx/Jdp7belclsZUtwTaRs09QG000bo5C7cOIPpHrXe4ljOA4lhVTRvxSmyzxuZe50NtDu52TcpIjwz02dOKbRznRvL1mIV4ve0LfnLf7dG2yzz/70ftXJbAVdNg+IVz8QqooGvia1pcdCQ6+i3e2OPYViGzj4KWvhnlMrHZWHWwOpWVWyjvlhJ6tSrjg0mx+O+9eKiKZ1qWqIa++5ruDvoPf2L0t9NG+riqSPtsTXMaex1rj1BeIAjvC9G2b2vovedsWKVkcE8HkZpCfLbwPfwKmOVcM38Q07b8WH5lnSR/Iaq/SR/OC0/RF96MU+UM+Yr9t9o8FxPZOopaTEoKiZz2EMYTc2dc8FrejfGMKwbDa+OtroqZ0kzXNEh1Iy2vuXX1PJGEv4ZqubNj0o4dW4jRYa2jpJqosleXCKMvyiw32Xnw2dxe5JwavJ+Tu+pex/Zjs7b780v7R+pH2Y7O/0zS/tH6kaTGLPlxQ2KJ4xU4ZiNFF1lRhlVBGTlzyQlov3lexbOYfhtVsvhsxoKV7n07MxMTSSbWNzbmFz2320GFYls0IKLEIaiUTsdkYSTYXudy1Wxm20eDQe9+IB7qTMXRyNFzETvBHEcexRUmdsviZ8W5KmmazbyhkoNranJSCOnlDXxZAGtIygG3iCvSNh6aal2NoWTxuikcHSZXCxAc4kX8Fkx7TYBVRh4xWicBqM8gBB7itfi+3+CYbA4w1La6f4McJuL9rtwCqVcnnnkyZYLHt6OL6T5Gu2sjaCbx0rWmx3G7iPaF6FsphxwzZijhc3LK5nWyfnO1+oeC8dgrTjO1rKjGKmOOKonD5nu0a1o4DssLBewDbHZwi/vxS27HH6lpO+DephKMIY0ujJq9ocIoKl1PVYjBDMy2Zjibi4vyVUG1eA1NWylhxamknkdkawONyeW5eQYpiIxHFaqsc/WeRzx2C+g9FlpXTvp8RE8L/LjkD2ntGoWpraiY9IpLln0HjGHtxXBqqhd+PjLR2O3g+kBeIOa5jnMcMrgbEcjxXrlPtzs7PTxSOxemjkkaHFjiQWkjUHTgV5ztQaN20NXNh88c9PMeta6PcCRqPT7VwyJM9Hw/dBuEkaxnmhA85ew0WA4VBhdP12H0jiyFpe90TSTZupJsvJa2dlRiE88cbYo5HlzWNFg0X0AHcuco7T24NSs7aS6KVYPNVfFWfB8Fg9YuCEcEkBFA3qOW/wnelSEZ/nH+lWjBMKICWV/wDOv9SOrfwld+yEoHf9C/4RoPk830Lj8VH+Ga75RL88rsehgW6R6cXvaml9gXHYr9+a75TL88odn9NfcxGiwKqqITMxoBAsb6q4eavSNk+iI7U7L0uL+/XuX3Rm+1e5s+XK4t35hyRGIwc+EeUGkf8AGb61U5hY4ggG3avdP3gD/nJ/wf8A3qp/7nnM4u+yXf8A6H/3rakV6afseH27EvArtukPYD7A6ihi98fd/utj3X6nq8uUgczfeurwXoI998CoMS+yHqfdlOyfq/cmbLmaDa+fW11rcc1hk24pco8ev2H0Jg24epdtt/0cVewklK81Xu6jqQWicRZMrx8Ei54ajnryXGWTcZlBxdM3WHbcbTYRQR0VBjlbTU0VwyJjhlbc30uFqcRxGrxWukra+ofUVMti+V4GZ1hbWwXquz/QZ7+7O0GKfZB1HuyFs3V+5M2W4va+cXXCbZ7MDZDamfBjVe6+pYx3WiPJfM2+659qKRueOainLo5sWBupZmr2DBeg6kx/BqbE6HarrKapYHtPuLUcwfL3g3B7lxe3mwlXsNi8NNLN7rpqhmeGoDMgcR5zSLmxGnHcQrvMywSitzXByeZvYpMc0PHK62+y+zVXtVtFTYTRjK+Y3fIRcRMHnOPd6zYL1Go/c+RUtPJPNtS2OKJpe97qOwa0C5J8vkq5+ghglNXFHk3WNLbtt4Kxkri0BjXHttojDcOixDaqlwqlqnOpqurbTsndHY5XOyh+W/be117JF0CGNtvsiv8A/wDJ/wB65Pg6QhKfR4jXi0J1vYgrWteRzXvVX+57FTa20hYeP8DuD/vrF/8ADh//AGj/AIL/AL1qMkkWWnyN9HiAeb3FwnmXR4Bsf799In2Le7up+3zQ+6Orzfcw43y3G/Lz4r0z/wAOJ/zo/wCC/wC9abSOUcM5q4o8RvbUFRfrqvb3fucnBpy7Tgntov8AvXHbW9Du0ey1HJXM6rE6KMZpJKYEPjHNzDrbtF0tFlgyRVtHnrtTdMG+9SIuLhZeDYJiO0GKR4fhVJJVVUm5jOA4kncB2laOKt8IwSFfRsyv60i9vNvz5r2TB/3OtVNTtkxjHGU8hFzFSxdZb9Z1vYs2v/c85ac+9u0DutA0bUwDKfFp09BWd6R3/hsjXR40Z7C+UelVOl603y2totrtLspjWyeICkxel6ouuY5GnNHKObXce7eFqWCw3DwW3O0cHDa+UVTgkjTRNkLQASLlb3ZfAJtqNpqPB4X9U6peQ6TLmyNAJLrcbAL1P/w7n/Ob/gv+9c20dYYZzVxR4mQAFAuIXX9IOws2wmKUtK+r92w1URkZN1fV6g2c21zu0PiuRtdVcmJRcXTBsjmuDmmzgbgrawVbZY/K0PELCpqbrXG5sANTvWT7jFvIk1HMLMqNRsjNC6M5matOtlX7syeSfJPasj7dGzym3b2G6QAvmaQCsfc39illS4nQ3vyU/dhG9TDnNcXAR3PECxWPIy7y7TXklJi2XipYRyPaqnOJNzYgqgtN0ZSBo4elKG4yGvc09ic8o6h/5qxy54Fr3VMryW2PFVRI5cFQdqpX0ULlBN10o5Ey7S10g4qA0KsaWjeUoWWC5j1VTTqpukGWwVXFATd5yiSi5O9JCCc3MLceCtpXNfcPNg3Ui9iewdqqvYpX6uTMBotRdMklaMhwGY2BtfS6w5h9ud3q73QPin0qp7s7y61rrpOSa4OcU0KPSRvet9RQmprqeEC/WStb6SAtC3zwt3FI+JzZI3uY9hDmuabEHmF55HePTo9e2wrve/ZiqLTZ8oEDP1tPZdeQ6WCyZ8Sra2NrKqsnna03AkkLgDz1WOVmUtzOWmweBGr5GPpUh5qV9yk3zQsHqEgoQSgINUhuSClw3LRmwCaQ7k1KFnedDI/xkQfJpvYFxuK/fmu+Uy/PK7PoZ/CRB8nm9gXG4r9+a75TL88qnV/TX3ZiHcvpTol/BjhX+t/5rl82HuX0n0T/AIMcK/1v/Nch10vnZp+kDpOrtjtomYdTYdTVLHQNmzySOabkkW07lyf7/uL3P+BKH+uf9S9F2q6M8H2vxduI19TWxStiEQEL2htgSeLTrqtF+8Psz/67Ff61n/Qh2ms257XweTbcbc1W3EtJLVUUFIaRr2tETy7Nmsdb9y+jdjdNhcC+QQf8sL5x6QtmqTZPayXCqGSaWBkMcgdMQXXcDfcByX0dsb/IXA/kEH/LCPoxg3eJLd2S2o2fpNqtnKrCqq2WUeQ/eY3jzXDuP0hfKOJYVUYRilRh9ZF1VTTPMcje0cR2HeOwr6O2c2kEfSPtFszUvs4SiqpbneHMaXt8Cc3iVzPTbsd7opGbT0bPttOBHVgDzmbmv8Doew9iIueCyR3x7R3uwIt0e4EP9Cj9i8J6ZWB3SfX3/mofmBe67AEHo9wK3/o4/YvDemP8J1d+ih+YFV2NR9JGx6GtsxgmMe8NbLagr3/aXOOkUx08A7d325leu7f7KRbX7JVNAWgVTB1tM872yAaeB1B718ri4NxoexfTXRZtVUbU7HslrGPNVSP9zyykaSkAEOB52Iv296Mzp5qS8ORrOhzY0bP7M++VXCWYjiPlODxZ0cYPks7OZ7xyWh6bttSyAbLUEtnyAPrXNO5u9sfjvPZbmvS9r8cfs5snX4rFTuqJKeO7WAX1OgJ/JF7nsC+UKyqqK6smq6qQy1E7zJI929zibkqLkueSxQWOJn7GMP2d4Fr/AJfB/wAwL63meY4JHgXLWk27gvkvY3+XWBfL4P8AmBfW0jBLG5h0DgQbKsuk8rPAP/ETi4OuA0PhO/6kv/ETjP8AQNB/Xv8AqXWn9z7sqT/H8W/rY/8AoWLiXQJsxR4ZVVMddipfDE+RodLHYkNJF/I7FflMOOp9zzvosrHYj03UNc9gY6pmqZi1puGl0bzYelfRu1GJzYLspieJ0zWOnpKaSZjZAS0lrbi9uC+auhm56VsFPMSn/wCy9fSW1uH1GK7HYvh9IwPqKmlkijaXZQXFpAFzuSXZrStvG3++jw+l/dDbRMqGGrwrDZobjMyIPjcR2EuPsXvGCYvS7Q4DR4pSg+56yIStDhqARuPdqF8403QdttNUMjlpKSmYTrJJUtIb22bclfROzGCR7N7MYfg8chlbRwtjzkWzHibdpJSVehrTvK29/R8u9J2AQbN9IWJ0NIzJTOc2eJjR5rXi+UdxuAvoHov2Ig2O2UhD4x751jBLVyEa3IuGdzb277leQbXzU+1PTtEY3tfSe7KakBBvnDXAOPde6+lJH9XE55+CCUb4M6eEd8pI84266X6HZXEX4XRUnvjXxD7beTJHEd9ibEk9g3c1rdkunGDF8Ygw7F8ObQmoeI4545S9gcdAHAi4udLrxGtqZK6uqKuY5pZ5XSvJ4kkk+1d3hfQvtDiuFUmI09ZhrYqqJszA+R4cA4XF7N3qUjms2WUvlPcdsNmaXa3ZqpwupYMz2l0MhGsUgHkuHj6rr5HmifBK6KQZXsJa4ciDYj0r1n95TbK9/fii/wBqm/6V5filFNheL1lBUva+almfFI5pJBc0kEgnW2isTGpblTcaPVugDBOuxHE8ckZpAwUsRI+E7ynW8A0eK9grMcgpNpcOwd9uuroppG67smX23PoWn6L8D94Oj7Dqd7Ms87PdM35z9fULDwXm23u1ZoenfC5w+0GE9VDJY8H6yep49CnbPVF+DijZ1/TfgPvrsJ7ujbebDJRNf8g+S/2g+C+chHZfZlfRQ4lhtRRTjNDURuieOYcLFfHmJ0k2E4tV4dUC01JK6F9+bTa/0qx9jz6yNSUvcxwSzcSO5HXvabhxuoF5Pcq3ErdHiTaMuOtI0Jsk97Hvvrbs0WJryTuVNqLvZkOy28kEHtN1Gxte6ozFGY8ym0bi2yN3FY5uSmGE8Eobi1zwBvCplkznsU8gG8BVuYL6K0RsiE7JZSnfsVMhZFgErm6NUAb1KyV0tUKCEk0FgRqpBmZvEpNaXusBqrw3K0BGCjqRyKXUjk5ZNkALJTGEBv5LXFbVo8kdyoiGvisjgstm4qhtGiZGoQ36FJ28LJqyPBqm1R4BMHsQWCdkFDdyAiNyZ3J20QUMiTCYCdtEB3fQz+Een+TTewLjMVH+Ga75TL88rtOhof4yKf5NN7AuNxUf4ZrvlMvzyh2f0l92YnFfSfRP+DHCv9b/AM1y+bSNV9J9FBH72WFf63/muQ66Xzv7HHdKm3O0Wze1kdHhWIe5qd1KyQs6pjvKLnAm7gTwC4f99vbb+mv+Gi/6V7zjmwuzm0leK3FaD3TUNYIw/rnt8kEkCzSBxK1n70mxP9DD/aZf+pDrPFlcm4yPnXG8axHaHEXYhilR7oqnMDC/I1twNwsAAvqTY3+QuB/IIP8AlheJ9L+ymDbL1mFx4PR+5mzxyGQdY5+Ygtt5xPMr2zY4j7BsD1/yCD5gRk08XHJJS7PC+kbEqnBumatxGif1dRTPhkYeFxE3Q9hGh717pguK4ftnspHVsYH01bEWSxO1ykiz2Hu1C8B6WtelDFv9V/ymrZdD+2HvDtAcIq5ctBiLgGlx0jm3NPcdx8EMY8u3K4vps9v2VwmTA9mKPC5HZzRtMQd8Zoccp9Fl4H0x/hNr/wBFD8wL6UuF82dMIzdJ1aACSY4QANb+QER11SrGkcxs3s/V7TY/TYVRD7ZMfKeRpGwec49gH0BfUuF4bh2yezcdJBaCiooiXOdyAu5zjzOpK5jou2IbspgPumrYBilaA6a++Ju9sfhvPb3LmOmrbXq4fsXoJPLkAfWub8Fu9sfjvPZbmnZMcVgx75dnqGF4lQbT4BDXU1pqKsiPkvG8HQtcPSCF839Iex0mx20j4I2uOH1N5KV5+LxYe1u7usV1HQ1tn714qdnq2S1JXOzU7nHSOX4vc72969Y232Vptr9m5sPlysnH2ynlP4uQbj3Hcewp0VpajHa7PmzY4f8AnnAvl8HzwvrKocWU0jmmxa0kehfKuzVHPh/SNhNJVROhqIMShjkY7e1wkFwvqx7WvYWu1DhYozOk8rPmY9Le239Nf8NF/wBKhUdKe2dVTyQS4yTHI0scBTxC4Isfgr2n96TYj+hR/tMv/Uj96XYn+hv+Jl/6kM+Bm/u/U8T6IaYRdKmDlrjZvWix/RPX0ljWJswbA63EnxOlZSQumLGmxcGi9gvAuj+nio+nCGmgbkihqamNjb3s0MkAHoC9s25I+wHHNf8AIpfmlH2b03y42avYjpKw/bWqqaWGllo6iBgkDJXNdnbuJFuRt6Qqelypxyj2HmqcGqDCxjrVRYPL6o6XaeFja9tbFeA7NY5UbNbQUeK09y6nfdzR8Nh0c3xF/UvqqGahx/BGSsLKiirYb67nscNx8ChrFkeaDi+z5Kwqs97caoa7hSzxynua4E+xfX8ckdRA2Rjg+ORocCNxB/sXyhtfs5LsttPV4VJdzI3ZoXn4cZ1afRoe0Feq9E3SPTSYdBs7jFQIaiAZKWaR1myM4MJO5w3DmO1VnDTT2ScJHk21GA1Gzm0lbhlQwtMUhMZI0fGTdrh2ELvcB6Z6/D8Kw/CKfAIqh8EUdNGRO7NIQA0aZd5XsmN7MYNtHE2PFsPhqwzzC8Wc3ucNQsPBtg9mdn6oVWG4TBDUDzZXEyOb3FxNvBSzrHTzhK4Pg30Je6FjpWhshALmg3APEL5bpsNbtd0uy0sYLoK3E5XuI/mw8ucf2QfSvZuk/pCptmsHnw+hnbJjE7CxrWG/UA6F7uRtuG+/YuL6BMEE2LYjjcjfJpoxTRE/Gdq4+gD9pVcKyZmsmSONHurWhrAAAABYDkvP8V6HNmsZxarxGrnxE1FXI6WQtnAFzy8nQLP6Uto5tm9hKmppJ3QVk7mwQPadWucdSO5oK8CPSPtjf+Udd+036kSZvPlxxe2as+qaWBtNSRQNe6QRMDA55u42Frk81869OeBHDNuGYlG20OJwh5NtOsZ5LvVlK7XoV20xHHn4nh2L18tZURBs8L5SCcnmuGg4Gx8VtumvAhi2wMlWxodPhkgqBzyea8eg38EXDJlrNh3RPmi6YOqsMeqRYF1PkDABCRbogCykFBZXYhLKSrbJEICAZzUjYBBdZVuJKATnElRsSpZUw1UEbWUTvUyQFXvKAnHE6W+W1xwKfueW/wBzcp0pyzgfG0WcQst0VI13ueX4nrT9zS8gPFZxCCFNzLRhikdxcPBTFK0bySsiyZCWy0UiOwsBYJFhV9kiFLBRlPJMNdyVtkBLAo2m+5X20Kgwaq8DRRmkQAOifwlIgaJFQouSAnbQIAQAgDRPigDRAAGiZ3otuR8JDNgE0DenvQWd10N/hIp/k03sC47FPv1XfKZfnldl0N/hIg+TS+wLjsT+/Vd8pl+eUO0vpL7sxOK3NBtjtFhVFHR0GM1VNTRXyRMIytuSTbTmStPxUShyUmujoXdIW1wH8oa39pv1KP74e1/+cVd+036lq6DCMQxeQxYfRVFW8bxDGX277bls5dgNqoYzI/AK/KBwizH0DVU3uyPlX+prcXx/FsedE7FcQmrXQghhlIOUHfaw7As6m272ppKWKmp8erIoYWBjGNcLNaBYAaclpZaeSGV0UrHRyMNnMe0tI7wVAsKGN8k7syMRxCsxaukra+pkqamS2eWTznWFh6gFi7jcFSLTyVtNRVVY9zaamlnc0XIjYXWHgqZbrlm8HSFtc0Bo2irrDTzh9S1dRjmKVWMMxaorpZa9ha5s7rFwLdx3W0S948Wv97Kz+pd9SfvFi1vvZWf1LvqSiPNfcv1NoekPa/8Azirv2m/UufqamesqpKmplfNPM4vkkeblzjvJV8+FYhTQmWooaiGMaFz4y0DxKKfC6+ri62noqiaO5GaOMuF+8JRXl3K2zGa5zXhzSWuaQQRvB5ro/wB8La8D+UVd+036loqijqaN4ZVU8sDnC4EjC0kc9VQVCxm1zFmbU43idZjDMVqK2WXEGOa5tQbZwW+ad3Cy2374e1/+cVd+036lqWYLickbZI8OqnscMzXNhcQRzGirjw2tlrxRMpZTVH8SW2duvuPYrRFlq6f6m7PSHtf/AJxVv7TfqR++Htf/AJxV37TfqWEdlcdP/wBKqfQPrR9iuPf0VU+gfWlE/if/AJfqYdNi+IUWLe+lNWSw12Zz+vaRmu6+Y+Nz6Vs6rbraitpJaWpx2smgmaWSMc4Wc06EHRY/2KY8T96qn0D61j1uCYnh0AlrKKWnjLsoc8CxPL1JQjmXSl+pghbvD9sto8KoY6OgxqrpqaO+SJjhlbc3NrjmVgQYTiFTC2WChqZY3bnsiJB8QqKmkqKOQR1MEkDyL5ZGlptzsUoRyU+GZOL47imOzRzYrXS1skTcrHS2uBe9tAtfvTKzm4HirmhzcNqyHC4IhdqPQlCU/WTNlhe3e1GDQthosaqmRN0bG8iRo7g4GyyK3pI2vxCIxz47UtYRYiENiv4tAK50007ag05heJ82Tqy3ys3K3NZQwLFv6MrP6l31JRrxmlW79TXyPLs73uLi7Ukm5JWywna3H8DozS4Zi1TRwFxeY4iAC47zu7AqpMCxbT/BdZb9C76lr6iCamkyTQyQu+K9pafWtJHNZOflZsMY2pxvHoo4cVxSorY4nZmNlIIabWvoFqd6LIVDk3yzMwrFsRwSt914ZWy0dRlLOsiNjY7x6gttP0gbV1NPJTz7QVssMrSx7HFtnNIsQdOS01HhlfiBPuOjnqO2NhI9O5ZU+zOOU7M8uFVTWjeRHe3oSieNt43fqay6CkWlpsRYjQg8EaoLAgJbkK6loauuc5tJTTVDmi7hEwuIHbZKDaXZTdRcVlVeG11Cxr6ujnp2uNgZYy0E+KuGAYw4AjCq0g6giB2vqVozvXua06pWU3NLXFrgQQbEHgVE7kNWImyiXEpkXSsgIoUkrICcH3ZveFsbblr4R9uZ3rYncsSNJkLJEKaid6hRW1TsjinbRAKyVlK1krICNkAJ2TG9ADRqVfwVTd5VvBQqYHmkpWQRrdQtkdyE0ILDihPilZBZKyXFSSCpAG9MoCCgO66HPwkQfJpvYFx+J/fmu+US/PK7Hoc/CPT/ACab2Bcdin34rvlMvzyh2l9JfdmIu06N9hDtfikk9ZnZhlIR1pabGV28MB4cyeVua4xfS3RlhrMM6PcLY1oD54/dDzzc839lh4Izemxqc+ejewwYbs/hYjiZT0FFA3haNjBzJ+krBottNmsQqxS0uN0Us5NgwSgEnkL715H0z7QVFZtQ3BWyEUlCxrnRg6OkcL3POwIA8V5spR6Mmq2S2xXR9P7WbFYVtbQuirIWsqQ37VVMH2yM9/EdhXzZjWEVWA4zU4ZWsyz078rrbnDeHDsIsV770T7QT49sY1tXIZamikNO57jcubYFpPbY28FxnTphjIsWwvEmNAdURvheRxykEepxQmojGePxEeULsOjn741/6FvzlyC7Do6++Nd+hb85bj2fG1X0pHcVdbTUEHXVc7IIrhuZ50uVg/ZRgn9KU/pP1LX7eX+xnT+eZ9K82seRXSUmmfP0+mjlhubO+2uxzC6/Zuenpq6GaVz2EMaTc2dqszYPTZVgH89J7QvNHA8br0zYT+SzP00ntCkXbOuoxLFh2r3NB0jNzYtR6/iD85caWHXVdn0h/faj/QH5y4/iViXZ69L9KJ7Hglxs/h/yaP5oXEVNZBh/SlLVVT+rhY7ynWJteO24LtsE+8FB8nj+aF5xtb/Kyu/Ob80LpJ0keDTRUskov2Z3J2zwAf5d/wDaf9S3FPPFVU0dRC7PFK0Oa61rgrxYr17Af5O4f+gZ7EjKzOp08cSTiUVu0+D4dWPpaqr6uaO2ZvVuNri+8DtXL7Z7Q4Xi2DRQUVT1sjZw8jI5umUjiO1anbIA7W1mnxPmBaPILrMpPo9WDSxSjk9T1PYq/wBiFF+v88rkekTXaSP5O32ldhsbpslR/r/PK5LpAbfaKM/6O32lWXlOGD/yH+ZyDh5Lu5e40f3vpv0TPmheJPbZp14L22j/AIhT/omfNCQN6/qJ5nVfhIP/APoN+cF6m52UEk6DUry2paf3xybf5e35wXp8v3GT80+xWPqcdV/R9jSjbTAC4N98Q2/F0bwPTZbKqpaLGKHq6iOKqp5W3BOoI5g8O8LxGazQHlwFtN69X2Finh2SpxO1zcz3uYHCxyE6fSVYuxqNOsSUos822kwZ2BY3LR5i+KwfE47y07r9o1Hgt3sTsjHixOI17C6kY7LHH/OuG+/5I9al0oPb790TW+eKc38XG30r0LCKNmH4NSUjBYRRNb4219d0S5OmTPJYU/Vlks1JhtGHSyQ0tOzQXIY0dgWPRY7hWITdVR4hTzS/EY/U9wXmG2uLSYntJUROeTBSOMMbOAtvPeTdaBocx7XseWuabtcDYg8wU3GYaPdG2+Wev7S7KUePUz3tY2GuA8iYC2Y8ncx7F5BPFJTzyQysLJI3FrmneCN69o2ZxN+L7OUtXMbzFpZIebmmxPjv8V570i0babakzNFhUxNkNvjC7T7Aj9zWlnJSeKRyhK7Xovktjlaz41OD6HD61xK6no9rqeh2jkfVVEcEbqdzc0jg0Xu02ue5Rdnqzq8bN90qvPvdh7L75JHf7o+tdrh8mfDKSS++Fh/3QvO+krEqOu97m0lXDUBnWF3VPDrXy2vbxXV4Vj+Fs2apBJiVI2VtK0FhmaHBwZutfetep8+cH4UePc8dndnqJHfGe4+tVKR11SWT6yI+CPBSQgI+CLKVkIAjuJG94WyPFa5vnA9q2Z3rEjaIKNtVYlbcslIJqSEAlFTSIQELJgaqSBvQABqrbaBVjerfghQ0JM70+JQgI8EBNA3IAPBIhSKLoB2RZNCEABBTCRQHcdDn4SIPk03sC5DE/vxXfKZfnldh0OC3SNT/ACeX2Bchif34rflEvzyh3l9JfdmIRovqLYidlTsHgkjDce44m+IaAfWF8vncvauhfamKfCn7O1EgbUUxdJTgnz4ybkDtBJ8D2KM6aSSU6fqcL0sU0lP0kYg54IEzY5WHmMgHtaVxgGi+ktu9gKXbOmikE3uWvgBEc2XMC065XDiL+hef0fQbizqtrazFKOOnB1dCHPeR2AgD1qlzaee9uKuzoOg2lkj2YxCpcCGTVdm9uVgB9ZWD07zM9z4JBfy88r7dlmj6V6dhGE0Wz2DQYfRt6ump2WGY68y4nmTckr586SNpo9p9rpJaZ+eipG9RA7g8A3c7xPqAUO2b+Xh2Ps5G1yuw6PPvjXfoW/OXIW1XYdHn3xrv0LfnLcez4mp+lI7ieogpYusqJo4Y72zSOAF/FY3vzhX9I0f9a1anbv8Akz/rmfSvNiByXSUqZ4MGmWWG5s67b2spKv3B7lqIZ8ufN1bw63m77LebCfyWZ+mk9oXmi73o+xBjqGfD3OAkjeZWjm07/QR61mLuVnfPi2YNq9DA6Q/vpR/oT85chbevVtotnosepmDrOpniv1b7XGu8HsXOUfR7UGpBraqLqAblsVy5w5agWSUW3wXBqcccSTfR12Ci2AUHyeP5oXnG1o/81135zfmhepfaqeDUtjijb3BrQPqXkWL1oxHGKurbo2WQlv5u4epWfRy0XOSUjBXr2A/ydw/9Az2LyK2q9dwH+T2H/oGexTH2dNd5UeebY/ysrP1PmBaMLe7Y/wArKz9T5gWjAWH2evD9OP2R6lsd/JOj/X+eVym3w/8AMMf6BvtK32weIMnwd9ESBLTvJy82k3v6bhZm0ezTMdZHIyUQ1MQIa4i4cORXV8x4PmxksWobl+J5W4eSe5e10n8Qp/0TPmhcZh3R/K2rZJiFTE6FhuY4rkv7CTawXazTRU1O+aVwjiibmceAASCa7Lq8scjShyea1I/xiH5e35wXpx433LyekqTW7XQVRFjNWNfbld69Wl+5P/NPsSHqTWKtq/Aw4aTCpJLwwUT3t18hrCR6EYvisODYZJWzskexlhlYLkk7u7vXk2BYm7AMeiqhrGDllA+Ew7/r8F6/UQU+JYfJBJaSnqI7Eji0jePatJ2cs2Lw5Lc7R4ri+MTYxik1bVNDXPOjRua0bgF7fDIJII5G+a5ocO4i68RxTDJcMxKeinF3xOy3+MOB8QvS9hsaZiOBx0j3/wAJo2iNwO8s+C76PBSJ6NVC4KUekecbQ0nUbS4jG8kO90PPgTceorXXy6XuvVdqtio8fmFXTzimrA3K4uF2yAbr23HtWgoOjCqNS04hXQiAHVsNy5w5XIFvWpR1x6nHsVs6XYOJ0WyFMXC3WPfIO4u09i5XpLka/HqWO+rKfXxcV6N/BsOod7IKanj7gxoC8Vx/FJMd2gqKtrXZZXBkTTvDRo0f35rT6PPp/nyvJ6GvyhLIF38fRfIcPBfiWWsLb5BHeMHlff4rgp45aaokglblkicWOHIg2KzR7oZY5OIsgWckixGYozFQ6BkRkARcpalUDsEWCViix7VCj0SRlPJGU8kIJbTgqaaNj4muLAXN0vZX20WWzaIpWt6VKyCFkpGyLJ2RZAFlEjVSskd6AVkuKlZAGqAAFaPNCrA1VoHkqFFxTKAAgoUSBuT4oCAClZMoQErJcVLci+qGQCiVPglxQHc9Dw/xjU/yeX2BcfiY/wAMV3yiX55XY9D/AOEaD5PL7AuQxMf4YrvlEvzyod5fSj92YZU6apno6mOpppXwzxODmSMNnNPMFRKSpws9VwLpuqqeBsON4f7rc3Tr6dwY497TpfuIW9l6ccCEV4cNxB8nxXBjR6cxXh3JHFQ9K1WRKrO12t6UcX2ngfRQsbh1A/R0cbsz5Byc7l2C3iuJARuTCpxnOU3chcVvNl8bgwKqqJZ4pJBKwNAZbSxvxWkQidcnKcVOO1nVbR7V0mM4T7khp5o39Y1932tpfkuTcFJCrdmceOONbYkbK2lqJqSdlRTyOilYbtc3eFXwTG5Szo+eDtKHpALYw2voy9w3vhNr/qn61lydIGHht46Spe7kcrfpXAIWt7PK9JibujeY3tXW4ywwACmpjvjYbl35x49y0XwSmmst2eiEYwVRRENXZUG3MdFhtPSmge8wxhmYSAXt4LkAkdxVTrozkxxyKpIzMaxAYti89a2MxCW3kk3tYAb/AAWBZSTUs3FKKpFtJWVFBVMqKaUxSs3OHsPMLsKPpAaIw2tonZgNXwuFj4H61xSFVJro55MUMnmR30vSDQNb9qo6l7uTsrR7SuYxvaetxsdU/LBTA3ETOPeeK0yFXJsxDT44O0jIoagUmIU9S5pcIZGvLRvNjey7R/SBSFjh731GoI89q4VBUUmujeTDDI7kimaHrLHcuowHbkYPhUdBV0k1Q6IkMc1wFm8Ab8vYuZc7c0C2VRdHnAzOJI0BJ4LqjGSEZqpGz2q2go8eqIaiCjmp5mAseXuBD28N3EarUUeIT0FWyqpZXQzM3Ob7O0diDC4dqrdF2EIxGKjHaujuqDpLaIw3EKEucN74CLH9U/WsybpKw1rPtNHVSO4B2Vo9NyvNC0tOqloUtnJ6bG3dG7x/anEMfHVSObBSg3EMe4/nHj7FomB0cjXtNnNIcDyI3JkckiHc1DvGKiqSPRWdJdP7gBkoJTWW1aHDqy7nfeB4Lz2pkfVVUtRK4GSV5e4jmTcquzkZXHml2c4Yo47cRZAOKMrfjJ5CjIeSHYjZnai7eSlkPJGQoCOYckr3U8hSyoQihO3YiyFBjnNcCwkHsW0LRbUarFoosxMhG7Qd6zeBWJM0iotCXV9qsQVk0V5NUZCrDvQgKspUS3VXlI9yApsiyusOSWUXVBXZWAaIyAKQ3KAjxScFJCAiAmAgJ8UArJcVNJASISAUykAhAtolbVT4KKA7jofH+MaD5PL7AuRxMf4YrflEvzyuv6H/AMIsHyeX2Bclif34rflEvzyod5P+VH7swnBFlI6lIBU4Csi2qlZFt6CyFlIDRClwQEbItonZMoCIGqCExvRxQESEwNEcFLggIkIIUilZAIBOyAnZAFkiPJUrJcEBGyLJlNAK3YlZSIQgIZU7Jo4IAtoov0aSpqMurSi7I3wU5STcjepIF8u9O67nIQOidgdEaFFhwKARhY4aiyx5KdrWB2cXPBZYurIwCBccuCjBrDG4X00CjZw4LZvhaczgLXKq9z6bx4KFswNeSLlZpjYN90uri5XVoWYYudwRr2rMLI9LNCsY+NpvbUJQs117ouVl+543OJYbt39yYpmclKFmHeyYcOKzhAwDzQjqW8GtShZhXYeCMrSdLLJcwDextu5RMbXmzQGuO5KFl9MB7nYALW0KttvVNJfI4EHQq/muT7OiZEhFkyEIUhZSsiydtUAiFEhT4JckBGyLaqVkW1QBbRIBS4IsgsiQlZSIuEigsQCYGqDvTG9AIhFlIjVACCwO9CZT4oQR3JW0UjuSOgQHcdD/AOESD5PL7AuSxP771vyiT55XXdEH4Q4Pk8vsC5HE/vvW/KJfnlDvL6K+7MM70W1TK3eAYCMSElVVyGCgg8943uPIfSVG6OcIObpGuosNrMRlMdJTyTOG/KNG953BbQbMsgNq7FqSncNSxl5XD0aLa7Sk4ZSU8cMkdPhz2aMicLOdfkNXaW5rjKnGjTFjjSP6l7sofnAJ1sdF9DHoo0nqMm2/Rcv831+hmUsluODFvr1fC/JcN/5N97w4Y7SPHWZuGenc1vpVFRszXxRGWn6quiGpfTOz27xvCxKHEabEGF1PJmtvBFiFmwTS00olgkdG8bnNNivoP4LGcN2DLf3pr9Ej5r+J7J7M+Kvtaf6tmnOm/eNErarp3spsf8iYMpsROjJgMrJjwDxwPauclifBO+KVhZIwlrmneCF8TLiyYZvHlVP98r8D6MZQnFZMbtP90/ZlYGqFKyVlzBGylwQQmUAiElJJAA3IsmE0AkjuUkEaICHFNZrsGxJmEtxR1DOKB7srags8gndv71hgaoV2uxEaIKaChCJCLaJrOnwbEqbDIcRnoZ46Kc2jncyzHdxQqt9GDZQm80d6tVc24LUezEuitpuEFJoT3FdTmFyhF+xGiAYOqujJ0FtP7FSNSrWHdf8AvogEXeR3oznsSGXJuUXAE6KADIL6hRtG7ldMsUerIOhVAGAEaEqJhfbQ3TyPG5yY6zmgKg2Rjr2IPYrA+/ns8dyl9t7E/tl949CUCNmHc9ze9Bj1+6+pS8o8j4Jd7W+hAIsABu/1KIa1hBDiT2hS0v5gUg0OOgAIUKWMuWNub6J8SmB5Le5PguR0RAhFlJyXFQpHimjipaWQEEKXBCAihPihACLJjegIBFIqR1RZAQ4pjeg70xvCACEWumUwEBHinxRxTshAI0SsmUIDuOiH8IcHyeX2Bchif33rflEnzyuv6IfwhQfJ5fYFyWJj/C9b8ok+eUPRL6MfuyqipJK6vgpY/PmeGg23dvgu3r6iTA6N8Aw9s+GmLqYeBDjp5XedStNsRTdbjUs2n2iEkHkSbfWt3t8HDY+W3GeIE8gXWXq0cblPL/aqX3fqdIQvHGP9z5+y9PzOOqKWRwa+pc58hYDE4CzQyxJI5NAB7ytE4Vu0L3Np2CGnc8m+XVouba+KlT4zMKeSlqHZ2zMdGHO3sBFrBZ2zeLx4fhLKZ1K11Q4kFxdwGmgXkyucU5ds/QYIQlJRfCNNV4NU7ONbW0crnCPWRvMcT3LoMMxCLE6FtRFpm3t5FWY7DiLphDLA5sczGuDW2F2uG+/0LX7NYPLhGHZJXXe9xcQOA4eoL7XwLPklNxu0fnv9T6bDDGslU+kbgLKxiMYhhkeJ76mJwhqPyhbyHnt4FYoWwwyM1DK6lGompX6drfKB9IX1fjGCOTTvJ6w5/L1X+D8t8KzOOfwvSfH5+j/yc2F1uB9HeI7QbMnF6KohJ6wxtpy05nEOA37gNbrkxzXrmy9TNRdA+Jz08jopWe6Mr2mxGoGnpX5E/TaeEZyal7HF4z0f4phO0NDgsT4q+srI+saIQQG2JBuTwFr3W8d0M4x1By4nhz6oNzGC7gfTb12VvQt1btqq90js0wpfILjc2zjN9C1eFyYp+/QwuMnu04i4Si5v1eY3B/JyeFrKHWMMe1Sa7dfY5pmAYnJj4wQUj/fAydV1J3g9+61tb7rarr6voexqnp2uZXUU85sXQMJDwL6kX863gu8DaL9/MkZeu96rnnnze3IvOsVOLfv0OLet92++Deq336vMLW/JyeG9UrwwgueeaNZtXsXV7K4lR0UlRHWS1bS5ghYRrmy2sd5JK39L0OY1NSsfUV9DSVEgu2ne4ud3Ejj3XXZbUNhd0w7KdfbL1cpbf42uX12Ws23rdlabbYOxelxt+IxtjdE+nksy3wcgzDj67qWbeDHFyb6Trs88Ox+JQ7X0+ztY1tLUzvDWvPlMIIJDhbeNF0FR0R4vSsrpZK2mEFHH1gkyu+2kNzENHZuuV0GKbQU+PdJeypjw2voZ6edzX+7IerLgRcW1N7a+lc/0vVdQ/bf3O6Z/Uw08eRmY2BNyTbmVTEseOEZS7phiFNtFB0QUU0uKwPweUR5aYQ2kALtGl/EA6rXbNdHGL7SUHvgJYKGiN8s1QT5dt5AHDtK6rHr/APh7wu2+0Nv2ir+kcyM6LcCbQ6UB6oSZN2Xq/Jv2X9dlDUscb3Pmkjitqej/ABbZamZVzOhq6JxA6+AmzSd1wd1+eoXLEL13Zgvf0E4sMQJNOGT9Rn3ZbDLbsz3svIiFTzZoRjTj6oS9B2npNoqXozwh9di0FRhkvU9VAyEtkaCwuaHO4hoFl58dy9d29t+8zs5fd/Br/wBS5C4VcZ/Y5XZ7ozxfHsMbiL56fD6R4ux9QTd45gDcO0la3a/YTFtk2xTVQiqKSQ5W1EJJbffYg6grvemEvbs1gbKUkYdc3y+b5gyX8L2UGdY/9ztUnELkCN3UGTfbrB1dvHd2Kp8naeGHMEuUrs5iHonxaowrDa6nrKWRlexshzBzBAwszZnOPAaDTiVjbVdGmLbL4WMSdUU9dRggPfBcFl9xIPDtC7Hb2aSLoT2eax5DZRTNeAbZh1RNj4gKvBZHTfueMTEji4Rtma0E3ygPBAC1b7MvDjtwS5qzjNlej3FtqqR9bC6GjoWEjr6gkBxG/KBvtz0Ce1PR1i2y1G2ukfBW0LiAZ6cmzb7rg7geeoXo9a7A4ehjCPfGGtmwwxQ9YKJ2V2ax1cbjyc179tlpBtXs/TdHWIYVhmD487D545WRzTxiSJjyPj5jYA2PYm52HgxRjTfNX+0cpsr0dYttVROroZYKOiaS3rpyfKI32A4Dnojavo+xbZSgjr5JaetoXENNRBfySd1weB5roNmNpYafo5kwjaTBcRdgbiQ2tp2ENs597E6fC4i/JRx/Zaln6OJMW2Y2hr58Ghu91FUuOSwd5VhpqDrYgpbswsUHjuKt1ff/AB7HmIe5wIFtFIZrcLrY7N4qdndo6PFPc8dV7mdn6p+52hG/gRe4PMLo6Db0UW31XtN70U7xUhzfc4NslwBcOt52mptrcrVnljGLSt0cZd19wPFHWO+Kuu2d2694cQxiq956So99A77WRlbFck5Robs11bxsFyl+xUzJRSVMjncR5tlIPdyCWYBSDhyVMDJ7krm6AQp2ugshv3qJ7lIpHegI+CkwgHUWS1UX3AHLmoUuaPIb3KQ4pNHkhNvFcmdBEJEapkaoIUKR4p8CmUgEAWSspWSQCshNCAANUgFKyQQAkVJBCAii2qLJkaoAKAE0WQDCBvUi0tNigBDFiO9JOyLIU7boi/CFB8nl9gXJYn99qz5RJ88rruiMf4woPk8vsC5LEx/hat+USfPKHol9GP3Zvtg3tGKVcZ850II8Hf2rptqqAYhspXxEDM2PrGEmwDm6j6vFcFs/XDDscp536R3yPPJrtCfDeuxxRuImgjw2pqIp5K6oDGOjGUhgNzcej1r6Hw2pTnib7p/8P/AnmcMEZxXVr/lf5PKMMwGrxCVkpt1EhJzjhw9PCy7HDMChgkbFGwFzdQCPOKNoMHnpttpa/B4j7npw1k8THEMEhFs5FrZbDyuN9Ve/F+qiE9OSXPbdj2m7TyN+K+dr8OXG6fR+p+G6jDljuXa7/f3L9oausNXBHVUIgihaWteXBxf26btb6b/StNHrELG4uR61rMSmnq5w6pfmfuDpXFzj3C9h4BSqMew/C8UbhVRKGGKBpkl3tbKdSw25Ajxuvd8CnDT5nvdWqPk/6nxz1WnXhq2nf40bOy2WCvEVXPI/zW00pNh+StLDiuG1Nupr6Z1//cA9q2kj20uAzTBzXOrD1EdjfyQbvPqAX6T4pmx/wk0mnu4/yfhfh2HLHVRlKLW3nlexoANB3LpaLbSpotianZptHC6Coz3mLzmGY33buC5uy21Hs5V1mGxVwqKGngle5jDUVLYi4t32B7wvxx+jg5J/KYuE4rWYJikWIUEvVVER0Nrgg7wRxBXdO6Y67KZWYHh7K0tymouT6t/hdcJiOF1WE1Qgq4w1zmh7S1wc17Tuc1w0IWILE6EFDUcuTHxF0dBgtfi+LbcwVsWJxU+KTylzaioOVhdbzTpuI0t4L1qqG3tXWxUpoMLpmZ2iTEYZCXdXcF2Vp1FxcWXghIvvC2tLjWMS9VQtxqqhhkcGeXVObG0E7yb6BDpiz7E075Oy6XcXik2wom0VR/CKCLynxnWN5dmAvzFh6Uqfpfr+oi93YPQ1tTEPInN2m/O1jY91l5/UxxxVUrI521DGuIEoBAeL+drrqp09MKiCokFRBH1DM+WR9nSa2ytHE8bckoj1E3NyjxZu6nbfE63a6l2gqxHNNSOvFCLtjaNfJHHjv3rD2n2hm2nxt2JTwR073RtjyRuJFm9/etSbA6kIIQ5PJJppvs6Os20qazYmm2adRwtgp8lpg85jlN925ZmzXSPiOAYX72TUsGI0I82Ke92DfYHW47CFytHSS11dBSQgGWeRsbMxsLk2FzwUZ4nU08kMlg6NxY7XS4NihpZsie5P8DqNqOkDEtpaNlB1MNBQNIJghv5Vt1zyHIABbb7E+j+2u2h9DfqXnvbwQTc2vr3oVZrbc1Z2GNbL7PCOlg2ax332xCpqGwtgJaNCDrew4gDxXWdJjPe3o1wHCah7BVxuiaWA3vkiIcR2XIXk0M8tNOyaGV0UzDmY9jrOaeYKnVVlRWzGasqZaiU6Z5ZC4+koa8aKjJJVZ1+AdJmI4PhLMLq6KmxSjjGWNs+jmgbhfW4HC40Wt2w28xPauOKkljipKGLym08N7E8CTxtwG5c7ZUy6v8FYrk5SzZHHa3wdJje3NVjmyVBgMtFDFDQ9Xlla9xc7IwtFwdNbpUe21VRbDVOzDaOF0FRnvMXnMMxvu3LmbdqBflddKRz8ad3f4fkdZst0jYpsxQOw7qIMQw9xJEE/wb77HkeRBVm0vSbiW0GFHCoqOnwygdo+OAkl432J0sOwBceQDvbZRLBZKV2X+Iybdl8HX7LdJOJ7MYY7DH00GJYeSS2Ge4yX1IB10vwIUtp+krEdpMJ96oqSmw3DzbNFBcl4BvYnSwvrYBcVa3amDrcJS7Hj5Nuy+CbQOB1sp2v2KsEtKmDzGqI4km2upWCrv2Jg25rRCzLfiEBhvwUQ7sTzFAGVw5J2cjXmjW29AB3c0rdyeh3qOU8AVCjLeZCWUHS6fVHTRO2UaWQEm+YmOKTPN8VIBcn2dF0RsiyfghQpFOyCNVKyAiElKyRGqAihSsiyAEWTARbUoBWSTRZAJI71KyRCAdkrJp2QFsw8kFVqcjsx03BRsqzKIlCkRolZQWdt0R/hBg+Ty+wLkcT++1Z8ok+eV13RJ+EGD5PL7AuTxMf4XrPlEnzyh6ZfRj92Yi7TZbFKerqKZtaXGromOEGv3Rtt1vjBcZZS4g7iETlFqUHTRzxzUXUlafoZFbtRX5q2hpm9S4zGSodIPKL+DSOQ5dq1tbtxhkdE2CXDJcPnY0lwgOeN7ifgtNst9++y3hxGlxCPJi9M6aS1hVRENmA7eD/FYcmzVFWOtT4rRSA/BqmGJw79CFc2rlmf89f9H2dGsGKP8h19+zgKzaeepmz0MLoHD8a45nDtHALUAG5JcXOcbkk7yvTKjYdzmHNi2DsjHwWzH6GquDZTZ6hlElTPLibhuhhBijv2uPlEdwHeuazwr5eT05JqPM5I53ZXZ2TGMs8l4aGI3qKlw8lgB80c3ngF2FVUMmkYyCIQUsDBFBENzGDd3k7yeJJRPVOmjjhayOCmhFooIm5Y4x2Dn2nUqi2qJOT3SPj6rVLItkOv/YLqmU+G1Gw+DjEMQkogKqpyFlP1oOrb31FrLllkS1882G09A8t6ime97AG63fa9zx3BdDyQkldnYS0VN9ldJg8lO6opsGoZHRiS38LIaZAdPgknQcgtZBXv2iwLFzXw02eigbUQTRQtjMZzhuTyQLtIO48lqnY5iBkoJRNkmw9nVwStFnhoNwCeNtRrw0VlftDX4hSOpXinhge7PIyngbEJHcC7KNUs6vJF/v8AfR1AqxQbeUWzsNDSvw6KeGLq3QNL5CQ09YXWzXub77W0WPQQ0lFh+J4kauloql2JPpmTT0xnEbRd1mtAIBPMjcLBTw3aGkpvcNTNjbX+5WszMdh96shv4sS7sp3Xvey5qnx6so6urkgERirHl8kE0YljdqSLtOlxfehtziuf2jp6J2F1W2WFzU7qere+lmNV1dO6KKR4Y+zg0jS4324harDK6XFaPHJqmOC8WFkRtjhaxrB1jbWAHbv39qwDtHiRxWPEDJH10MZhjaIwI42Fpbla0aAWJWHR109DBVRQlobVQmCS4vdtwdORuBqhzeRX/n/0dBW4i/ZymwumoKaldHPSR1MzpYGyGoc+9wSRuFsthZazamhgw7aaspqZnVwtLXNjvfJmaHFvgTZOi2lxGhpY6eM08rISTCZ4GymEnXyCRprqtZPNLU1Ek88jpJZHFz3uNy4neShmc01SNtglDUUW12CNqI8jpp4JmC4N2OcCDotiZRhWFYli1NFC+slxN9MJZIxJ1LBd2gNxdx49i1lJtRilHSRQRSQkwNLIZXwNdLC08GPIuN57ljYdjNZhgmELo5Ip7dbFPGJY323EtPHtQqnFKkdRh0cNdjuyeJyU0Mc9bLIydjIw1kuQkB+XcL3sbclgQYgcYwbHKeopaVsVHSmophFA1hic14Fg4C5BB1ve61Z2hxF2NU+JmSMz0tupb1YEcYF7ANGgGp0WJTYhUUcdWyItArIjDLdt7tJBNuWoCF8Vfv7HbvOGYLNRUBxDDoqXqYnz081A6V9RnaC4l4B330sdFqsOrcMoYq+GhqoKKc1buoq6ul61r4QNGXIOQ8TotZSbUYnR08MUbqd5pxaCWWBr5IRya4i47OSqodoK+jglhvBUxSyda6OqhbM3PxcM24pZp5Y/v/8ARbQwTwY3L7op6aB8jWyAUv3JwIBD29h3rTSfdCs+vr6nEqx9VVydZM+wJsAAALAADQADgsGQeWVY9nlyNN8FenJLxspWRZdDmQObmClc8lNGnMoCoqNlaSokEoBNdfQqwW4lVFp3qbPKCAta5qkHBVhnpUhGeYVBPNpwKkDpuCrEbvjKQjI+EEA835IRm/JClk0Rk3ICGf8AJsjPbcFPIi3cgK8zilkcrDfglrdQDZo0jfZNJm8hTXOXZ0T4EkpIWRZA70wmmgsikVIJFBYkJoAQWCCnZNBZFJSslZBZHimnxKVkFgdyaCNE7ILFfVStooW7boBtusFqjNk7JWSzlMP7L9ylFs7fol/CDB8nl9gXJYn996z5RJ88rqeiqohg28hkmkZEwQS+U9wA3DiVyuIuDsWrCCCDPIQQd/lFQ9En/Jj92Y3FPinxRxQ84rITQgEAnYp8E0BC2qLaqSXFAFtErFSSQCsUwEwEwgIIUrJBAGqFIahHBAKyVlLgkgsSCE00BGyRCmkUBFNCkEBGyokBzlZO9Uyjy1qPZJFVjyRY8lLVGq6GBBpPwUFhPABHlc1HU7yoALAN5HgoEcgVPckUBCx4oYLPCnZLc4IC0WJsRYqXVk7kFoOhCA1wPku9KoEI3ck8j+Sed43tPgn1vO6AiA++4oOfkVPrQeKYkvuQFdnE7ipZXKeY3SBN0BEtIQdApbyokcUAmGzz2qar3uHerjoucjUWKySnvSWTRFOyE0BGyRCkgoCFkwE0IAQQmmUBFKymFFAK3YlZS4IQBbRCfBAQEMrjzRltxA7kySd6MvguhgVgP7UH0J6DTeixPIICJAI1AI7UdgUg3kCUwzn6FAQ1HGykC7/9qVgNyCUKMGw1sgEKPHQXKLO4kD2qULJ8EBQsOAue1O533ShZNLio5jb60w653XUoWNCLgo4IWw4IT4BFlAJFk0IBJp2QgFwSTIQAgEnZFkWQBZIphFkAkwErKSoIqt+9W2Vcg1CseyMgkmi3YtmBWukVKydiqCsgqNirMqRtyQFdkiNFNJzRyUFl4N2g8wixCUQvEFLVUCBKYJ//AGnZK44hUDuCNQFE5eVlLyU/J4BCEQ5O6eW6WUhQoj3FLU8LKZ9CR3XCATW+1TIUGA5tTorCFiRtAknbRBWCishFk7ICKCnZNUEUk7IsgBNBCEAJKSSAW9JOyLIAQNydkAILEQA+w3JAAuIKELRkBvshovdCEBO1go/AvxQhAR+DfikNXgHchCAkdHWGgQAC6yEIBFFrBCEIAHlBSG+3BCEKA809iPxYdx5oQgENNVIElwCELLBIIQhQDCChCAChCEAJc0IQAjihCAQUkIQAFB/BCFV2H0QskUIXQwO2iSEIBEKLhqhCAXBKyEICyHzPFS4oQgJBSsCNQhCoEQL7lIAckIQDIASO5CFARcqyhCAkzerEIWJGl0HBJCFkoFNCEAIKEIBcUkIQDKZQhACSEIAtqUIQgBCEID//2Q==',
  'rudi_2': 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAcFBQYFBAcGBgYIBwcICxILCwoKCxYPEA0SGhYbGhkWGRgcICgiHB4mHhgZIzAkJiorLS4tGyIyNTEsNSgsLSz/2wBDAQcICAsJCxULCxUsHRkdLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCz/wAARCAKjAhwDASIAAhEBAxEB/8QAHAAAAgIDAQEAAAAAAAAAAAAAAQIAAwQFBgcI/8QAYRAAAQMCAwMHBQcNCwsBCAMAAQACAwQRBRIhBjFBBxMiUWFxgRQykaGxFUJSdLLB0QgWFyMzNTY3Q2Jyc5IkJVNUVYKTorPS4Sc0RFZjZHWDlMLw8RgmRUaEo6TiZbTE/8QAGgEBAQEBAQEBAAAAAAAAAAAAAAECAwQFBv/EADMRAAICAQQBAgUDAwMFAQAAAAABAhEDBBIhMUETUQUiMjNxYYHwFCNCNFKxFZGhwdEk/9oADAMBAAIRAxEAPwCu6l0nipfrOg1Xxj6YXyNjYXvNmhUtzPfzrxZx80fBH0qu5neJCPtbfMB49qyYIzK+24DeVUg2WQQGV1zo0b1sGgNaANwSMDWNDWjRNdHyB7qZkl1LqAa6l0p0QQDkqZkiiAa6l0qioGujdJdS6Ae6GZLdBCWPmQzJCVNygGuhdKhdAOShmSXUugHzIZkgPahdCjXQJSkoXugsYlAuSE6oZrKAYlAuSFyBNlKAxclLkhcgXIUbMgXJC5KSoaGLkhdZKSkLlCjlyUuSEpSUAxd2pcyUlKSslGLkhclc5KT2qmhi5KXJSULpQGLrIZkt0CUoljZkpKW6UlUWMXIFyQuSF1tbq0Sxy5I6QN3qqScNF7gDrPHuCxHVDnvs3ojiTvK2ombMiWpDTY3B+CDr4ngsSSR0hAcbNG5o3KNG7vRtqt0APH2pVu0aFdKLR+KpeeiFUGBpyuJG7crQ617KpvHtVjdxSiJljBdqfgEkekYKPvVDQRqwIk6oD7mFOKtEsV3m68Ug4KVNRFTx55ntYOF958FpqjGJZOhSt5tvw3DpHuHBdoY5S6Oc8kY9m0nqY6b7ZUyBotYNGpPcFzuJYy51XeOABuXTOdURCXuzvLnOO9xNysSujaJmiw835yvZDTLyeSWdvo9nBuqXuErsg+5jzj19iWWQk80w2+EeofSnjZcBrW9gC+V2esdjHSPDWjX2LZRMETA0eKrhjELbb3HeVbdLA11LpboXQD3Uulv2qXQDXUukujdBY11LpSULqEY91LpLqXQD3QuluhmSxY+ZAm6TMpdUDXQulzIXQDZkLpcyF0A90LpbpcyhSzNYb0pckzHioXIBroFyUuSkoUYuQLkpclLlAOSkLkuZKSgGzJS5LmSl6hobMlLkhclLlko5ekLkhdqlc9CjlyUuVZclLkA5elLkhclLu1CjFyBclvdC6FHululJslLlaIMSlLkmZKXK0SywvSOdoq3PA3rGmqmx31ufgtPtKqVmbMh8mXtI9SxZaq+jekes7h3LHe98j2hx0+CNwRIW0qIG5eS5xuespmt6V+xKBonbuKpQjgpxup1IN3BChl80X61Q49HxV8vmDvVJ3gdq0jLA0akjuTjzUGGzSOso6ZVoFjTZgCN+j4JHPayPM9wa1upJNgFq6nGxqykZm4Z3DTwHFajByfBiU1Hs2kkscEIfM9sbRxcVq6nG3OuykZYfwjx7B9K1zhLUSc5O8vd1u4dw4KxkYG4L2Y9P5Z5Z52+issfLIZJnue88XG5VjWAbgrYYnz1LKeCKSeokNmRRNL3uPYAvQtnuSHEa7JPj9R7mQHXyaEh87h2nzWesr1pKPR522zz6CKWpqmU1NDJUVEhsyGJhe93cAuti5Gdp8QhZPPLh+HPI+4TyOc8DtyggHsuvZcDwDCdnKUwYRQx0ocLPk86ST9J51PsWTNURRyZXvaDbddLM2eVMaGNDGNt2BbKmh5plz5x9SopIA20jhqdw6ll5l8Fs+qPdEFV5lMyyUszKXSXUuqQa6OZJdS6oHzIXS3UuoQa6l0t1LoQa6F0t1MyAa6mZLdLmVKPdAlJmUugGzKXSEqXQIe6W6XMhmUAxN0C5KXJSVAPcIEpMyUushR7oFyQlLmQD5kuZIXJS5CocuS5khclzLJRy6yQvSFyUlQ0MXJS5IXJS5Qo5ckLkhKBKAYuulLkpKUlAPmQukJQLlRY+ZKXJC5KXK0Sxy5KXWSFyrdKBxGnbuVollhdbsVMk7WtuTa+7tWJNV62Zr2nd4LELnuJcSSTvJW1EhkzVTn6MOUHjxPiqmttH4pXdicDoDvWgi0Dp9wTIW6RRKFJbopm7kD5qP0KgI3BBvBS3Rv2JQdQgLH2LQqD5zVY8mwWtqcUhhJbGOeeNNNw8V0jFvoxKSXZmtIDXEkADiVgVGMRxjJTt51w0zHRo+la6WWoqzeV/R3ho0aPDii2MN3BeuGn8s8k8/hAldPVOzTvLuobgO4JmRgcE7GOfKyJjXSSvNmxsaXOcewDUrvNnuSjFcSyT4xL7k0x15oAOqHDu3M8bnsXrUVHo87bZwscbpZ2QxMfNNIbMjjaXPcewBegbO8keKYjknxyb3LpzrzDLPncO3gz1nsXpmA7NYRs3AY8KomQvIs+Z3Slf3vOvhuW1jex5s1zXG+tjdUzaMHAtnMI2apzDhNDHTlw6cvnSyfpPOp9iFdtFhtBKY5J+ce3zmxAvyd9tywqZtVj8RnqKp0FGXua2CA5S4NJF3O38NwWZV+RYLg0sUEEbedaY44mjpSvIsB296qS8nBzk1a4NhFOyeJksbg9j2hzXDiCsB0bZZZHOFzmIVmGUxoMLpaUuDnQxhhI4nj60I9TId/TKR7Oqba5ODBRVYKN1+ePrj3Ruq7qXVBZdG6qzI5kIWXUuq8ymZUhZdS6S6l1APdS6S6l1UBrqXSZlMyAYlS6S6F0A90LpLqFyAa6F0ubtQugGJQulzJS5QDkpSUuZLmUoD3QJSXSlxSijkhKXJS5KXIUYlKXJC9I5+u9Qo5ckLkhclLlCjlyUuSF/akLlDRYXXSkpC5KXIUclLdKSluhB7pSUpKUuVoWOSlLkhckLtCSVaM2PnulLxftWPLUtYLk29p7gsKSpfISB0Wnt1PeVtRM2ZstS1ug6TuoHd3lYr3OeLut3cEjBYaJ/erdFEtYbkoFh4p+CW+llQE6n0Ky12jvVfEKwe9SgWAC5UOh8FBvQJ6Y7lBYXbgCm3EpTrZY9ViNPSXa52eS3mN1P+C0ot9EckuzJJ0ssKpxKnpSWg87IPet4d5WsqK6qrNAeajPvWnf3lLHThvC69ePT3yzzTz+wZ6qqrvPOSP4DdB/ilZAGjQK9sfSaNS5xs1oFyT1AcV2eA8mmL4oGTV/71Up16YzTOHYzh4+heuMYxXB5m2+zigwl7WAFz3mzWNGZzj1ADeu1wDkuxbE8s2KP9yaU65SM07h+jub4+hemYFsthGzjP3upQJyLOqZDnld/OO7uFlsaqpZS07pZTpcN7yTYD0lasw+DAwHZnB9m4suGUbY5COnUP6cr+9x9gsFtjMxk0URd05Sco67C5S3sbLRY9Uvpq6OWM2fFRVBaeonKAfWquTnOW1WZrjJjkrwJXxYdG4s+1mzp3DQ68Gg6dqxp8PgwPE6CsoA6Fkk7YJYs5IeHA668RZbakgZS0cMDBZsbGtHoWJXkVWLYfSDXmXGsl/Na0EN9JPqVXdHKcflvyU4Jz42WgFK9jJnmQh7xcNu92tuKyqPC4Kao8pe+SqqyLGeY3cOxo3NHcqdnw5mzlA14LXc3mIPa4lbG6lnSEVSssBVbGCMEE6kkpgUrjqodDzu6l1XmKOZfBPrWPcKXSXUzK0ByVCUoKl0IPdS6S6l0IWXUuq8ymZAWXUukzKXQDXQulzIZkA90LpM3apmQD3S3S5kC5ANmQJS3SlyAa6BKXMhmQDXS3SlyUuUA5OqUlIXJS5Q0OSlLkhekLu1Qo5ckJSlyQuuoUcuSFyUuSlyFGJ7UL6pSULqCwk3QSlyGZUWMSlJSlyQuVJYxcgXKsvA3rGmqdLNK0lZLL5J2sB13b+pYslUXHoek/MFjyPLhqpusuiRCt13OuSSSd5RHnKHWyZos5aJZcxvRRIRb5qjtyhorQcNQm4BB3nBUgwHmph5yUb29yWaqhpm5pnhvUN5PgiTfRHKi4FUVVZDSuvK/pW0aNSVrJ8UnmJbTgxMPH3x+hYrIdbuuXHeSd69MMDfLPPLNXRkz4jU1V2xDmY+w9I+PDwVMdO1vDVOAGgZtOAHWuuwDk+xfGAyaoZ7mUjtecnb9scPzWb/TZeyONR6PO5OXZywYBYcToANb9y7HAOTjF8WDJqv966Q65pW3lcOxnDvNl6HgGyWD7PBr6Sm52q41M/Tk8ODfBdAAXG+9G6MmnwLZPB9nQHUNNmqLWdUzdOU+Pve4WW7DC517XKvgpHPcARa/WtnHSMpXBzyHdi88syXRtR9zX01DJO6wHpWr2koZIKaBjxoamLUbvOXR1NdHH5lgeoLn8clqK+gdHC8CRjmyRg7i5puExynKVmZpbS1wsfFaWrpW4tiNbDmyxw0pp844SOOY+gAelOcQxOrbzUOHupHnzppnAtZ2gcSsmkpmUdOIYy4i5c5zjdz3He4nrK9a4PM/n48GFTV+NCBtO7DRz7AGmd8gERt77rPcs+hoxSMkdJIZqic3mlItnPVbgBwCtumBVbLGNdscWaABoALAI3skzAIZ1DoW3SOeL70uZKTqlEPPMwRzKq/ciCvgH1izMpmVd1LqgsupdJdS6pCy6l1XdG6Ae6l0l1LqgfMpmSXQuhB7qZrqvMhdAWZkLpMyBKAfMgXJLoXQD5kC5JdKXKFHLkC5VlyBcoBy5KXWSXSkqFGL0pekJKUuQDlyQuSlyQlZNDlyXMlzJSUA5KUlLdAlKA10pclJSlytCxyUpKQuVUkoYOkbLVEstLlTLO2ManXgFQ6oc/RugVB0kutJEDJK+QkE2FtwUIGUIEXdccQmIs0aLQEdZMd/ggeCbg7uWgVkaJh56FtEw85CWWjcFL62UB0CSWVkTS+R4a0cSUSsWRx3KuaaOFueV4YO3isCoxUvJbTN/nuHsCwsrpX55XF7usleiGBvs4SzJcIzJsVkkOSmYWj4R3/4LFERc4ukcXOO8kpujG25IaF02A7DYzjgbKYvc+jdrz9QCC4fms3nxsF7IY1E88puXZzfRY27iAF1GBbBYzjYZM+MYdRu156oaczh+azee82C9EwHYzBsALZYoDVVY/0moAc4fojc3w9K6AuLjcm5K6HOzS4Dsdg2zxbLTweUVY/0mos5/wDNG5vgt9mubnVVXKN1CWZMfScAN5W8pqBjYQ97rO32XNtkLTobFZgxKfJkMhI6+K4ZYOXR0jJG8mrY448pABHVvWumxB7gQDYLXOnJOpukLyViOFLllc/YvfKTxVZfdU5lMy9CSRzbLLqZlXmCGY8FsyXZgN6BeeCqRBsrQLA4prqsFG6AsQdvQB0QOpVoHnGZG6rBTtbdfnbPrhBRugWG25LuSyUOCpmSXUvZUhZmQuq7qZlbBZmUzKvMhmWgW50C9V3ChKgLMyGZVkhDMgLMyGZJmQLksDlyBckulzICwuSlyQuSlygHLkpd2qsuS5tFAWF10pcqy5KXIUsL0hckJSkoaHzIXSkpboLGJQLrJSUpKCx8yUuSFyUuAGqtGbHLtFW54GpNgseWsa3RvSPqWM57pHXcb9nBa2ksyZKq9wz0lUklxuTcpQL+lNberVAjUCNSmaEDv13KoEA3gpjuS3D7ncmPBWgIdXNTE9EqaZwg8hrCSQB1lWrJYt9VHPaxpc9wa0DUlYE+JsaS2BvOO+EfN/xWC8y1D807y7qHAeC7wwuRxllS6M+fFx5tMzOfhu3eA4rAdzkz+cmeXu7eCazWNuSAO1dDgexWMY4Gyth8ipHfl6gEXH5rd59QXshijE88puXZzwAY25IaB1rpMC2HxnHA2VsQoqR2vP1AIuPzW7z6gvQ8C2IwbAy2bmjW1Y/L1AByn81u5vt7V0Rfc6kkrpZzs0GBbE4NgTmTNiNZWN18oqACQfzW7m+3tXRF5JuTcqu6gKELMxUBShQILHupdBC6EDdTMkupdAPmUD0l1AgLM4QLrpLogq0BgUQUviiFSWOEQkujdUFgKIKrBTXVLZZdA70t1EB5uzUrYUVJLVzshhYXyP3NHFYNFFJVV0NNEAZJnBjbmwuvVMEwWHB6aws+dw6chHqHUF+ehieR0j6c8igjCp9iqEUdqh0hncPPa6wYewbj4rito8IkwKujhFTDVtkF7N6L2d41C7LaTa1mGZqSjLZK0jU72xd/Wez0rzuaV0szpZHmSV5u57jckreVY41GCOeLe/mkLdC6UlKXLmdx8yl0mZC6EHJUzJMymZUDZlLpMyl0A5KGZJmQLu1AOXIEpC5TMhBsyUuSlyUuQoxcgXJSUhcoBi6yBclLkmZCj5kt0uZC6AbMlughdAG6UlAuSlytAYlIXKiWpZHpfM7qCxJZ3yGxNh1BaSJZlvqmtJDekVjve+Tzjp1JGDRNwWqIVHzk7eCQjpKxoWmQIG7vT8EBwRJULYRvSPNrDrTXSO3hVIljWAvZQ7uocSeCwqjFIojlj+3P6gdB4rXzTT1RvK/o/AboF2hilI5SypdGdUYpFG8iD7c/dceaPHisCWSaqded5I4NGgHgoA1jb6NHaugwXY7F8ayyMh8kpT+XnBAI/NbvPsXshhjE80sjkc+AGNubAdZXQ4JsZi+N5ZWQ+SUp/L1AIBH5rd7vYu/wXYvB8FLZTF5bVt/LTgGx/NbuHtXRZiTqbrsc7NBgexOD4IWy80a2rb+XqADY/mt3D2roy4k3Juq7o3UA91LpVLoQa6YJLpgbIB0bpC6zHPcQ1jRcucbADtK1Yx1lY90WDUsmKyDQyMOSnZ3ynQ/zboDcAF2gBJWAcYoXYk3D4ZvKakmz2wNLxF2vcNG+JutNXSxvBbjWKOqv9ww4mOLue/znekDsWHJjU4pvJKCGLDaQboqduX0lbUWzz5NRCB2SC0mCY4KrLSVTrVAFmPO6T/8Ab2rd3WWmjcMimrRFLoXQuqbGRS3RugGUuluiCgGBRukvdG61QHuiCkuiHIB7qXS3QuoDzUEbitnS7QYrSRGKHEZ2stYNc7Pbuvey1N0cy/Pc+D67SfZeZCS43JLjckm5JSFyrzIZlKKOSpdV3UuqB8yF0t0LoQe6l1WSpdAPdTMkuhdAOShmSXQugHJQJSkoXQDXSkpSULoA3QuhdLdChJQJQJSkqiw3QughdUDEpCUr5Gxi7j4LFkqHuuGjKPWqkZL5Z2R6E69QWLJO9+g6I7FXx1R4LSQEA6YQIHrTDzylceC0Sy1m5MbAWQGjUD5pQllYGt1YNEiYEq0BwVDqViT4hDAco+2P+C35zwWvmqaiq0e7Iw+8b8/WukcTkc5ZEjYVGJQw3az7a/qbuHeVrZp56r7o/Kz4DdB/ilDWxtvoAFv8G2RxXGssjIfJaY/l5xYEfmt3n2L2QwqJ55ZHI0AYxgubNA4ldBgux2LY0GyMh8lpj+XnBAI/NbvPsXe4LsZhODlspj8sqhrz04BsfzW7h7V0JcTv1XY5WaDBNi8IwZzZTGa2qH5acA5T+a3cPauhc65uSq7lS6pCy6l0gR3IB0wSBNdCDXCl1iVuI0mHNa6sqGxF3mM3vf8AotGp8AsKavxGaPOyOLB6U/6RXdKVw/NiG7+cfBQN1yza1FRBR07qiqnjp4W75JHBrfSVr/daqrYy7CqL7Rxra28MI7Wt85/qHatI+toKeoE8MMmJVjd1XXnNl/QZub4ALEq62qr5M9VO+U8AT0R3BbWNvs8mTVRj1ybGrnw8vDq+olx6oabhjhzdKw9kY0PjdY1Zi9bXMEckojgboIYhlYB1WCwexFdlBI8E8859sgAAsBZFC6K0cAEXtYkEagjeF1GCY35XlpKpwFQNGP4Sf4+1cwhbvBGoI3gqNJnXFleN2j0JRaXBcb8rtS1TgKgeY/cJB9PtW5uuDVH14TU1aCpdC6F0Og11LpbqXQDAogpLqAqgsujdV3RBUIPdFICpdCnmYKN0l0br88fXGugShdAlANdTMkupdANmUzJboXQDZlCUt0LoBrqXS3QzIBiUMyW6l0AcyBKF0LoQJQupdBCkupdAlC6oISlUc4AXJAHWViyVfCMX7SqkSzJc9rG3cbBYctYScsYy9p3qpzi83cblJxW0iNjNuQSSSSd5UO4qMPQ8VH7iqAdSY6WQ6kXcFSCDeUtgXBN1oe/8VTJYFHbtFj1FbFT6Odmf8FupWvmrKiouB9qZ1DefFbjjcjMppGbPWwwaE5n/AAW6n/BYMtVUVNwTzcfwW8e8qtrGsFzYdq32EbI4pi+WRsXktMfy04IuOxu8+xeuGJLs80sjZoQxjBfQALfYRslimL5ZGxClpj+WnBFx+a3eV3WEbIYVhGWTm/K6kflphex7G7gt4XX1Juu6OVmjwfZDCsILZTH5ZUt/KzC9j+a3cF0OYniqQUwKoLbqXskujdUljXRukRF/Aa3QWOCmGpsNStWcYikkdFh8UmJTN0IgtzbP0pD0R6ysCrqybtxLEdD/AKHhxIHc+U6nwsiTfRmU1Hlm3qsXpKWfyfM+oqjup6dvOSeIG7xssKrrK0t/dtVHg0J/JQ2mqnePms8Ae9ac4tJFAafD4YsOpjvZALOd3u3lYW8kk3J3km5W1j9zxz1aXEEbJuJxUT3uwqkEEj/Oqpzzs7+9x3LBklknlMk0jpXne55uUigK6pJdHinklP6mMEQhdFWzkHiopqpdCBUQupuVAVLoXUvdAQ69YI3EbwunwXGvK8tLVOtUDRrv4T/H2rl7oHgQSCNQRvCjVnXFkeN2j0G6l1pMGxvyu1LVOAqQLNf/AAg+n2rcXXFqj68JqatDXQulJQuobLLogqu6YFWwNe6N0l0bqAcFG6rujdAeaXUulupdfnj69jE2QuhdC6Cxi5S6VRANdC6F0LqixroXQQuqLGJQulJUuoLGuhdBBUlhupdC6W6CxiULoEqiWqZHcN6TvUiQsvJsLk2Cx5axrdGDMevgsR8r5XdM6cBwSraiSwvkfIbuddQbkqceatAG5LxTpL6lAOzzUrrnQJhuCW+qEsb3yj1TPUxU+sj7Hg3eT4LAmr557iMc0zr99/gukYORzlNIzJ6qKnb03dLg0alYElXPMLM+1M7N58VWIw25O88St7hOyWJ4plk5sUtOdedmFrjsbvK9UMSXLPPLI2aEMawX9ZW+wnZPE8Vyyc15LTn8rMLXHY3eV22E7LYZhJbI2LymoH5aYXI7huC3RceJuuyOVmnwjZPC8JLZBH5VUj8rMAbHsbuC3ua+pKqBRBVJY+ZC6Cl1RYQU4KrBVVVW09DGH1M7Ig7zQ46u7hvPgqQygUsk0cMTpZpGRRt3ve4ADxK1cuIVb488cbKCA7p6zzj+jENT427lq5q2lbMJWskxCobunrNWtP5sY0Cqi30c55Iw7Zuji0lSwuw6lM0Y31NQTFAO4nV3gPFauqq6aU/uyokxZ/8ABN+1UzT+iNXeN1r6mrqa1+apmdKeAO4dwVQXVQ9zxz1Tf0mZUYnVVUYiL2wwN0bDCMjAO4LFAAGgQR8V0XB5JScnbDdFBRDAUUFAUA6iCKECFLoXUuhA3UulupdCjXQuhdRAG6F0FFQA68SCNQRvC6bBsa8rApqpwFSNGu/hB9PtXMk6JSNxBII1BG8LLjZ1x5Hjdo9AvdS60uDY15WBTVLgKkea47pB9K3F1yao+tCamrQ91LpblC5UNWWXUukujdQDgqApLo3VB5oCjdIovgn1h7oXSqXSgNdS6W6F0A11LoXQugGJQuhdS6EsKl0t1CUASVLpVVLOyIdI69Q3q0LLrrHmqmMuB0ndQWLJUSTG18reoKsiy0o+5mwyTyyTMDnkA30G5A8Un+kMHU0lWbwVqgQb1DuRCB81Qoqs96q+Ks4KksB0CUfOlmmjhbmkcGj2rXyV8khIhbkb8I71uMG+jEppGwmqIqdoMjw3qHE+C18tdLLcRAxN+EfO/wAFRkFy55LnHeSVvML2VxHEQ2RzPJYD+UlFie5u8r0xxJdnCWVs0YjAOYkkneTqSt9hWymI4kGyOZ5LAfyko1Pc3eV2GFbN4dheV7I+fnH5WXU+A3BbkanrK68I5WarCtmMNwotkbF5RUD8rLqR3DcFuDc7zdXw0ckmpFgOtZrW01K05rOPAnePBcnlS4XJdpqiVBvV9TJFI67I8p4nr8FjOc1rgCbFxsNd5XaLtcmWqLEVjtqoXS822VpcN4B3LEqsco6cHI/n3DQ5HANB7XHQLVmTZ3WNUYjTU8ohLnSTndDE3PIfAbvGy5tm0cFdUyQ1FXI3LugpeiHdhkOp8LIvxJ0UToqZsdFCd7YdC7vdvK0lZznkUDbVVdUD/OJmYaz4DLS1Dv8Atb61rhiDKeRz6GDm5XaGomPOTO/nHd4LUw1tPPMWRSB7he5HFZIOq6xijxZM8+uhnvfNKZJXuked7nG5QUU0XQ8rd9kTJUbqgKPihdS6EGRG5KpftQgyISqXUINdG6TxRVA10EEFAMolupdAMpdLdG6oDdBC6l0Ab3QQKBKpSHgQSCNQRvBXT4NjQqwKapIFSPNduEn+K5e6B3ggkEagjeCo1Z1x5Hjdo9AupdabB8aFXamqSBUjRrtwk/xW3uuFUfTjNSVoa6IKrv2lG6pse6YHRVXTAoDzVG6VS9l8E+rYbqJbqXQWNvUQuhdANdBC6l0FhUS3QJ0uTZKJY6V72xtzONgsaSrA6Mep6+CxnFzjmcSStKJLL5Ktz+iwZR18Vju1PaoD0igdVqqIQInggESqWxB/nI7GfOrFW3/OHdjQrUJZG7igdwQdIyKMukeGDtKwJsSc/owNsPhu+hajBvojml2ZkkjIhmkcGjtWHNiL33EDco+G7f6FiOBe/PI4uceJ1K3OG7NV1dZ8jRSwn30g1Pc36V6I4kuWcJZX4NNlJdnkcXOPE6lbvDdmK/EA17mClhPv5RqR2N3rqsNwGgw2z44udmH5WTU+A3BbTNcrtddHBswML2dw7DCHxxc9OPysup8BuC29yTqqwUwQhZeyZkjmODmmxHFVohWhZmGvneyxcO+2qqMhf0iSSsOpqoaSLPNI2O+651PcN5XKY3taIy6OmFxlHnjU36hw8VNqXRbZ0/uxSZ5WunY0sNhc2B/8K4Xa/GG1tfC2CSQiA9K5OUngQ351zc8jnzl7nZiTe/aq3yOc699es63VBm+6VUGWEpAcLEdfeqZamSUgPkLsu5Y+bS+iBdfWwHclCy5kr4n52OLXdYKMlVNLKHvkLnWtvVIdZTSyoMqmqObka9ps4Het7Nj8TKVuQkyEa6blzANtx3KzUtJ6lU2ujnPHGfZ2FDisFXEwF4Ex3tWfcHcVwcM8kV3MfYjis+kxiemY1t84B16yF0WT3PLPTeYnXb0VXhYmxOBroI8598b2De8raSYNLFLSxumaXzuIIbuaALk34rruR5fSn7GvALjZrXOPU0XQBXUxVNHQ1keHwtLXkcBx7T1rT47G2PFC5oA5xgebdeo+ZRSt0ani2RuzXgopL2RutnnGUulujdAMoluiChAqJbqXQDKJbqEoUZRLdC6oHQuhdAlAMgghdAEoIXULrDVUoeIIJBGoI3hdNg+M+V2pqkgVA8124Sf4rnIKaoqTaCCSXtaNPTuWyg2eqX2M0zIOPROZw+ZYlR3xb07ijp7qAqmMOZG1rpHSuAsXuABPabJ7rmfRLLogqsFMDohTzfgpvQuhdfDPqDIXQupdCWG6CF1LoLGUuqpJmRtu42WHJUvk0b0W+tWiWZUtUyPTzndQWK+V8p6R06lTuKcb1qqIEb0x1St3puKosA85Q6otGpUQEAQOpRCB85AIz7vJ4D1JpnGOnkeN7WkhLH90lP53zJaw2opv0Va5JfBqTmkfmkcXvPErbUOz1XV2dIPJoj7546R7grdl2Ndir3FoOSIkXG43C6y9yvYuDyNmLh2DUWH2dHHnl/hJNT4dS2wN+Oqx2K5qpktCdqVqcIB2pwsI18ZJbTsdUubvyea3vcdAsKors1xLUF3+ypjlHjIdT4WW0rMSmo9mzmrYYZOaLjJMd0UYzP8AQN3isSorpRpLM2jb8CO0kx/7W+tat1ZJk5qFrKaI72RC1+87yqSQ1pOgtqSuih7nmlqPERcSxXyVjvJmCJzwS6R7s0pA/OPsC4ieZ00z5HOJc43JJuVs8YrXSy5AWlltOPWtQQubq+D0Y7q5AN0vFNvUyknch0IAh8ys5p4F7Jebd1JaLTF4qWCbISdxRMbgLkWSyci8NNyZl7EApbJx0RrvQgI3Fp4ei6sc4A6b+sbkobxBGmqZ1rA2sqDc4Dj82DSSFjS9stsze7q6iu02ZxCXFazymaRxIjOVpN7XK80a5wAcLiy3mA4/JhVSwlmdm5wG+xVToxNXR3cNHPJtNJM5jhGx5fmI0Omllg4zOJ8VkLTdsYDAe7f61a/aN9RSkUzMmbTO46juC1fpK7RXk+fllFfLEKKF1CV0PMFFLe6N0AVLoXUugDdBS6l0BLqIZlLoA3US3Ubd7w1jS93U0XKFqxlFmQ4RWzWJjEIPGQ29Q1WfBgMDdZ5nynqb0R9Km5HWOGcvBoy4A2J1KyIMOramxjp3Bp98/oj1rpIKanpfuEEcZ6wLn071aXEm53rDmd46b/czTQ7OnfUVNvzYh85+hbGDC6GnsWU7XOHvpOmfWsi6l1lybPRHFGPSLM2lr6DgpdJdS6HTotBUuq8yYFAPdOCqQUwKEPObqXSgqXXxqPp2NdS6S6V8rIhdx8OKUQsVE1SGAhlnO6+AWPLUPkNvNb1BVkaLSiSyDM4Bzjmcd5RGqAGgTDgqQG93inG9IB0k4CGrC3em4pWhN1qEsjeKCI4pShbGG5L75MELdJCWVw6l563FV12lDJ22HrCugHRJ6yfaqsR0o3Drc0etbXZG+DK2WH7sqXdUYHrXTN1XN7Lt6dW7saPWV0DpooLGR4aTuG8nuG8r1njZlMF1cXtijL3uaxg3ucbBax9a9o3Np2njJ0nnuYPnWK6qGfMxhkeN0s3SI7huC0otnOWSMezburiWZoIxk/hpTkZ4cXeAWDPWMk0kc6rPU7oRD+aNT4rCe98r88j3PceLjdS66KCPNLO30XS1E07Q17+gNzGizR4BINyUJguh5nK+wqmq1pXi9ri1+pXIPGaMtIvmFrIyJ8nEVDs0hA0A003IRQumNm7hvKyK2ECufFE0CxygDVbCClbFGGDhvPWvJKW0+zjjuMGKh+Fqrm0zWjQarP5odSBYAVxc2z0KKRh812Ic0CdyypLWsqSbbkTNEbSBw1FgmdRgx7hu4JmP03+Ctz2b2KWxSNPU04iIsqL6aBbGrbzjxYaBYTotbNK9EXxyeaap8FVzu4JgRlseu6hjI7VMp3WuV0OQzZOjbdcp25gWu0vwVY087Uq5u5p47lQdPg8rXYeLDKQdQs661mDwBlOZCek73t9y2S7x6PlZa3ugqXQUJWjmG6N0ql0AxKl0pcBvNldDSVNRrFA8j4R0HpKWVJvoquoTbitnFgb3azTtYOpgufSVnRYbRwkERCRw4yHN/gsuSR2jgk+zQRRSzutDE+Q/mi/rWfFgtU+xlfHCOq+Y+pbrNZthoOoaBS6zvZ3jp4rsw4cGpI9Xh85/PNh6As+NrYW5YmNjb1NFkt1AVm2d1FR6RZdS6UFHMhoa6CGZKSgGupdLdS6AsupdICjdUD3TA2VYcjdUllgKYHRVXTB2igPOQVC4AXJsFRJUNZoOk7qWLJK+Q9I6dXBfJUT6NmRLV6ER+lY4Jcbk3J4oHcmbuC0lRLIN6Y7lBvUKAnAIgoFNwQAG9OlCYblBYW8UeCDUeCAg4ocCmCFtEARuRAsUeHgoevsUKV0w+1A9d/aqMSP7maOuQfOsmD7g3uWLiZ+0x9r/AJitx+ozJ/KX4JKYoqj7a5gcW6MaMx06zuWcKhzSeaAivvcDd573HVazDPuEh63fMs4L3JHysk3dFjeveesqwKtqsbvXRHmbGCayARutGAjemulaC65a0utqbC9ln0uGOmjbLJK2KJwvfebKWiqDl0YNxxKbm5ZYpTE3PkYXmx4BbKj8nooYppQC6d5a1x963rRzxxUFbUU5blklytcN1tP8VGzqsdctnCURdU1T6mQWd3cSti0WskvI6WV0os8vN9LJt25eCfLPs41URsxtqAq3O1RLrJS24uVlI3ZW65JVLhqshw0VLm6rSIAGyYOPfZV2IVrG6aBVizHfmLjYaDilDAAbi5AWU4aWAsFW5lwbceK0mZaKhFG42sUBDbXTT1q9gBAG7xVrACbaEDdcb1tM5tGvdCW6uFxbTgg1pa0OvYbgtiQA5oc7XqKqlpwPNuLam/V1romcpKjZ4PGBE55ddx3DqC2V1g4MzNR3YC97nG+UXW4jwuqlsXNbEPzzr6AvRF0j5mSLlN0jFuhfW3Hq4rcQ4PA2xle6U9Q6IWdFDFALRRMj7hr6Uckajgk+zRw4fVzWIhLGn3z+is6HBG755y782MWHpK2N0brLkztHDFdiQ0dNT6xwtDh746n0lXFxO8pbqXWTskl0G6l7JboZkKPmUBVd0boUe6N0l0bqkHuo6QNF3GyofPbRnpVJJJuTdAZDqn4I9Ksa4uaCeKwrrKabMHcqB7qXSXRuqQe6IN0l0bqAe6a6ruiCgLLo5gN5AVTnhrblYj3lzyTxQHm4OiJKUInevnHtsY6hONyTgnChbGG9HigFOJUACdU3BLxTHzEFkCbgkCfggGHFHgg3ijwQthbuU3KDcgVBY5SyGzHH80puCrlP2p/cUotjRC0Tf0QsLEz0YB2k+pZzBZgHYtfirrPgHYT7FuH1HOb+UyMMFqU9ris0LCw4/uIHrcVmNcF7kuD5M3yy1qsBVTSnGq3RxZYCoT0SluiNSB1kKk8nQF7qdj/tbWU7IrkjS56lRIYG0dMyWJ8snNdBjQSN28oVlRHeqp5XgAsAaO2xVRxctiayGLUNDczu5c0meuU0uDJjpmVNJQvc5oiibd4PHRVU+I04bOyZn2t0he0Btxb/AMC1bXvEXN53ZN+W+noUC0onF5fYwK1/PYlUSAWzyF1iqi7KNElXVMjqJTqeksPy0OcOHevHKNtn1oTW1WZu9pN9yDnXO8KkSjmzYg9yx5pi0AHR1rEcVlRbNOSRlSTMYLXCo8oaddD3LGbmF3ZWkkW6QzW9KGd7rZiX5RYa7h1LooIx6jMsTxHznAd6fnogNJB61iNcy9iAhLGHOBYMtzZNiHqMztSwPGrTudwSgg7iCrMNnbTRFjnzm7rgxPy+kHesySojkP3YjXXnadrvWLqVRpSbNcRZ17J2Ht9CyckTnDP5EWnjd8R+hWPpsNjNvKTE5w0tM17fZ862kYcqMMC79+lla5gNyRe43A6hCaCGmbmGIQvaTYWBv6rpwM0+bM0tte/DctfT2Yvd0djhFJ5DhUENgHZbvIO8nVZt1rsOxaHEAY25WSsHmg3BHYs666J2jm1TodG6S6hNhckAdqpG6HupdYr66CP8pmPU3VY8mJlvmx27XFWjk8sUbIuUutW6as5sTZ25d+XsWdFKJYmvGmYXSvKLHJudUWkoXSXUuodCy6l0iN9FQPewudypfKX6DQJHyF+g3JQqLHupdS3apayAl9CsgHQdyxSsjcqBrqXS3UuhLHDkbpLo3UIWA6IgqsFCSTKzTedAgFlkzusNwVfikBRuqDzsI8UAEbar5x7Bk6ROhbCEboNCayhReKY+ah1JnbkABu3I8FGhE/OgsYeajwQHmhE7lkWEHTxQ4qe98VBq4IWxid6qmP2p3crDxVM33Iju9qqI2ZA0atVi2s8I/NJ9a2m4LVYmM1W3sZ85XTF9RjJ9JmYeLUMfifWssLHo2ltHEOxXhe1HyJdljSnBSBMFo5ll010gRCEHBRB0ShFAY9RiENMS0gveDbK0cepZkmFYj5BLUVEwpSxhe2GMXd/Ocd3gtZPRc5i9EcwyTThpzbgVZNFjmHGSKGpkljBIs14kFu4rlJvo9mKEKs0vOOaSWuIJGpBNzdASPy5cz2tG6x0HgjJC8Os9rmG24i1lZHABCCRZy5Pg9a5MV123FzcaGxUYAXHsWdDAOdkmcN1gB4LGnbZwcO5Lt0KpWI46JADmAuRfdZMOkO9XMs3W2var0OwSQ5Nc1+9GG2mhuHAj0okh3aVY0Do3Frke26lloSMlpNtwVwmLtwStaZ39EWasyKFkQAsCeuyy2jok6KLPc3TMkFO4m2Wy2TRvQLLPC0pGXE1ZY2OQuyi/BWZzfKDqd6uqowxgeRoDqsSJ5cbuGt7p3yXrgy8OqX0mIQzNNi14B7RuIXZy4gxhIYwu79FxYjvWRBg0kcCB46rfu1cT2rcHR5898UzLfiMztxDAfghYzpnSG7iXHtN0uW7mDvKhFituTPNsXnkzcPAJe8gG2g0WNUPNRXOaNczg0dyzIPtFDmOhsXLBoG56rMfegnxWGdUkqSM3EJMkDWD37gPAf+BZVKbUkX6K1WISZquNnwB7Vs4NKWL9ELcF8plu5l10QUgKN1o3ZYCqpZPejxUe/K2/FUXQDgprpLo3WgPdHMQq7p2sLtToEFhLusBZFwqHuigF5HNYOtxVBxSjBtz4Pc0qdmXJeTNsp4LHiq4ZzaKZjz1A6+hXByFTTHuokujdAWArGlfmf2DRWPflYSscFVFHB0RukUugOAG9MBqg0JgNV889dktqm4KNGqYhQqYzRuUKIFrKEaIWxeIRfuQHnBF3BBYRuUJ9qgU4hBY/AIE6o9SB3qCycAoPOCnBQecgsJOhVUvmgdbgrDuVT9Sz9IKojZeStZWm9YexoWyO5ayqN6qTw9i3j7MZHwbKn0pox+aFaEkYtGwdQCcL1o+XLssCYWSApw0ngtWZpsN0botj11PoVjWNHBLOixNiAEnQXVgjJ3kBO0FxsBc9gVzKSV28Bg7Ss7josMV2YFfF+4HvZcviIlb/ADTf2K/yrnAHsAyuGYa9a2EdEwee4v7NwK08sBwuZ0MlxT3JhkO7L8EnrCnnk1JNL5TGxTLLJETobELALXF4Y0nVZVVPDJUNImYWtG8G/sUgDHvc4XAbpciy4T4Z6cVuKsgZkAZwWPU04aSOBWVK5ocCHXskeWzklz7Fc1d2d3TVGuYGsdlk06jwKyGQuf5ozDrCksTWtu14eOLShHFCQHtYO0b10u+TmuOB+aaPfNcR71nSPpGg9KURl7w55DQNzQdycB7zYONkzhlHWVmzVDtc1ujSBZWNdc71iXs5XMOiJF3GU0671Y5wNrqhp1VvVZbM2VTEHOwnolhWuaL2tqVnVDGvecxsLJ4I4/JnOYwufwtvUXHBX7l+HQudNG4tN42EjTiTZbZlNK73uXvKbD6Y0lIOdsJH6u7OoK91TEz39+7Vdox4PLOW5lLae9Rlc/zQdw7klRFzcwYCSHbioKwNne4NJv16f+blI53VFSzMGgMu7QLVGG0XV7xHShgO8geAVeGt+1PeffOt4BUYjL9say/mtv6VeT5NhvaGes/+qjRb5MIvM1a541BJd4BbyI/aIx+aPYtHSN6Ez/gtyjxW7ZpG0dg9i0ujmvrLLqZu1JdBzsrSUOgJH3dbgEt1WmCoHujmSXVkbbm53KiyyNoAzO046rX1eLkuLKY2HGT6FXiVbzrjTxnoA9Mj3x6u5a9VI82TJ4QziXOLnOLncSdShftTxQunmbEy2Z5sLqtaOH6h0WwosUdG4RVDi5m4PO9vf1ha++qCNWWMnF8HU37UbrWYVUmSAwvN3Rbu1v8Agtjdc3we2MtysSd2gbftVYKkpvIezRKCqUe6l0qiA4YJhvQATN3rwnsCBqmcNyDRqmOpWQd7yN4dR4nyiwU1fSQVcBppXGOaMPaSALGx0XHYsxseMVzGNDWtqZWtaNAAHkABd1yHfjQp/is3sC4fGfv5X/Gpv7Ryvg14MEb0Xb1G7yo7eFkgQgd6IUVINwCCI4IHeFARRu9Tgi1UtgKR/nx/pfMrOCrP3VniqQcrWVGtTL3/ADLaHVa1wzVTx1vt61vH2c8nRtBoB3K6KJ7z0WOI67LPZTxRnRgv1nVXt713s8ax+Wa1oA3BXMikf5rCe3csxkUbDdrACrR3qWdujGZROPnvDe7VXspYme9zH84qwb03iqBmgNFgAB2BG6W/aj4qAa6N9LcOISeKZaIaXHo8klPIxjRcFugA1WpdIGNLb63ue1dFjMfOYcXcY3B3huPtXLukERc86u3ALjJcnaDpFckltbqnnpCdAB3oEOeb636krmPadWkLSSI5MtzuItvKeMlhtwVIcQexWMcDx1RoqkZUbuFkSCdwVIKsa4kLnR0sW3SVg6KQm5TjUancqQtabq8LHbvAur72WkRsS7HyuY8b1lU8Igc3W7r6Hq7VjSta10TrDM4kk9izaUAuivuLlpRpmJTtUZTiSTmNz2lKGPe6zWk+Cy+i3zWgeCIeALucAvRtPJZhSRPbmdbzbX9KuoWmz39fRCj542mRrrkOFtB3qRP5mjJ45b+JRR4su5WYrj5RXdjn28B/6LJry5zY4WC7nuvbuVNAwmZzj71vrKzC0c6ZD51so7AsNG0VGMQ0pY3Ww1PWVsRoB3LXzasI7lsOKLoz/kwquU7gnuqnG7iUNgRQRC0QIBJsOKlbP5NSnKbPd0W9nWU8e8nqWsxKXPVlt9Ixbx4ouWc8kqRiAK2nZE+oayZ5Yx2mYcDwVSvFLJ5KaglgZwBOp8Fs8qFY99JVZmlrnRki+8HgjTSsgl5xzM7mjoDhm6ysvDKKOZjppWhwDsrWnd3rHrYo6euc1gBYLHLfd1hT9DVNJMoLiXFzjck3JQsraiaOZzeagZC1vBupPeqVTDMigkMVfEeDjkPj/jZb5c2w2mjI+G32hdGfOKzI9GJ8FDjdxPaoEo1ThjjuaVDuQI3R5s8S0d5RDG/wjfQhDhkwQ4JhuXhPYFqYhK1MbqFPReQ78aFP8Vm9gXD4z9/cQ+NS/Lcu45D/AMaNP8Vm9gXD4v8AfzEPjUvy3J4NPowm8e9B29MFttn9lsZ2qrJqbBqPyuWBgke3nGss0m1+kRxUMmqsguoxvk62q2dwuTEcUwzyekjIa5/PxusSbDQOJ3o4NybbWbQYTDiWGYV5RST3ySc/G29iQdC4HeCrTFM5hA7wtttBs1i2y1cyjxil8lnkj51rOca+7bkXu0niCtT74IGTgoNyzcLwjEcbrG0eF0U9ZUEXyRNvYdZ4AdpXeUXIVthUxZ5vc+jJ95LOXH+q0hKZUmzzY7gq/wAszsBXoWL8jG2WGQOlZRQ4gxo18klzO/ZIBPguBlikgrXRSxvikjBa5j2lrmm+4g7irVEaa7IN6wIRnrWdsv8A3LZwRPqKiOGMZpJHhjR1kmwHpK6ml5F9vWVcT34FZrXgk+VQ9f6S3A5zTfRrrjMUwsut+xVtn/I//wCRF/eWNW8nu1mHRGSfBKgsaLkxZZbeDSSuhz2y9jnhZMEti0kEEEGxB4FMEMjBMCluutouTPamvoYKuChjMM7BIwuna0lpFxodypUm+jlRZHRdXWcme1NBQzVc9DGIoGGR5bO1xsBc6DeuTvdVEaa7G0RBS3XRYVsLtHjOGxV9Bh3PU0t8j+dY29iQdCb7wUCTfRzlTHz1JNHxcwgLibh8znEAhu4dq9YxbYraHAaLy3EcOdDTtcGl4kY+xO69ibLyiqYYK6eIDUPcLeKjNK1wxjO53RabnsCT7bc7/ErYbN7OYztLi/ufhFKZ6ksMhaXNZ0Ra5uSBxC6mq5HNuKeGWeXCSIo2l7nCoi0AFyfO6lno6JNqzgXX3uF+1KQBq3RbPBsCrdosWgwzC4DUVlRcxx52tzWaXHU2A0BXVfYS28B0wI/9VD/eVJtb6OFY629ZDdy7M8i237dfcEn/AOqh/vLUYtsTtRs/E6XFMCrKeFu+XJnYO9zbgKMqTRpLWd1K1ttO1U5r6jcrqeOSeeOGIZpJXBjRe1yTYD0lZotjEgEGybOLhdl9hzbz+Qv/AMqH+8h9hzb7MD7hafGof7y2qI4y9jkHdOZvU0LMa8NDCN97rqW8j23Y1OB6/GYv7y1m0Wxu0GytPTy4zQeSsneWRnnWPuQL+9J4InyHB10YUji46uJ8VbG3ojRUiogbGwvljYXDcXC5PdvXYYNyc7W40yOanwryWmdY87WycyXDrDNXeJAXrc0kfOhjnKVJHHyNvK4ddgrJjdmQC5J3L0Wo5E9p4yZI5sOmPwWzOB9bbLkMb2bxjZ2oEWKUEtMXaNedWP7nDQpGUWqss8c4u2jW00XNRkHVzjcq02QZ5qJusSO0WVSagDrI9q2BOpWvd5zB1vCzydSsLoi+pkJFiqbqxx6JVV1UaGupdC6N1QXRgBo7VoXuzyOed7iSt6dIzb4J9i0DdyqOGV9DMY6R4Yxpc48AEC3K4gizhoQeCyqCpjpp3OkBs5trgXsq5XurK0losZXWAPBaONcfqGmrZqYObGWlrtbOF7HrVLnF7nPcS5zjck8Vto8MpmgZg6Q9ZNlXXUsMdIXxxhjmkajipaNuEq5FwqlhmZJJK0PsctjuAtvWA8NEjgw3aHG3ddKCRcNJ10IB3o6g2sR3oZbtUNELzxjre32roSdXFaSgYZK6PTRl3nwW4cbMPcozti6E511t9u4IZid5JSJlDsG6N0t0UBxoGiIGig3IjcvCeoZm5E+cowaKDzlCnonIf+NKn+Kzexq4jGfv7iHxqb5bl3HId+NGn+KzewLh8Z+/uIfGpvluV8Gv8TCG5eqfU+y5dusQj+HQE+iRn0rywbl6PyFTCLlKyk25yjlb6C0/Mi7EXyj0/l0kycmkovbPVQt/rX+ZX8icvOcltC2/3OWZn/3CfnWt5fZgNgKWMEHPXx8epjyr+QiZruTctLh0KyYb+4/Ot+Tr/medcvUvOcocTb/c6GMelzz864jZjZ2r2q2kpMIo9HznpPIuI2DVzj3D12C6zltk5zlPqwDfJTQt/qk/Ouu+p6wlnNYxjD23kzMpY3dQtmd6y30LNWzm1cqPVNmdl8M2SwdmH4ZAI2AAvkOr5XfCceJ9nBYmN8oOy2z1UaXE8ZghqG+dE28j294aDbxWLym7STbLbCVldSuyVchbTwO+C9xtm8Bc+C+VHPc9znvc5znElznG5JO8k8StN0dJT28I+wcC2qwTaaJ8mD4lBWBnntYbOb3tOo9C5TlR5OaXavCJcQo4GsxqmjLo5GixnaNebd19h4HsXz3s5tDV7L7Q0uL0ThzsB1YXWbI072HsP+K9Ib9URiznub7hUOlv9If9CXa5JvTXJ5dg/wB/MP0t+6ot/wCm1fZ43L44p6ptbtbDWNhbA2evZKI2G7WZpQbA9QuvsfgUiMfk5fEOUjZXC8RnoKzFOaqad2SRnMSHKeq4bbitvg+P4VtBTOqMKroauNps4sOrT2g6jxXzjygfjDxw/wC9H2BdJyKtqjtrM+HN5O2lcJyN2pGW/be9vFbo5xytz2nY8q+xVLXYNPj1HC2OupRnmyC3PR8b9o336rheIBfVO0BjGzWJGUjmxSy5r7rZCvlIysijYXutcenRVHPUJJ2bbAcLdje0FDhrL/umZrD2Nv0j6AV9R/aaSl97HDEzwa0D6AvFORbChVbSVmJPbdtDEGNPU9//AOoPpXpu3+Ie5uwmKTNID3wmFve85fnKjOmH5YORv/tVTT+9kikb3hzSPoXy9tFhhwHaGvw6Q2FPMWtJ0u06tPoIX0DsBircY2FwyoDsz2Rcw/8ASYcp9i8x5ctnmRYvT44G9GpgML7fwjNQT/NNvBVd0TPzDcjzWoqRTvjG+5uRa5svo7ku/Fxhn/M/tHL5vLg2SjLyBYG5PcvpHkv/ABc4Z/zP7Rysujjpnc2dJiFBT4nh89FVMEkE7Cx7esFfIW22zVXsvtjUUNZd+V2ZkpGkrD5rvEb+0FfWFTjUdJtRR4RKLeWwSSRO63MIu30Ov4Fcfyx7FHafZU1tHHnxLDQZYwBrIze5nfbUdo7Vk9WSG7ldo8t5CZAeUwNFv8zl9rV9EY9+D2I/FpfkFfOfIPHblPDwbg0U3tavo3Hddn8Q+LS/IKhcf0ny1yJD/KxgZ/Nl/sXr6zJAFzuC+UeRZtuVfA/0Zf7F6+rJPuTv0ShMXRyjeVTYdzw0bTYfcm2slvmXR0OIUOLUgqKGrgrKd2meF4e09lwviB7hnOt9Suq5OdrqnZHbCjqYpnNo55Ww1UV+jIxxte3WL3B7O1WjKzc8nq3K3ySUcuHVG0Wz1MKeqgBkqaWIWZMwb3NbwcN9hvF+O/w7B3/v9h1v41D/AGjV9tOaHNIIBB3g8V8eY/hDMA5WZ8Mjblip8UYIh1MMjXN9RA8ERMqppo+wxuXIYnyq7HYPilTh1di/M1VM/m5WeTyOyu6rhtjv4Lr/AHpXzNt7sDtZiXKDjdbR4BW1FNNUl8UjA3K4WGo1UO0210ew/Zk2E/lz/wDGl/urzflk232e2rwrC4cFxAVT4J3ySDmnsytLLX6QHFcQOTXbW34NV/7LfpWgxzBsVwGsZSYvQzUEz2CRscoALm3IB0O64PoUSs4yyOuUeychew1FWxP2ur4GzStkMNE14uG5fOkt13Nh1WK9d2h2mwjZXDvLsYrY6SAuytzXLnu6mtGpK47kKxGCs5L6WmjcOdoppYpW8QS8vB8Q4Kzlb5PqzbrC6J2HVMcdZQOe5kcpIZIHAXF+B6Ise9aOkeIXEvwrlm2MxavZSR4jJTySODWGogdG1xO4ZjoPGy6/FMKo8aw2WhroGz08rbOY72jqI4FfJ2JcnW1uCFxrcBrBG3fJCznWell11lBys7XQ0MEDK6ECFgis+naXDKLa31votRjfRxefb9xGq2iwR+zu0VbhT3F/k8lmuPvmnVp9BC1h3FZ2NYzXY/ij8Sr3tlqZGta8taGggCw0HGy1MtVleWtYDbiSusnxyeTi+Oiz8pGPzws0rWU0rpahgdawcNAFs1F0ZT+ZiPPQKqVr/MKqVKFFBG6oLxqAOsWWhLS27TvBst4w3YFq66PmqtxHmv6Q+dVHHL0SCgmnjEgLWNO4niro6N1LX02Z4eHE7hbcFnUv+Zwj8wJJ9a6kH6Z9SlsKCSTMkLFxEXoi34T2j1q90kbPOkY3vcFh1tVA+JjWStcecaTl10BUOkmqM5kbIm5WNDQNBYLW4t93i6yw39KvdilO0nKJH9zbe1Ysj/dOrYGMcxrW2cSdwuqrOc2mqRkYXCWwumO+Q2HcP8VlTHogJ2gNaGtFmgWA6lS92ZxKHSKpUBFBFCkCN1LqXQHHjcmO5DgiV4j1WM3ci3eoBoiAoWz0TkP/ABn0/wAWm9gXD4x9/MQ+NS/Lcu45D/xn0/xWb2BcPjH39r/jUvy3K+Db+lGEFBcEWNkUANVDFjEk7yT3lRpcDoSO4oFQb0JYTc3JK+hfqfpGHYnEIx57a9xPcY2W9hXz0SA0kmwXqf1P+1UNLtLXYDM4NbiDBLAT76Rl7gd7Tf8AmrUUbhJKR3HL7G53J9TyDzY66Mu7i149pC+fcK5uXGKGN2V7XVMTS06ggvGi+uNrdnabazZatwWqcWR1Udg8C5Y4G7XDuIBXydj3J9tRsviDoKzCapwY7oVFNG6SN/UWuaNO42IWttlzWnaPrD6ztmf9XcL/AOjZ9Cn1mbMAE/W7hX/SR/Qvm/YbYbbbafHKbn34vRYY2Rrp6iolljGQG5DQTdxO7Tr1X1RJIyCF0kjgxjAXOc42AA3kqtHWEt3NHyntdTwUXK5W09NDHBDHiUbWRxtDWtGZmgA3L6uG5fIOK4o3GuUCbE2eZV4m2Rn6Jlbl9Vl9fcCoiY3bZztfsBsrildLV12CUlRUSuzvke0kuPWdVtsMwjD8GpRTYdRQUcI95CwNB77b14TtdtztPhPKLiMNJi1QKSlqTkpyRzZAynKdNx19K90wTFqfHcEpcTpj9qqYw8C+rTxB7QbjwWhCcZNpLk865V9u6GLDJtm6GZs1VVNLalzHXEUfFpI98d1uAuvD4m5xSh2oDXHX1LveVzZIYTtb5fFGW0OItMgy6Bst+m3xvm8T1LmcDwk4ztBQYfGOlUStiuPetJ6R9AK2uEeLLulOme88leCe4+w8Ej22nr3Grfca2do0fsgLR8tU9ZPheF4XSU88wlqDUSmKNzgGsFgDYcS71L0yGJkEDIo2hrGNDWgcABYLXTbT4FTzPhmxmgiljcWvY6paC0jeCL6FYvmz3OC2bLo4LkUlrKbD8UwuqgmiayYVMPORubo8WcNR1i/iul5TcE93dgq+BrSZoG+UR233bqbd7bhbePajAZZWRRY3h8kjyGta2pYS4ncALrava17C1wBaRYg8QjfNiMFs2XZ8kOhjla0OaHBtiLr6K5LvxcYZ/wAz+0cvDNpcJdgW09fhpBDYJSGX4sOrfUQvc+S38W+Gf83+0ctS6PNp1U2jneWGrnwyt2exClfknp5ZXMPaMh9H0rvdnsap9ocCpsSpj0Jm3c3ixw85p7ivO+XH/N8F/Tl9jVz/ACVbWe42N+5lVJair3ANJOkcu4HuO4+ClcHTftytPybjCtlBsl9UBG6mjyYfitJUTQ23Md0S9ngdR2HsXp+O6bPYh8Wl+QVbVYdBV1lHVSN+3Ub3PjdxGZpaR3EH1BVY6CdnsQA3mml+QVk9CVHy9yKyZuVjAx+bL/YvX1dL9xf+ifYvlDkWhli5WcCL43NGWXUjT7i9fV8usTv0Sq1RywO4nwmfPdv3lPA18tTExmrnPa1oHWSLLM9w8WfIWtwqvcSTYClk+hel8lvJJjNbtJR4vjlDLQYbRyCYMnblfO4atAadQ29iSeqy3Z5IxbdH0o0EMAO+y+VuUt7JOXuqLLWFbStNusCO6+oq6up8Nw+etq5GxU9PG6WR7tzWgXJXxzPir8e5QvdeUWdW4kybKfegyiw8BYLMT1Zn0j7NG5cxX8o2yGF4hNQ12P0VPVQOySRPcQ5h6joun96V8g8prXfZQ2hIDv8APHbh+a1RKzeWbgrR9H/ZV2F/1lw/9s/QvC+WvH8K2k21pKvB66Gtp2UTY3SRG4Dg95t32I9K87yvPB3oKbKRvBHetVR5Z5XNU0b/AGP2zxbYnFTW4XIC2QBs0EmscwHAjrHAjUL3PAuXzZivjY3FIqnCpz52Zhlj8HN19IQ2H5Nth8f2GwfE5sEilmqKZhlfzsgzPGjjo74QK4Llc5NX7OV8eI7O4RIcKfEGvbAHScxICbl282Itru0U7Z0Snjja6PesI2qwHH9MKxajrHEXyRSgvA7W7/UsTabYbBdqaZ4q6VkdTboVUTQ2Rp7T74dhXyPg2H4rXYpHHhtJVTVxcDG6nY7nGu4EEeb3r7OweOsiwSijxCQSVrIGNnePfSBozH03T6ejpCfqqpI+WMbppNndoKvB8RaYp6Z+UuGrHtOrXDjYggrVkCeclpzNc7e03XacvEkP2SI2xWziiiEh7bvt6rLzqB5ifmjcWuHHrVbb7PHKKjJpG5hiZHNGWEm5vc9yzlraOqbNUMDgGPue4m3tWxXRdHHyyO1aVVZXb1VuVBLIWRCKoGj4hLVU4qIct7OGrT8ygNjdWggi6EatUac1NS0c2ZXsy9Gw0sqnOc83e5zj1k3W3qKWOo1N2v8AhD51gvw+dvm5XjsK0mjzyjJGLYb7BRZAoak/k7d5CuiwxxN5ZAB8Fv0q2RRbMSKJ80gZGLn1Bbmmp2U0WVpuTq53WUYo2QsyRtDR7Uznhoust2dowrkkjrCw3lVBAkuNyoodBlAgigCromDJcqloubLIbayA4kcE1lLbkepeM9QRuRG5EbkQFkHoXIef8p9P8Vm9gXEYx9/MQ+NS/Lcu35EPxn03xWb2BcTjH38r/jUvy3K+Db+lGCVAdUSNEAoYISoFClkfzcTndQVSslmLUvdLKIWAnXcOJWfhsL8NrIa2Od8VTA8SRvjNixwNwQqMPhsw1DtXOuB86yHEkqt+EIryz6M2I5YsIxumjpMZmjw3EgA0ukOWGY9bXbmnsPhdekxyxzRiSN7XsdqHNNwfEL4o1WRTVlVTDLBVTwjqjlcz2FVM7rNXZ9kV+JUOFUxqa+rgpIWi5kmkDAPErwPlX5ZoMZoJtn9mnudSS9CqrLFvON4sZxseLuI0C8qxLnqxvOSyyTPbxkeXn1rVjt8V0SOWTO2qRtMGkzYrQMJ3VUNv6Rq+2c7bHpD0r4Vj4hbfCMwMxzHgN/eq0Yx5tiqjtdvz/lDxz40fkhdvyK7UcxUz7O1MlmTXnprnc737fEa+BXkcryyNztCR1pxI1sgZmAcdwSjEcm2e4+odtdn4tqNl6nD7sE9ucgcT5sg3end3FeX8jWCul2prMQqIyz3PjMYDtCJHGxHeAHeleYv5x7LNlLDffdVQyPigfI5735nWbc7+ARLg3LOnNSo+t8VxGLC8Jqq+VzclNE6U677C9l8rzTyVVRLUSnNJK8yPJ4km59qwzUS+TylwLZIza17hNG6USSslcLhocCBuuqlRjLn9SuDIZI6KRskZyvYQ5p6iNQV9S4Di0eM4BQ4ixzbVMLZCL7jbUem6+TqZw597WyOkaWg3cOKtlLjLTgE+fwPYjVjFm2W6PVeW3C2U2IUWNNsGTMMEpHwm6t9IJHgu35KpmScmeFuBsDzu/f8AdXL5yqy7JHdwtnHnajxTNymKZ0kocH6OyaAJXBpZqyOSR7Hy6OPkeDmOxcHTW17GrxmmkfDQmR1i0C7AN/8A5dGF73c60SulYBZpd12SRZp8OMQaWuaMovxK0lSOGSe+W4+i+TLbBu02zTIqqojkxOiAjqLO1cPev8Rv7QV1OLOb7jVuo+4ScfzSvk+mMgJc6JkDGt1O436+5Y9XjkMILYpBI/rvcD6Vhx5PTDUvbTR3fJfJHHyiYO1zg3PzgaOs804r6Jzt+EPSvh6qqpJ5Oclc4v4XNrBYzJXNlDszt+uqNWMeX01VH3SXsAuXj9paXGdtNnNnoXS4njFJT295zgc89zRcn0L45kDr+cbd6py66AXKzR2ef2R6Zyn8rk22MZwnCo5KXBw67y/SSpIOlxwbxtx49S89wc/v/h3xqH+0asZzUh32C0jzSk27Z90h7fhD0oExE3OT1L4ZaXfCPpKtbmPvnelTaej+p/Q+4PtX5nqXjn1RLWOwPBLZdKp+79WvBOdaz8pr3lVTVAfHla4kk69yJGJ51KNUeo8lXKxT7IOdguLl7sJleXsmaMxp3nfpvLTv03HvX0PheNYbjdK2owyup6yFwuHQyB3s3L4kiiv0ju4BZUT3wSZ4nvjf8Jji0+kI0THmcVTPt+wF9LLktrOUrZ7ZOlkM9ZHVVgByUkDw6Rx7baNHafWvlZ+J18rMkldVSN4h87yPQSqANOq6lHR6j2Rssfxqp2jxyrxWveDPVPzuDdzRuDR2AAALXX06N3epBuUmw39qPS3jeDbsVPM3Y4dcBZ8WLTtDWuDJLcXXufFa+xGuawPABSwv5zu7d7FSUb2mxCKZwY4GJ53Am4PcVkOFnHgubGlxmd33usyLE6ltg57JQOD22PpC0pGWjbqKmnqWVLCWgtc3zmnh/grrronZkl+9FrsvclUQhcHBw0R9KoR5xw4oLLkNyp5x3YgSTvJKAtdKBoNSkLiTclJZEIBropUUAbqZkE7G5j2IB4xYX4lWA6JUwCgONG9MplI3o8V5D0WMNyYIcEeChqz0DkQ/GhTfFZvYFxOMffuv+My/Lcu35EPxn0/xWb2BcRi/38r/AI1L8tyvg2/oRhHcrYqWolZmjp5pG7rtjcR6QFWdy9d5N3EbGRWJH2+Xj2hahHc6PBqtQ8EN6VnlBoKz+J1H9E76FiV1LVsiANLO0byTE4D2L6JlqWQAGadsQO4vkDb+kqRVMVRcRVDJbbwyQOt6CuyxJeT5r+KSa+g+eW5200bWva0Bo9KVr5L9Itd3L2raPY3DdoKZ5MTKesAuydjba/nAecF4vPh09BWT084LJIXOY9p4ELnKG3s+jptVHUL5e0ZDqSsLQW0dQ6/+yd9CQUmJX0oZvGJ30L36hc73OpekfuLOP5oTSVsET8ktVHG7flfKGn0ErosSPnv4nK2lE8Iio611hJRVAv8A7J1vYtbiGH1FHM576eVkTvfOjIHdchfQ/uhTfx2D+mb9K5DlOq4JdiJWMqYpHGoiOVsgcd54ArWxI1j10sk1Fx7PHIt/qW+wKiqavnW01PLO7MARGwutp2LK2C2VG0mKSPqcwoaaxlymxeTuYDw7exe00tLTYfStgpoY6eCMaNYA1o/860UbN6jWLC9sVbPIpdlsbcHyOwqq0IDejw46LBqIZIawMmgMLxIAQ9pDj4HgvZ48ToJZeajraZ8l7ZWytJ9qmI4XR4rT8zWQNlb70kdJh6weBV2Hljr5J/PE8aqJAyEi9i7o36le2iqqikZLTUVRJG1wLbROs4Dq01WXjGGPwjFJaOQ5ww3Y63nNO4r0rZkn618O1P3Ee0rMV4PXqNR6cFOPNnk89LUxxvM9PJC+ZwcGvaWnKCOtR8Re+e+ge0NBXY8oJ/fGiv8AwLvlLkkfDo74J+pBTfkakoKycmVsMkwsGXjjJAtwT1WH1DWtdPBNC0GwLmFtz4rvNgifcKbX/SD8lqO3ZPuHBr/pA+SVa4s8q1b9b0a4s4Onw+SaBzIaeWZgOuVpdr4J5KGemh6dLLFHuu6MgetdnsCf3BW6/lW/JWZtsf8A3Zfr+WZ7Soo8WalrHHP6SR5yABoAAOxO1j5HZWMc93U0ElUudlY5wFyBey3uxFXENo2F7xF9qfq51hu61UrPTlybItnL7QUtaaSFjKWoIc8lwbE43sNOCxItmKuOhkqJ6aczBmZkTY3aHt039i968tg/jUX9KPpVjZA9ocyQOadxa64V2nzf+oyXcT5wOHVpJJoqk/8AJf8AQk9zq7+JVX9C76F9IS1UcFueqWRX3Z5A2/pKRuJUmdv7vg3j8u36U2lXxGT6gfOsTs0WVws5uhuraejqqx7hT08s5b5wjYXW77Jao2xes1uDM879/SK9b5MsN8j2bfWOFn1shcP0G6D13K5qNs+ln1Ho4t/k8rkwbFLfe2s/oHfQsGWCWCV8czHxSN85r2kEd4K+lMxv5x9K8j5WcLNPjdNiLB0KyPI8/ns//Uj0Le2jx4Nc809klRwYlI96CnY2oqXFkUb5CBctjaXadwVK7vkkJG1lTYkfuR279NqJHsy5Hjg5exxnudXfxKq/oXfQnZhlYTd1HUho64XD5l9I53fCd6VM5PvyfFa2ny18Sf8AtPnAMLXWcMpHA6Im3XYda9/xLBsOxeExV9HFODxc2zh3OGoXkm2+xsuzj21NM502HSOyhx86N3BrvmKw4nswa6GV7Xwzl+fGazW6dZTgtlB6VjwWO0C28deq9Q2H2DgdSxYri8IkfKA6GncOi1vBzhxJ6kUb6PRmzxwx3SOFosIxPErOpKCoqRa2aOMlvp3LJqNmNoKdhfLhFY1o3kR3t6F7r0Yo7dFkbB2AAfMlinimvzMsclt+R4db0LWxHzH8SnfEeD50eJY3FrmkEb7ixHegC7gbr3baDZbDtoadwnjEVSB0Khg6bT2/CHYV41ieG1GEYlNQ1TA2WI2NtxHAjsKzJUe/TaqOfjpmE1xvxWXSYfW4g4to6SepcN/NsLrehdFsPsrHj9XJU1gJoqYgFoNucdvy36rb161FFT0VKI4mR08EY81oDWtCKN8nLU65YpbIq2eLN2Z2jprSjCaxtuIZf1J4qgmQw1EbqeoG+N4Lb9116/Bi2G1M3NQV9LLJuyMlaT6LqrGMDocdpDBWwhxt0JAOmw9YPzLW2ujzR+IyuskaPLCgjPBPh2KVOGVZDpqc6PHv28D6LIXVPqJqStEQUupdAAooIXQDAopbooAo3QuiBmNggC0XNgrgLCyVrQ0WCZChUztGhKR78osN5VaUSznM4A1SHfcBYzXlzyTuCtjdfU8V5qO24vBuLpuCo5xrZA0akrItposNG07O/wCRD8aNP8Vm9gXEYv8Afyv+NS/Lcu45ER/lPp/is3sC4jFh+/lf8al+W5XwdH9CMEr13k3/AANj/Xy+0LyQhet8nH4HR/r5faF0xfUfI+JfZ/c1fKzYYRhxIB+3v3/oLy7CquegxaGqppHQysdmDmG2vUvd9o9maPaamhgrJJ42wvL2mJwBJItrcFarDeTTAMNrI6nLUVT4zmaJ5AWg9dgBfxXVxbZ49Pq8ePCoS7Oqge6Snje4ZXPY1xHUSLryHlCbHFtjVhosXxMee8t19i9dqamGjpZKmplbFDGMz3uOgC8L2gxF2O4xWYgGhrZicjSdQ0CzQe2wUy9UPhsX6jn4PcaH73Uv6lnyQvKuUVjX7ZS3YCeYi1t2FerUP3tpf1LPkhXHLxt4rUo7lR5MGf0MjnVngEcLfgf1Vh4mRma0Ntx3L6L6P5vqXmfK+Afci1vyu7+Ys7KPqYtf601DbV/qZ/JG6P63a1gtzgqru7iwW9hXQ7YUFbiOz74aEFzw8OdGDYyNHD2G3YvItlNpKnZnEnVMTRLDIMs0JNg8dh4EcCvW8J20wLF2N5qtZBM78jOcjvXofAradqjx6jHkx5vVirR5hLBLSvyTwvhePevaWn1rrMP29qKSghp5aQVD425TI6Qgu6r6dS797IqmKz2MmjPwgHArQ4psZhdexzoIxRzcHRebftbu9Cm1ro09Xiy1HNE4jHcbOO1sVQadsDmMyEB2a+t/nXoezP4L4d+pHtK8wr6CfDK+SkqW5ZGHhuI4EdhXp+zP4LYd+pHtKR7N61RWGKh0cxyg/fGi/Uu+UuSXVcosoZiVDcE3hdu/SXHtqBe2X1qSTs9Okmliij0jYL7xTfGD8lqm3v3jg+MD5LkuwD8+ATG1v3Q75LUvKEHuwCAM0PlA+S5arg+c3/8Aqte4nJ+b4fW/rm/JWbtvpsy79cz2la7k5a9uHV2c3Jmbxv71Z+3TBJsu9pNvt0ftKq6JNv8Aqr/U84ztG9zfSseZsJ1Y5t/g8FYKVnW5VSGFjSWgmwuSTooqPrzbfZVLWmnbkDWved1xuXq2wjnP2LonPdmcTJc/zyvF5JCbyO3ncvZOT0l2wtAT1yf2jlmLtnk1624Uv1/+nN8rwGXCbgE/bRqP0F5lkA1AA8F6byu6+5H/ADf+xebEAN1Ul2ejRfYj/PI0MEtVVwwwjNLK4RsA4kmwX0TQUbMPw6no4h0II2xjwFl47ybYX7obXxTubeKiYZz+lub6zfwXslVUsoqOaqkNmQMdI7uAutxR4PiGRyksaOawDHfLtu9oqDPdkRjMY/QGR3rKs5QsK91NjqktbeWltUM/m+cP2SV5tsVirqbbqmq5X28rkdHKSf4T/Gy9uexsjHMkbdrgWuB4g6EKp2jlnj6GWMl+h80ALu+ScW2pqfijvltXM4zhhwjGqugcDeCUtF+LeB9Fl1PJX+FFT8Ud8pq5rs+pqHeBtex6RtH+C2KfFZPkleCskka4Oa9zSOIcQV71tH+C+KfFZPkleBl1horPs83w36JHf7AbYVZxeLBq+d9RFOCIXyG7mOAuG34g+1eiYrh0WL4TU0EwuyojLO48D4GxXhOzLnDa7Ci3zvKo/lBfQXvvFaj0ebXRUMilHg8B2awj3R2uo8Nnb0eeIlHYy5cPVbxXv2luAHqC8n2Sawcrtba2USVOX0leo1t/c+pLfO5p9u/KUiTWyc5xT9v+Txjaramp2gxWYNlc2hieWwxA2aQNMx6yd609LVzUVQyellfBKw3a+M2IWKxtmjuVi5vuz7kIRhHalwe5bJ42cf2fiq5ABO0mOYDQZhx8QQfFcvyp4a009FiTGjO1xgeesEXb6wfSruSouODYgD5oqG2/Y1+ZZ/KTb6z3X3+UR29JXR8xPiQXpavbHqxeTNzDskWttnbUPz9+lvUrtv8AC8RxXAY48Pa6Xm5c8sLTrI22mnGx1svPNltp59mq1zgznqWawliva9txB4EL1LDdrcExVjeZr445D+SmPNuHp3+CkWmqNajHkxZvVirXZ4pLBLSy5ZonwSNO57Swg+K7el5UKmloYYpsPbUSRsDXSumILyOJ0XpMsEFXFaaKOeM/DaHg+lctjvJ5hWJwvfRNGH1NuiWfcye1v0Jta6NvV4s1LNE86x7aV+OY03EWwNpXiMR2Ds17X11HasqGYTwNlFtRqBwK57EKCpwzEJqKrj5ueF2Vw+cdYKz8FmvmgPEZh4IfUikopR6NpdRQix1QKpSXQuoiAgIjdQMJ7FYGAdpQCtaTruCsAyjRSyKgDdRzsouoqnOzO7Agsl76nVS6CNlQccDZnaUcxJDbpAelc7gnYDcuPV6FyN2MHDMT1GwWdE7NGOzRa6P2lZtOdCPFYkjUWejciX4zqf4tN7AuIxf7+1/xmX5bl2/Il+M+n+LTewLh8X+/lf8AGZfluWTu/oRhleucnP4HR/r5faF5JZet8nP4HR/r5faF0x/UfJ+I/Z/cm3e09ZsxQ0c1HFBI6eVzHc6CQAG30sQrdidqjtRhUj52xx1kD8srI7gWPmuF/Ed4Wh5XtcJwz4w/5C4fY7Hjs9tJBUucRTSfapx+YePgbFdb5PDj08cmntLk9K5R8LmrMDZWQveRSOzSRgnK5p99brB9RK8olb0XdHgV9CvbHPC5jw2SORtiN4cCPoXh+0uFPwLGamiNzG3pROPvmHcfm8FzyR5s9Xw3PcXifg9roPvbS/qWfJC8p5Rzl2ylOv3CL2FerUJHudS/qWfJCxK7Z7B8TqTUVuHU9RMQGl7wb2G7iuso7lR87T51gyuUl7ngc0rrWBdr2qg3OmviveTsXs0TrgtJ+yfpXM7f7NYLheyUlTQ4bT004mjaHxg3sSbjes7aR9KGuhkkopPk1uyuwGH4/s5BiEldUxyPc5rmMa0gEOtx7LLX7YbHt2WNJUU0s1RTyEte+Ro6DhuGnWPYsrk72sgwZ78MxCQRUtQ7PHKd0b9xB7DprwK9XkjhqqcskZHNDINQ4BzXD2FaSTR5sufLgy/NyjxihxKqonNkpaqWA7+g8gejcvW8Cq6iuwOlqapmSaRl3aWvrobdo1SRbN4LBIJI8LpWuBuLM3eG5Z808VLA6aaRkUTBcucbAJGNHDU6iOelGPJxHKHGxtXQygDO5j2nuBFvaV0eysjZNlqHKb5WFp7wSuA2nxoY1i5liBFPE3m4r6EjifE/MtlsftHHhjnUVY7LTSuzNfwjd29hUT5PTkwTemjHyjP5QsPfKKSu5svjjBjeR725uCVxIa1uoaAvaftc8PvJI3jsc1w+dYUeBYTDMJo8OpmyA3ByblWrOODWLFDbJdGBsbRy0ez7TM0sdM8yhp3gEAD2XWHt/I0YRTRk9J01wO5p+ldLVVUFFTunqZWxRN3ucbf+q8x2jxs43iXOMBbTxDLE077cSe0o+FQ00ZZc3qvo6bk++99b+ub8lZu2/wCDL/1zPaVg8np/e+u/XN+Suoq6SmroDBVQsmiJByu3XG5F0c801DU7n4Z45IHPZlbpfeexYWIltPSiMaGQ9I8bBex/W1gv8m0/oP0rWbRbM4G3Z/EKgYZTiaGmkcx9jdpDSQRr1qbXR7Y67G5Lhnickmd3ZwXtvJ4LbCYf/wAz5bl4gNSvcOT4AbDUA/WfLckezXxD7S/P/wBOb5XP/hP/ADf+1eav3WXpXK5/8J/5v/YvOIYX1E8cMYvJI4MaO0mwUl2ddG6wL+eT1nktwvyTZuWue2z62W4/QboPXcrtJYGVML4ZYmyxvFnMc3MCOohUYdRR4bhlNQx2DKeNsY8BqfTdeacp2MzHHoKGnnkjbTRZn5Hlt3O11t2Aelb6R8lRepzOmejN2ewljg5uEUbXA3BFO0EH0LPNwdb37V86+X1v8dqf6Z30r1PkwxZ9bgdTRzyuklpZbgvcSSx2u89oKidnXUaSWOG9ys0XKphnMYtS4kxvRqWc08j4bd3qPqVPJX+FFR8Ud8pq7fbvDPdTZCra1uaWnAqGd7d/quuG5Kj/AO9NT8Ud8pqlcneGTfpWvY9J2k02VxX4rL8kr5+LhbeF9IyRxzRPila18bwWua4XDgeBCwWbP4LG4OZhNC1w3EQM+haas82m1SwRaauzy7k42dqK/aCHFJInNo6Ml4e4WD320A67bz3L1yrq4qCimq5nBscDDI4nqAujLLDR05klfHBCwec4hrWj2Ly7bnbaPFYzhuHOJpAbyS2tzpG4D832p9KLU9ZluqRotmcV8i2ypcRnOVsk550ngH3B9vqXudhqCARuI6183Oc52ll6rsPtvDVUcWF4rMIquMBkUrzZso4Ang72rMX7np12BySnHwcLtXgNRs9jMsL43eTPcXQS26LmnhfrG4haiFklRK2KJjpHvNmsYLlx6gF9EzQRVERjniZLG7e17Q4HwKppcNoKFxdS0VPTuO8xRNafSArtMQ+ItRqS5NVsbgb8A2cip5wBUyuMso6nHh4AALn+VPEGsoaLDmu6cjzM4dTQLD1k+hdXjm0FBs/SGaslAeR0IWnpyHqA+fcvFsYxaoxzFZq6pNnyHRo3MaNzR3JJ0qM6THLLl9WR2WAcn9BjOAUmIPr6lj52Xc1rW2BuQR6lpNsdlRs3UU/Mvlnppm/dJANHg+bp2WPpW55Pdq6ehjOEV8giic8uglcbNaTvaTwvvBXpE8ENXTmKeKOaF41a9oc0qJJo3k1GXBl+flHgtDjGIYVIJKKtmpyODXdHxG4r3HBqqorcEoqqrj5qomha+RlrWJHVw6/FUQbMYFTTiaHCaRkgNw7m72Pis6srKegpX1NXOyCFguXvNh/j3LSVHn1OeOetkeTy7lWhjZtDRytAD5abp9tnED1LjKSfyeqjl4Ndr3cVtNrMdO0O0EtY1rmwtAjha7eGDr7SbnxWlWWfXwRcMajI68kX60NDwWJh0/P0LLm7mdB3hu9SyUOodFEFFQMCiEiKAbxKI8Ut1FAF7rNtxKquo83d2BBUDAohKpdBZyDQAbncE4+5E8SUnCyZ/mtC5so0TdFfTm0luvRUjQdZTsOV4PassqZ6byJj/KdT/FpvYFxGLD9/MQ+My/Lcu35E/wAZ0Hxab2BcTi337xD4zL8ty5nqf20YRCzqbaPFsKouYosQnp4QS4MYQBc+CwSsWoeC4MB3Kx7PNJKSpoyMSx3FcXijjxGvmqmRkuYJCDlO6+5a8NubdaNidw7FlwQZRdw6S6t0YjFLhI2lNtRtBS0scMeMVTY42hrGhws0DcNyorMVr8YLX4hVyVTowWtMliQDwWJJoQlpzq/XQlYbbRqMIxdpG6G1m0MTGsZi9U1rQAAHDQDdwSnbHaS9vdmr/aH0LWFVkXRNkeKH+1GzdtltKDpjdX+0PoWLiO0OOYlR+T1+I1FRA4h2R5Frjcdyphpw92ZxAaPWsqSBj2Ft269qu/wRYoLlI0+8ALYYfj+L4SMtBiNRTs+A192+g6Kh1DNmsxhKcYZMRdzmt9a1uQcN3DRuBygbTWAOJuI/Vs9tlH41V4tZ1ZVyzPHB7iQO4blpH0UrN1nDsVbHugmAJyuHBW7MLHGLtJHQXRVMUocwE6d+l1bdDZm0eK1+H6UlXLCPgtdp6Nyzztbjjm28vcO0MaD6bLSX7UUs5vHCTtpGRVVtTXSc5VVEk7ut7ibfQqQUtwDYkC6h6IudB2obSrhGbR4tX4ex7KSrlga83cGHeVlfXNjX8p1HpH0LUhRUw8cG7aNuNpsavridR6R9C5ur2vx+rjmhkxWpdDKHNdGSLFp4bupZkj8kT3X81pPqXNAXIAIQLHBeEFgtr1blt6PaXG8Oo2U1JidRBAy+VjCLC5ueHWtWbXDQdyhOm8KHSUVLhoysTxrEsXEfuhWy1XNXyc4Qct7Xt6AsamnmpKmOop5HRTRODmPbvaRxCqcbEXNgiHN+EPShFFJUjeHbPaThjVX+0PoWpq6uor6qSqq5nzzyG75Hm5cVUSDucD3FQBCRhGPKVAsszDsVr8IlfLh9XLSve3K50ZtcXvZYh0Gpshmb8IelDTSapm6ftltG5pa7GaotIsQXDUeha7D8TrsJndPQVUlNK5uQujNiRvt6gsYkHc4HxQQwoRSpI3n157Sfy1V/tD6EDtntIdDjVXb9IfQtIgSL71SenD2Rk1WI1tfJnrKuepcN3OyF1vSlADheyxwdd6ta8AWJUaNqlwh9+gFkLWGqUyjcEpf1uA7yhqzcUG0+N4awR0mJ1EcY3MLszR4G6y5tt9o54y12LStB/g2tYfSAubDwffD0px0txuqcnjg3bSLZZpKiZ0s0r5ZHb3vcXE+JQS2I3qZgN5A8VDohlsqDaHF8LYGUeI1ELBuYHXb6DcLVlzfhD0qBwPEHuREklLho6N23e0jm5fdN47RGwH02WorMRrcSl5ytqpql/AyPJt3DgsVM0KmVjhHlJFUg6SVWSA2ukPpWkaNzgrMtLJIffvsPAf4rY3VVPFzFLHFxa3Xv4qy6hCXRQupdUBRS3RBQDIE2F0LpXno2QAUCW6N0Abo3S3RQhyQFyExF3IDei0arBosbfq0UsLphfKgsmj03kRN+UumPXSzewLisWH794h8Zl+W5dnyGm/KPTdlNMPUFxmLn9+q/4zL8srmehv8Ato18rg1pK975FtmsCxbk7jqsRwagrJzVTN5yenY91g7QXIXz9M/M/TcF9Kcg34sYvjc/ylqqRrTcz5N5tBybbOYvgFTQ02EUFDO8Ximhp2sdG8bjcDd19i+ZMTop8MxGooaqIxT07zG9p3gjevsV1REypZTlwEsjXPa3rAtf2j0rxvl02ML4GbU0Md3RgRVoaN7dzZPDcfDqWT0Z8acdy8HA8lFFSYlyl4dSV1LDVwPZKXRTMD2m0ZIuDpvX0S7YrZdrDbZzCRpwo4/oXz1yLHNyr4cT/Bzf2ZX1C/7m7uVY0yThyfFjm9I95VsVOHdJw6O+3WnjizPJO658V02w+C+7+2uG0Dm5ojKJJf0GdI+y3isniSt0e77F7GYZhuxuG09ZhlJNVc0Hyukga52Z3SIuRwvbwW8ds3gbmkHB6Cx0P7mZ9C2E8zKankmkNmRtL3HqAFyud5PtoTtPsZSYjI/PM5z2SfpNcR7LKn1EoqonzNtLQVWz+1eI4Q/XyWdzGXG9m9p/ZIWG3nyNS2/UV6py54AKfaKhx2NnQqojBKR8Nm4+LT/VXlbSb3G/eoz5k47ZNHofJrybSbVl2JYqTDhcbsrWxmzp3DeAeDRxPgF7lhmzGCYNEGYfhdJTgcWRDMe9x1PpWJsHDDBsBgjIAAw0kb9Osi59ZK4HloxnHcPraKnpZ6ilwyWIl0kJLA+S5u1zh1C1h2qnuSjihuo9WqKCkq4zHUUsMzDplkjDh6wvNdueSWhqaGbENnoBS1kYLzTM+5zDiGj3ruq2hXmmA7Y45gVfFUwYhUSMa4F8MsheyQcQQT1cV6vBy47JTsLmNxGwNtaa3zrVNdHP1cWVVLg8Ft1j0rtNgeT6p2vndUzvfTYZC7K+Vo6Ujvgt+c8Fz+J8xjO11SMKY4Q11WfJ2ubYjO7QW4alfT2C4TT4HgtLhtK3LDTRhg7TxJ7SbnxWpOkebT4VOTvpGHhGx+A4FC1lBhlPG4b5HND3nvcdVtZqSnnjyTQRSMPvXsBHoK8l5TOUqvoMWkwPBJ/J3QWFRUNALsxF8jeq3ErgKLb7amhqhPHjlZIQbls0hkY7sLSsqLZ6panHB7Uj2DavknwXGqd82GQx4ZX2Ja6MWieepzeHePWvCK+gqcLxCehrIXQ1EDyx7DwPzjtX0nsptdRbQ7N0uIySw000gLZYnSAZXg2Nr8OI7CvNOWqioziOH4tSyxPfO10E3NuBuW6tJt2EjwCsX4OeoxxcfUib/kp2fwbE9hWTV2FUVXK6eVpfNA17iAdBchdkNiNlRu2bwkf/AEcf0LnuRr8X0fxmb5S0vLvi+J4Tg+Dvw3EKqifJUva91PK6MuGS9jY6qPs7xcY4lJrwd39ZOy3+reE/9HH9CwsZ2M2ZiwOukj2dwtj2U8ha5tIwEHKddy+ZhtptSXfhJi1vjcn0pJtsdp5I3Mk2hxVzHghzXVchBB4b1drOD1MP9pv+ROjpq/lGpoqyniqYjSSuLJWB7SbN1sV9JfWvgH8h4b/0sf0L525CxblQp/is3savpTEqk0WF1VU0ZjBC+QDrs0n5lJdnXSpenbOI5TdicMruT3Ezh+F0kFXTM8pjdDA1jjk1IuBxbdfLwA4bl9sUdRDimFQVLQHwVULZADqC1zb+wr4+2qwV2zu1mJYS4EClncxl+LN7T+yQrE46uFVJHe8hOzNPjO0tdiFbSx1FLQwhgZKwOaZHnqOmjQfSvefrXwD+Q8N/6WP6FyXIrgfuPyc0072ZZsRe6qdca5Toz+qAfFddQ4sKzHsUoG2tQc0136T2l3syqN8npwwUYJM875bcEwqg5OJJqPDKOml8qhGeGBrHWLjcXAXznZfTXLx+LKT43B8or5nWo9Hi1fEyMAzjvC+w27EbKlgP1tYRu/icf0L49Z57e8e1fb7Pube5SR00iTuzR/WPsr/q1hH/AEcf0KfWRsr/AKtYT/0cf0LwflU2m2gw/lQxakosbxGlpo+ayxxVL2MbeJpNgDYarkfrz2p/1mxX/rJPpTaalqIRbW09b5c9nMFwjYijnw7CKGimdXMYZIKdsbi3I82uBu0HoV3IPguGYhsNWS1uG0lVIK97Q+aBryBkZpcjcvFq/aDGMVgbBiOMVlbE12cMqJ3yNDt1wCd+p9K94+p/12Crelm/fB/9nGj4RjHJZM1peDv/AK18A/kPDf8ApY/oXifL1sxTYVVYXi2H0cNNBO11NK2GMMaHjpNNhpcguHgvcMRxRmH12GQPsBXVBpwT8Lm3vHyFz/KpgQx/k6xGBrC+anb5VEBvzM19bcw8VE+T15oKUGkfJ2pK+k+SDY3DYeTukqsQw2lqamvc6pzTwte4MOjBqN1gD4r5+wnDBjGMUeGwBxkrJmQt1+EbX9Gq+xoIafC8MjhjtHTUsQY2+5rGtt7AtSZ5NJC25MxPrYwH+RMO/wClZ9C8A5dKCkw/bqkhoqWCmjNAxxZDGGAnO/Ww4r6EwLEPdXAKDECLeVwMmt+k2/zrwXl+cwbfUeZpJ9z2cf8AaPUj2d9Sl6do8rCYKB8XwD6UwdF1O9K6Hyx2tBG5WUtKJK6LQZAcxHd/4Ege07rrY4ezLCZbedoO4f4qKw2Zt7oFAlC62YDooCgpdAMEdEl0UAyR5vZMCkedQgsCNkt0boAooXRQHK2TMZcqAE6KwODBlA7yuZohbl46oWTacPWh6EKej8hZ/wApMA6qeb2BcXjjsuMV4vvqpfluXZchZ/ynQj/dZvYFxGPG+O1/xmX5ZWK5O7f9pflmuIuvpnkIGXkyiH+9T/KXzONXDvX01yGfi0i+NT/KVkb0n1jcqmPS7MVezeMxAuFPVvbI0e/jczpN9A9IC7hrqLHcGDhkqqKthvrq2Rjh84K8y+qBcG7L4WSbfus/IK13IZttzjH7LVr9WAy0TnHeN7o/Dzh49SxR7PUrK4PyanZDZaTY36oGnwx+YwZZn0zz7+N0biD3ixB7Qvf3+Ye5aLG9n2120OB4zE0eU4bO4E8XRPYWuHgSD4Fb1/3M9yHTHDZaR8elozEDcCvX+QvBLy4ljT2+aBSxG385/wD2heQOcQ5x4AlfT/J/gvuDsNh1I9uWZ8fPTfpv6R9FwPBRHj08bnfsYvKli3uRycYrK1+WWePyZne85fYSuI+p+xYGkxbBnO+5vbVRjsIyu9Yb6V6XtRsphu11BFRYoJnQRSc6GxSll3WIF7b95Wu2b5N8A2VxT3QwtlTHOWGM55y8FptvB7gqeqUJPIpeCvlSwQ43yf17I2Zp6VvlUQG+7NSPFuYL5mYBoR3r7HexsjC1wDmkWII3hfJ+1GDO2f2pxHCyCG08xEZPFh1afQQocNVHlSPSuS3lLosPw6LAMblFOyEkU1S7zMpN8jjwsdx3W7l7A5tLiVJZzYaqnkG4gPY4ewrwyPkLx9zA9uJ4YQRfzn/3VytYMc2Ix+pw2LEZ6aemcA408rmsdcAggcRrxCqEcs8cfnXB7viPJfsniN3e5jaWQ656Z5j9Q09S8t2r5G6zZ6lnrsHqH4jSNJkfE5tpox1i2jgOyx7E+z3K/j9FWQx4m9mJUpcGvzMDZQL7w4bz3he+bxdW2jSjizp0qPl7YKNsvKBgbXajytp9FyPWF9Q8F844yyn2S5ZHPiaGU1LXxzZRua11nEeAcV9HAhwuCCN4stSJpOFKPsz5OxyZ9TtFiU8hJfJVSuJ7c5WDZdNyhYHNgO21fE9hbDUyOqIHW0cxxvp3EkLmQto+bNNSaYCwHeAfBENA3ADwXpey3JBLtBs7TYnU4m+hdUAubFzGY5L9E3uN41Wo282Dh2Kioi3EzWSVTnDIYgzK1oGu88SApa6NvDNR3NcHp3I1+L2P4zN8pdTjmzeD7RwwxYxh8FayFxdG2UXykixI8FyvIy9r+T5mU3tVTD+stZy37Q4vs/hOESYRiE9C+aoe2R0RALgGXANwufk+pGSjhTfsdIOS/Ykf/LdB+wfpXI8qGwWy2C8nGJ4hh2CUlLVxc3kljaQ5t5Gg216iV5K/lL2zBsNpa/8Aab9Cw8R242nxjD5KHEccq6qlltnikIyusQRew6wCtqLPLLUY3FpROm5DhblQp+ylm9gX0bjv4PYj8Wl+QV858hxJ5TqcEbqWf2BfReO/g9iHxaX5BWZdnbS/aOT5GcY91+TDDWudmlogaR9z8Hzf6pavOeXLZ18/KDhE1Owh2LxtpyQN72vDfY5voTfU9475Pi1dgkjrMqoW1EQPw2aOA72kfsr1rajZz3bxzZqty39zK8zu7G827/uDE6YS9bCkb6kpoqCghpYgGw08bY2jqa0WHqC875JMX93sU2wxO5LanEw5n6AZZvqAXQ8peO/W9ye4nVsdlnkj8nh687+iPRcnwXDfU7C2BY2Bwqo/7NTwdJS/uxijd8u/4spPjcPyl8zWX0zy7fiyk+Nw/KXzRZbj0eLV/c/YDB0x3j2r7fZ9zb3BfETB0294X26z7m3uUkddF/kc9iewOy2M4lLX4jglJVVc1s8sjSXOsABfXqAWJ9i3Yj/Vug/YP0ryHlQ242nwflIxShw7HKulpYubyRRuGVt42k2uOslcl9kvbX/WWv8A2m/QiizUtRjUmnE6Tlt2cwfZzHcLhweggoY5qd73tiFg4h4AJXf/AFPn4A1v/EH/ANnGvBsZ2gxfaGaKbF8QnrpImlrHSkEtBNyBYL3r6n38Aa3/AIg/+zjVapHLDJSzWkZ/LLiT8GwTAsTj86jxeGbvAa+49F16Ax8VXSte0tfDK0EcQ5pH0FeY/VAfgHRf8QZ/ZvW85Isd93OTmh5x+aeivSSXOvQ83+qWrNcHrjP+64nmPJjsqKXltxCmey8eCGdwuNL3yM9Tr+C9X5UsZ9w+TfF52uyyzReTR/pSdH2EnwWTguznudt1tFjBjAbiQp8h/RaQ712Xmn1QuOXOF4DG/wCFWTAHvaz/ALinbObXo4pfueqbE6bA4ABu9z4P7MLw/wCqBH/v/R/8PZ/aSL3DYn8AcA/4fB/ZheKcvjQdu6QH+IM/tHpHsmo+yv2PKLKWTFpBsgu58qx4Y3SzNjabF5tfqXQNY1jGsbo1osFqcMZmqi8jRjSfFba6hLJZRC6KoIohdS6AKlkEboApH7090jzqgBbRQBS6iANkQELooDmSNUQbcNVEQMuvFYBCTaxCAGqNtUbWCFPROQz8aNN8Vm9gXD42b49iHxmX5bl3HIb+NCn+KzewLh8XH7+4h8al+W5Z8neX2l+WYcTC6RrQLklfT3IrGIuTmFgG6omv+0vnLDqezTM7efN7l3ezvKfjGyeC+51DTUUkLXukvMxxdd2p3OCxJ8m9PNY5XI7nl/YJNmsJB3CsJ/8AtleJUFRLhtdBW0jpIqmneJI3tO5wOhXUbUcoWL7bUVPTYjT0cUdPJzreYY5pJtbW7j1rnLke+A7lGy5Zqc90T6m2Q2kg2r2apsUhAY94yzR/wcg85vzjsIW6f9zd3L5h2T23xXY+WoOH8zLHUAZ452lzbjc4WI14LpH8uO0YY4miwy36t/8AfUs9cdVGvm7OU2Owf3e21w7Di3NHJNnkH+zb0neoW8V9TjQL5U2T2nrdlMWkxOjp6aWeSMxATtLg0Egm1iNdAuwfy3bSvYWikw1txa4jfcf1k6OWDLCEXfYNq+VLaOHazEYMKxMQUMMxiiaIWO0boTcgnUglac8q22nDGdfi8X91ck4lziXEucTck8SlOihweWbd2fWGzmLMxzZugxNhH7pha824Ot0h6bryLl1wPmsVoMZjbZtSw08pHwm6tPiCfQua2b5Usd2WwZmF0cNHNTxvc5pnY5zm5jcjRw0v7UdqOUzF9rMGOG4hR0DYs7ZA+Jjw5rhxF3HtHiqemeaE8dPs9j5NtrafabZenYZG+X0cbYqiMnXQWD+4gem4WZtLsHgW1b2S4hTvbUMblE8L8j7dR4Ed4XzTh1fWYXWMrKGplpahnmyRusR/h2LvcP5atpKSIMqoKKut797DG4/sm3qVENRBx25Eei4NyS7NYPXR1gZU1ksTszBUyBzWkbjlAAPiuwxCvpcMoJqysmbBTwtLnvcbABeKy8uONyMIhwugicffOc99vC4XFbUbV43tQxrsSrnvbG8OZEwZI2n9Ee03VXJXqMeNfIjH2jxd2P7S4jijmlraqYva072t3NB8AF7RyV7dw4xhMOC10wbiVKwMjzn7vGNxHW4DQjxXgEcodo4ZH9SvY98UjXxvcx7TdrmmxB6weC6NWeDFmeOe73Pq3G9n8L2ioxTYrRx1UbTdubRzD1gjUeC56h5J9kqGrFQMPfO5pu1s8rntB/ROh8V5ZhHK9tPhkTYp5IMRjaLDylpz/tNIJ8bray8uWNOjIiwqgjd8Jznu9WixTR7/AOowS+Zrn8HtNZWUuF0MlVVSx09NC273uNmtAXzTygbXO2ox6fEGBzKWFvNUzHbw2+89pOvoCo2g2txraaQOxStdLG03bC0ZI2nsaOPablcziUlmsjHHpH5lpKjy59T6nyx6PoTkK/FpF8an+Uui2z2Gw3bilpYMRnqoW0shkYadzWkki2twV4Dsnyq45shgjcKoKWglgEj5c0zHl13G53OAW6PL9tSD/mGE/wBFJ/fWWnZ6YajFsUZHa/8As+7Lfx/F/wClj/uLGxHkG2Zo8MqqmOuxUvhifI0OlZa4aT8DsXJ/Z/2p/iGE/wBFJ/fVVVy7bT1dHNTyUOFhkzHRuLY5L2IsbdPtV+Yz6mn9jD5DdeUumJ40kx9QX0Zjv4P4h8Wl+QV8lbK7TVmyGOR4pQRwyzxxuiDZwS2zgAdxGui7Sq5d9p6yjmppKHCgyZjo3Fscl7EWNun2o07M4M8IQ2s4nY7Gzs7tVhWKgkMppWGS3Fh0eP2SV9iMc17A5pDmkXBHEL4lDQGBu8WsvSMO5cNp8MwqloY6bDpm00TYmvljeXuDRYEkOGqrVmNNnWNNSOh+qEx3NNhWBRu0aDVzAHieiz/uKz/qePvHjfxqP+zXje0u0VbtVj8+L4gI2zzBrcsQIY0NFgACT/4VudjeUbFth6Sqp8Np6OVlVIJHmoY5xBAtpZwSuKEc8fW3vo9n5dvxZy/GoflL5nXdbW8q2ObY4E7CsQpaCKB0jZM0DHh12m43uK4ZWKpHLUZI5J3ELB0294X24z7m3uC+IxoQepepjl/2paAPIMJ3fwUn99SSs6abNHHe49K2l5HcA2p2hqcYrazEY6ipy5mwyMDRlaGi12k7h1rV/wDs+7Lfx/Fv6WP+4uJ/9oDan+IYT/RSf30Ry/7U/wARwn+ik/vqVI7PLp27aG5UOS7BtidmafEcOqa6WaWqbAWzva5uUtceDRr0Qu0+p/Ftgq3/AIg/+zYvK9r+U7GttsJiw7EaahihimE4dAxwdmAI4uOnSKOyPKdjOxeEy4dh1NQyxSTGYmdji65AHBw06IVp0co5cccu6PR6n9UB+AlF/wAQZ/ZvXJ8gWOeS7Q1+CyOsytiE0YPw2b/S0/1Vy+1/KdjO2uExYfiNNRRRRTCYGBjg4uAI4uOnSK53AsZqtnsdpMVosvlFK/O0PuWu0IINuBBKVxRJ5l6ynHo+yuC+SeUTGjtDt7itc12aESmGE8MjOiPTYnxXVz8u21NTTSw+SYZHzjS3OyN+Ztxa46e9ea2060iqNanPHIkon1xsV+AeA/8AD4P7MLxXl7/D+kH/APHs/tHrGw3lq2jwnCaTD6ejwx0VJCyFhfG8uIaLC9n79Fye1212IbZYxFiOIxU8U0UIhAgaQ3KCTxJ16RSK5Lmzwnj2rs0rm3VTm2CyN7UBHzkkbPhOAW0eBmbhsXN0xeRrIb+CzFCANALAcFFSAspZFRUAURQsgCoopxQBSPG5Og4aICtEKIoQCZCyNkBzgbcpieuzlG3A048LIjf5oHgsGhbN7Qoe+6Yk9lkLID0TkO/GhTfFZvYFxlfBz2P4jfzRUy3/AG3LtuQ6JzuUqCW1mtpphfrNguTqiDiuItGh8slv+2bLDZ6H9qP5YcoYxrRuCqk1a7uVmbM3s3LstltlcMxfAW1VWyYyukew5ZS0WB00WIxtnmy5Y4o7pHDxgAa3KsFgdG2Xpo2CwNo0jqf6c/Qp9YmB/wAHU/05+hb9Nnn/AK/F+p5mN5Pgqz05AwHot1PaV6ZUbEYLDRzPZHUZmRucLzHeASvMob5QTvIusuLid8WeOa9peFFvtntlanGmiokcaekvbnCLl/6I+ddnTbG4JTsAdSc+7i6V5N/DcqoNnPLq8eN12zy5I4r1afZDA52FvkLYj1xOLSPWuR2g2KnwyF9XRSOqaZurmkdNg69N4VeNomPWY8jro5N5yjN1EKwb1XJ0oiBqu72T2awzFMBZV1cD3zGR7SRIW6A6aBZUb6O+XNHFHdI4o9SIC6rbLAsOwWkpJKOF7HSyOa67y7QNvxXJc/r5vrUaa4LiyLLHci1osUzheNy6PYvCKLGvLPLInP5nJls8i1733dy2m0uzeGYZs7U1VNA9srMtiZCRq4Dd4rpGLqzhPUQWT0/JwJYCLEAhMBbcSt/sbhNHjlZVRVjXlsUbXNyPy6k2W/xvZDCaDA6uqgZMJYo8zS6UkXuOC2laszPPGE9j7OCTBbvZTCaXF8Vkp6trzG2IvGR2U3uB866/6x8F/g6j+mKKNmcmphjltZ5qBcrT1MvPVD3A9G9h3BexHYbBSCMlQLi33YrRYpyXwGFz8KrJGSAaRz2LT2ZhqFdrMrWY26PNxpr2ILIrKSeiqpKWpidFNEcr2O3grvtlticGxbZqlrauOczy5sxZMWjRxA07gspWdsmWONbmec8VLr137HGz38FVf9QfoU+xxs9/BVX/AFB+ha2s4f1uP9TyLiju1XqOLbA4FR4NW1MMdQJIYHyNvMSLhpI0Xl9lGqO+LNHKriLclFGy3WyWF0uMbRw0Va17oZGPNmOym4FxqoblJRTkzR2QsV6fj2wuBYds/XVkMdQJYIi9maYkX4aLV7E7KYVj2DzVFayYyxzlgySlotlBGniVaZwWpg4ufg4RCy7HbvZzDcA8hFAyVpnzl/OSF+61vaVyCNHaGRTjuQoGqPFEDVMAhsAClkbIgcVAS1lEVCgBZDcUbotFyqAi4KYaqWRAUKFK5t0yBNkFkG5X0rc1XF2Xd6lQ1ZtA28j3/BFvT/6KkZmIWRUVJYLKWRUQWBRFRBYLIohRBYLKEXFkyiosqsoAmcNVEALI2UUsgs0Au06EWUJB96mLb9SBB6lgoluxSyZTghD1TkaYI9vqRjPNFLL6bBcFXwmLabEQdPt8zh29MrvORoFvKFTMvupZR6guQxWxxeuPHyiUf1yuN0ep/aj+Wa+LWMWHavUNhPwWj/XSe0Ly+n+568B869Q2Ft9a7Lfw0ntC6Y/qPma37X7g2yxutwSjpZKJ0YdLI5rs7M2gF1yjdvMdc8DnKb+gC7vHMBpcfghiqpJmNicXN5sgEki3EFadvJ3hLTcVFZ+23+6tyUm+DyYcmCMKmuTmJtusblY+Ivp8rwWn7SNxFlr8Awo4ti9PR6iNxu8jeGjU/wDnaumx/YzD8KwSorYZql0keWwe5pGrgOA7VTyeNEmM1Uhb9zgsPFw+hYp3TPYskFilPEqPQIo2QxNijaGRsAa1o0AA4LgMe5RpYaySmwmKIsjOUzyjNmI+COrtK7DaCpfSbOV87DZzIHWPadPnXjvOB3nRsd3rpOTXR5NJhjkuUuTq8K5SaxtQ1uKQxSwE9J8Tcrm9ttx7l6NHIyeFkkbg+ORoc1w1DgQvDDzR3wAdrTZeq7DTmfZKmHStE58QzG5sDp7VISvhmtZgjBKcVRwW2WEswXH3shGWnqBzsY4NudR4FdxyfnNslGf9tJ7QtRyoQA02GzAdIPezwsD8y2vJ5rshH+vk9oRKpDLNz0ybMLlKIGHUFxf7c75K89Bafer0DlNdlw3D+2Z/yV52HArM1yevRv8Aso9A5Nbfvlb/AGf/AHLe7a2+tCsv+Z8sLQcmRv7p/wDL/wC5b7bc22PrT+h8sLa+k8WX/Vfuv/RzfJsAMSr7X+4t+Uus2r/BLEv1J9oXJcmjr4liH6lvyl1u1f4JYl+pPtCkfpJqP9T/ANjjeTt5O0E4Jv8Aud3ymrv8SnfS4VVTx2EkUTntuLi4FwvPuTnXaKf4s75TV3uNBxwGvDQS4077AC5JylWH0jV/fr8HntTyg41TGN37mkudWmK1x4Fd5s9jceP4NHXMZzTiSyRl75XDfr1cV5NNQVtQYRFRVL3Ou3KInE+xenbGYNNgmz7YKkZZ5ZDK9vwb2AHfYKxbZvVY8cY2uznOU/DYwKLEmNAe4mCQjjpdvzhdDsJ+BVD/AD/luWn5T6ljcLoqW4zyTGS3YG29pW42E/Auh/n/AC3K+TlNt6eN+5hbc7R4hgBofIHRN5/Pnzxh27Lb2lcl9kXaH+Epf6AfSvQsf2Yo9o+Y8rlnj5jNl5ogXva97g9S032MsH/jNb+23+6o0y4smFQSmuTkarbzHayjmppZKcxzMMbrQAGxFjrdc1Zd1tXsXh2B4C+tppql8okYy0jmkWJ13ALh1l2e/C4SjeNcC2XQbDOyba4fwuXN9LCtCs/BMQbhWOUle+N0jYH5ixpsXCxFvWiN5E3Bo9X20fk2MxI9cQb6XBaPkudfCcQZ8Gdp9Lf8FrNodvabGcBqKCKhnhfLl6b3tIFnA8O5a7ZHayDZuKrZNSyz8+5rhkcBawI4961fNngjhmsLjXNm05U33r8NZ1RPd/WH0Lgrdi6Da3aKLaSvp54qeSBsMRZle4Ek3vfRaC6yz2YIuGNJgAsUbKDUpgEOwLFFMBZRQC2SlWKBoQogYSrAw20TiwRugEDSoRZEuCF0BEDqihdUWQLPoBYSeCwRqs2jcBM5t/eqmTLQRUVAAioogIopdG6AiKCN0BFLKI3QCuFwlViQixQARUUQhobhQ3adDp2qWRF9w9CwUBN/OWfBh4ytfKTc6ho4d6xoYiXkkaDrW4sNLrEnRpI7bkebblFgNv8AR5ePYFxmLNd7sVuo/wA4ltw9+V2fJDIPskU8Y3+TTH1BcPiwe3GK4g3HlMul/wA8rCPU/tL8spjblOXQb16bsN+C7P10ntC8t55zHWcNV6hsI7PsrGf9tJ7QumNfMfL132/3LNrMcq8Dp6R9IyJ5mkcx3ONJAAF+BC5l3KFiuazaekP8x30rrdo8DlxyngjjnZCYnlxLwTe4twXP/WDV/wAfg/YctS33weXA8Ch8/ZpcW2xxLFcMlopoKdrJLZsjXBwsQevsV/JzVZNoJ4H6GaA2v1tIPsuthLsHUxQySGugORpdbI7Wwuubw+vkw6vhrY9XREOt1jiPQs20+T1pY8mOUMR6ljVG7EMCraRgu+aFzWjttp614zh9LJXV8dG2SOKWU5RzpyjN1E8Ope10FfT4lRR1dM8PikFx1g8Qe0LRYzsRh+LVLqmNxpZ3m7ixtw49dtLHuXSSvlHh02b0rhLg42t2Gxqiopal7YJGRNzObG/M63Gwtqu72No30WylGyRuV8gMpHVmNx6rLa0MM1PRRQ1FR5TIxuUylti7tParJpoqaB80z2xxRjM5ztA0BVRS5MZdRPKtj9zheU6Zjm4dTHV13y26hoPpW35PQBsiwDhPJ7QvPtpMYdjmNzVYBEQ6ETTwYN3p3+K6fk2xiNvP4TM4Ne93Ow398bWcO/QH0rKfzHqyYnHTqPsZXKdG5+FUDhubO6572rzixC9yxTDKbF8Pko6ppMb9bje0jcR2ri3cmchm6OJs5q+8xHNb02SSbfBNLqIQhtk6G5MGuyYm8g2JjF+3pLfbcW+s6svxLPlhbHBsHpcDw5tJSg5b5nPd5z3dZXK8o2MRso4sJjcHSvcJZQPetG4HtJ18FrqJxUvW1ClH3/4MLkzFsTxD9Q35S67az8EcT/Un2hcjyZffLEP1DflLrtrPwSxL9SfaFF9JrP8A6hfscXyc/hFP8Wd8pq9LLg1pc5waBqSTay815Ofwin+LO+U1d5jv4O4h8Xk+SUh0Z1avNX4Mk19NbWsht+tb9K1eJ7V4RhkLnOqm1EgGkUBzuPo0HivIxYDzR6FfGzo5yBl4dSz6jPStBFO2yY5jFRjuKPrKizfesjBuGN4Ben7DC2xlD/P+W5eYcyyQ6x27hdepbFtazZKja25Az7/03Kwdsmsio40l7mJtltNV7Oij8lihkM+e/OAm1rdRHWuW+yXjH8Wov2Hf3l1m12y8+0nknM1UUHMZ752k3vbq7lzf2MK3+U6b+jctO74OOF4Ni39moxnbTEccw11FUw0zIy9r7xtcDcbt5K55dlW8nVXRYfUVTsRp3tgjdIWiN1yAL2XJ01NJV1UVPGBzkzwxt+smyy78nuxSx18nRSovUG8muFCi5t9RUmotrMHAC/Y225ecYjRyYbiNRRS2MkDywkbjbijQx5o5G1ExSlROqFkOoELJrKWVIRo1TXCAUUA10UljvRCUUYC6cNSN0KtChUKBooWkhMRZAHVAIWFC1lagbIBQgija4VIRo0WTQC8sjuz51jjzSs3D22he7rNlSGSUE1lLKgCiNlLIAKI2UsgIojZSyACKlkbIAKEXCNlLICtRWObfXiksgNERqmbE8utlIO/XRZNO4Brnvylrd1xck9QTNeZJHE6eN1ysqG46rMLxbN2LEV7D9rb3LDNna8i4zcokEp1c6nm9gXIYpmGMVzbG3lMvyyux5G3Aco1PGARanm9gXFYrORjFcL/6TL8soehv+0vyzE5hzn9LQXvpxXXbO7Y0uB4SygfRzSuEjnZmvAGp7VyAlcToSUoeTK2/WtJtHkyQjkW2R6R9kSj/AJPqP22o/ZCo/wCIVH7bV58oCVd7PP8A0mL2O+l2+pZqeSMUE4L2Ft87eIsuJDejlOullS1+qua64WJNvs7Y8Ucf0mRhWJ4jgc5koJxkd58T9Wu7x19q62m5Q4sg8swyZjhvMLw4euxXGEJDdVTaM5MGPJzJHbVPKRRxsPMYfUvfw5wtYPVdbzCsZw/aLB+cPN5ZAY5oJHDoniD1jtXlLiDvKqswPvYFbWRnGWjg18vBnbT4CcDxIsjeJKSW7oXhwOnwT2haoXiZFLE9zZWuuC02I13qx8gcSCN6rsGuADswPqWT1xTSpuztsK2/rKaFseJQtqiNOcYcr/HgfUtmeUnCmixpKzN1Wbb03XnL37+Kqc69utaUmcJaXE+aO0xPlJqZo3R4bSCmv+VkIe4dw3e1cXNLLUTPmmkdJI85nOcbknrKubHGGAkXvxuqXgMdbeOCm6zpDFHGvlRvdk9oodnKuplmp5JxNGGAMcBaxvxW6xjb6lxTBauhjoJ43Tx5A5z2kDULhkQtW6ozLDCUt7XJvdlMbhwDFJaqojklY+IxgMte5IPHuXTYjt9QVuGVVKykqWumidGCctgSLda89BtxTs6ThfQLNtKhLBCct77Lo4w4NJI1NrXsnexrXbnNUdVxtjDGR6jioarnnNblDdNNVnk7WQkwsJIDm9dtfSuowLbynwnBoKKahnmfHmu9r2gG7iePeuVnlvE7fcjf7Vhg6LUOOTlkhHIqkej/AGTKL+Tan+kap9kyj/k2p/pGrzoORut7mcP6XF7HeYhyhUlbhlVStw+oa6eJ0YcXtsLi11w0L3008c0LsskTg9p6iDcJQoSst2doYo41UT0FnKZS+RgyYfMaq2rWuHNk9+8DwXn1ZUzYhiM9VP8AdZ3mR9t2vUhf0I3V3MmPFDG7iinKC6wbp1qBt9S0AK3dwQHmm+9Q6lfNhwFtEREBvN+5ONAnGoQFYjapkA3DcmJva27VRpv6VQK4Z2doSAXCt3O0Uc0WuEIVc2eCgJCs3juS3v53pQDNcHaFEs4pC02zDd2JmS20duQtgKBb2q7KDuUy2QFBCZu7VW6JCddEIA7h2rY0YtSN7SSsAgDUnQBbOJuSBjeoKgayllEbKgVGyNlEICyiKiCwIohFBYqiZRCAU4oooAIZQdUyg3IDSE6cFbE2zb776qkDVXw+Z3Fc2jaHsnb5pHUlsjch2hssmjvOR0/5R6cH+LzewLicXEfuxXdAf5zL8srteRy/2SKe5v8Aueb2BcVikV8brrC/7pl+WUO8vsx/LMNrrO6I38VDGLF99xFlMpJsBYcVY8Wia3xKHnsKgOqrAI3EpruulEscDUpg4t3Ksu7CEQ8dqUWy4TdYSvlJ4aKvM3t9CmdvapQsR+86lIDoSrc46kriCNBZUWUlAHpbkzgg2+7gtkshHYlI6Q0T8FGgW3a3QgS4ZdEjtbXTFM1gLgXbioWyoI27FdIxpHRFnDq4pBG8+8d6EAtlZm+1gW80IGJ4Fy02UaM1x16IBcosO3gVHizrEbhZTKQ6x3qXOYG5uOtWiWNfND4WVIWQ4WhJdo48AFRZRBkRshZFaAQhxURAQhLCyICiI3KABGihGnei7RQlBYCOxDcEyUhARgUZo43RaLFLazyqBjYqNPvSoRxCB3oLDlyu3aIOZbUDROHC1nKAjghbEZoexK5oDrWTubroo4XaD1IQVji09isN7XGoVdlYzqKULEOqLQmc2xUaN5VAGN52ZreBdZbc71g0UYM1+DB6ys5CAspZMogFsjZFRKJYLKWRUsgBZSyNlLIAWUsjZSyAgCNlFLICKAIqAIDRWV8HmnvVNldB75ZfRpdlllOKZADVYNnd8jn4x6f4vN7AuTxBzRi1d1iplv8AtldZyOfjHp/i83sC5avbbFa6/GplNv55UO8vsx/LMGYh1gOu6rPSKyDGL3Giz8KwiCaCbEMSldT4dTmznN8+V3BjO1ZnkjjjukYxYpZpqEFyYVBhdZiUvN0dNJO4by0aN7zuC2T8ApKJ2XE8coqZ4F3RxkzPHgFiYntHUVUBpaRgw/D2jSCI2v2uPErXYVg+J49M5mE0bp2Xs6oeckLe93HuF14PXy5XUOD9Bj+GYccbyu2bl+H4C9nQ2kiYeuWmexo7zwSy7MVhpBWUT4cSpTe01I/nBpv03rp8I5NcMw8NqsfqRiMrdcjuhTsP6O93j6FvanaahpIhT0MDZQwWbZuVje4BezHhzV9Vv8Hl1GLSRXVfueSGMhAsPUu4raGm2gLi6OOkxA+ZI3Rkp4Nd29q4ydslPM+GaJ0cjHFrgeBC6JtPbJUz5E4JLdF2inKgW3CfO08D6Ebt7Vs5GM9hBQA1WQ4NcLXCqLCDu061qwIi3d3okIsBNmgEkmwA1ugFKY6Bn6N009NPTENnglhJ1AkYWk+lIPN1QdBYTzre9Zt1gtOV4PUVktlBWWaiM61lhghshudN2iznwVApjUeTzczb7pzZydXnWstcdSkRIygWzMFwDbjxUIjYRlZqOvVYw04LYnBsWjwdmLPoaluHvdlbUlhyE3tv79Lq0ZVvo18ry53YEllY4dQFil0utGRVEbKWQATAaKJgQEALIq6npp6rNzFPNNl383GX277DRVHRCiP3IBMdxQA1QgRuQVkbXPdlY0uceAFyi+nliF5Ynsv8JpCu1tXXBHJXRVuUcNbolEWIt6FCgbqLIKbkVSAQTWUsgBfTVEcR1qWRQCqbkSNVLIBr5m9qNtErdCrCNAgCyeSG4YRY77i6tbXvHnRtPcbLGO9SytEszW18Z85j2+tWCrgd+UA7xZa5QBWgbZrmu81zT3FGxWosOpO172+a9w8UoptFLrXiqnHvwe8J21z/AH0bT3aKEM26KxW10fvo3Du1VrauB3v7d4shS1RK2SN3mvae4p7IAKKaI6IAIqXU0QGkVsA1Pcq7K6HzXLD6KuywIAJhuKACwaO65HfxjwfF5fYFzOJD99q34xJ8srpuR78Y9P8AF5fYFzWJffat+MSfLKh6JfZj+WV0VJJXV0NLGDnmeGjs7VZj08mJYzDg+Fsa6npyYKdrnZW3Au97j22Kz9nDzElfXXANJSvc0ng46BaCCV1LjFI6J+R95Olx8wA+1fPzP1M6x+D7Xw6CxaaWofZ1mFbD4Th7WVeP1La2QaiJ3RhHcze7x9C1u2vKrVYfMME2cpo4uYaM03NAlh32a3cNOvrWyoWQ1DnSVdUWBrb5j0i7sXG7Q1WGUmOVwiebvcHat6R6I0XryRWGCpWyaXO9VkafCo0p292lfUiWvqHVIPvZmWbv4WsvQMCxWgxvARVxSObWteGSU595pv7QeB79F58xkOJxCNztGdJokNr36l3vJps/h0zsREmIsgDMhMYIuRqLgnS17BdtPnd1Imv0UXFygrZsRoL7lRtHSeWYdFioaedY4Qzm2j9Oi7v4HwXo2HYVgcb8tNC2eRozZ5Lu6t19OI4IbVUrKvZyqpQ0ZubJAGgBAuPYt6mScdy8fxnz9Po5JNN9r/z4PEiwdXoXW4HybYjtDswcYoqiJx5wxtpy05nEOA37gNbrlwwmx6167sxUz0PINik9PI6KVnlGV7TYt1A09KxZ59PCM5Pd7HC43ydYrhO0VDgkL46+srY+caIQQG2JBuTwFr3W8dyJY0IDkxTDn1QbmNPmcD6beuyyeRMxP2rxAyHNMKXoZjc2zjNv8Fp8KkxX7NrC50nlxxJwlFzfm8xzA/m5PC1kOsYY6Umu3X4OTbs7isu0QwNtFJ7omTmuZOhB7TutbW+62q7hvI5jmFz0lU2uoameKWOV9NG4h+UOBJbfzreC7xraL7PLiMvP+5Fz1583tyLzPHJMV+zRKWmXy4Yi0Qi5vkzDLb83L4Wull9GGPl880bvl1ikm2mwaKJjpJH072ta0XLiZAAAFgUfInjs1JG+pxCgo6iQXbTyOLndxI0v3XXcbVsgdy0bI+UWyiOUtv8AC1y+uy1W3dZshTbdh2M0uOvxONsRhfTS2Zbe3IMw477cbomdsmKDnKc/f/0eZnYrFINtKbZqtDaSrqHhjJDdzCCCQ4EbxoukqeRrGaRmITS11KKeii5wSFrvtxDcxDR2brniulxbaKm2h5UNknR4ZiGH1FNO9rxWwc25wIuLam9jf0rnOWeqqZduvJnTyczDTRljMxDQTck26yrZwljxwjKXdM3pcXfUv311H/8ApXGbLcmOM7T4acSE1Ph9Ab5Jqknp2NiQBwvxNl2ZBH1Lzuux/wD7K3W1smztPyZYEMXp8QmwoshDRQuDQDzfRzajTf4pdHR44zpy6UUeV7W8nmMbHxx1NS6GqopXBraiAktBO4EHUX4cFvMRpNpYOReimlxinfgsvN5aVsNpAC/otL+IBF7LaYptZgZ5KqjBsNwfHfIZWFtNUVUWeJrs4I+2ZjoD6FkbQafU5YR/yPllWzHpwW7Y/B49e12ncVnYFg78dx6jwuKVsUlXJzbXvBIabE3IHcsBdJyefjGwL40PklVnhxrdJJnQVPIxjVKzEJpa6lFPRRc4JMrvtpDcxDR2brnitFW7CVVFsDSbVOrYX09SIyIAx2cZjYXO5b7lorKmTb0Uzp5OYhpo8jMxytJuSbdZW9x1jpPqbsKLGlwY2BziOADyLlS2e14sblOKXSZw+A7A1eO7H4htDFXQQw0HOZonscXOyMDzYjTW9k+yPJzi+2UElVTPhpKKM5TPPezncQ0Dfbidy7rk8jezkN2je5pDZBVOaTucOZAuPEFGpM7PqaqU4cSAYm8+Wb8plPOX8d/ZdLYjghSk14v8m65Ltj6/ZCfGoqqWGohqGwuhqKd12PtnB7iLj0ryrANgavaXZrEMYoq6AOoi8PpXMdnOVuYWO7Ubl3vIK6qOFY01xcaISM5u/mh+V2a3hluub5Gcc9zds5cNldaDE2Flju5xty30jMPEJzybahNY01w7OX2O2Sq9s8XfQUk0cGSIyvlkaS1ouAN3WStZi+HjCsYq8PbUMqvJpTEZYwQ1xGhtftuPBe1YRhjOTbZva/F3NyyGpfFSXG9o+5gfzn+peFOLnPLnOLnE3JPE9aq5PLmxrHFJ/Udbh1CyiprNbd5AL3dv0Latwaoq8Gqa58bBRxEMc6R1g9x963rPHRTZfaVtKHv5iGqp52iOqppGjpDqvwPEFX43jj8TczoMpKGmblgp2HoRN6+0nieK/a429qhjS2e/6fj3/n6H5xqHMpt7vb9fz7f+f+Tz7EKXyOukhBJaNWk9RWMsvEaltXXPlb5ujW9wW+xzbP3Z2NwjAfcqmp/c2329mpfYW0FtL3u7U3K/I59vqy2dWfZxcw+d80cw7UXQsuw2k2++uHEcFq/cWipvcoN+1gZmzWIOU6CzOjo3hcrA202p+u/aA4n5BFQ/amxZGHMXWvq42FzrbduAXE6yjBXUrOespZFRDmCylkUbIBeA7FLJgEFQRouVZa5SjTVOwad6gFsULdisspZAVZUbKwhCytgrt2I27E2VTKUsC6KWTWKFgrZABRG3apZLALA8EwLm+a5w7ihqorwQtFTM38oT36pxWyDzmMd3aLHUQWZja5p86MjuKsFZDbXMPBYACJULYithHRPeq7K6EdE96w+iofgoBrYC6NtFfAQW2tqFgp2fI/G4cocDiLfueX2BcviY/fat/XyfLK67kk/GFD+ol9gXHYo4uxiu1s0VEg7+mVD0y+zH8s2GBgvw/GYR576MkeDgStThWHy4rtDDDEWAsjleS46AXYFsMDq2UWMQyS/cX3ik/RcLFZOzNHNRbcYhRhgMtJFkIdoCHPBa4dhaAV8+UXHUqX89j7einGejljfhnW4bsdGWXqp8wIsWMHzleaco2FU+z+PS0ggE7aiJkocAGEN3XsN5u31L2qn590YzVMMQI3MFyuM5SNl5sdgpq3DJmVFVTseJzLM2IcyOkOk7SwJ6+K9eROceTen2YpfKqPMMIniEkUkIAv52i9E2SoKYRVteGRyTTPAGcmzQLbgOv5l46J5o3kWDGOOpab3Het7QY1XUlbSyRPkZzTg5kLXEAjcSezhqsYYxhO5co9uolKeNxjwz6AwJjmzzTvFgYrtb1DN9AHoQxqqZT4bLzty6WOR1xwDW3J9YC0+y219BihmjqJWUMz2tZHFI4WPc/cfGym3taylwZlOADPMSwG+5hsXewelejK4vG1HzwfNe7EnJ8UebDRo04LpKPbSoo9ianZttHC6Coz3mLzmGY3Om7gubu7ebALa0ezlbXYdHXCooaeCV7mMNTUtiLi3fYHvCUfBhKSfymDhWK1mBYtFiOHymGohOhtcEHeCOIPUu5dyz12V0rMCw9lc5uU1FyfVv8LrhsVwurwmoFPWRNY5zQ9ha4Oa9p3Oa4aELXix3EHuVLHLPHxF0bKPaTFotpvd8VbjiPOc4ZSN5ta1vg20t1LsK7ljxKqga6HCaGmrbBpqm3c8DiG3Gl9RvNrrgqSkkr8Qgo4MpmqJGxMDnWGYmwueCrnhdTVEkMtg+J5Y7XS4Njr4K0I5ckU6fZ0W1W29dtVilFiD4GUM9E0iMwPJN8wcDc7iCF0UHLNiAgi8vwWgrqqEdCoddhv12sbHusvONLX0ssmjw6fEGVb6cMIpIDUS3dazAQDbrOo0UNLPkttPlm6qdu8VrtsaTaKsEc01G7NFALtjaNeiOPHfvKwdqto5tq8ddik9PHTyOjbHkjcXCzb63PetQbDeQFeylD8PlqvKIG829rOZc+0jrg6hvEC2pVMPJOSab/U6H6+qv7H31p+RQeT/w+d2f7pn3bt+iv2Z5T8T2ewv3Kno6bFMPboyKfQsHUDqCL8CFzuE4TUYzWmmpTE17Y3Sl0sgY1rWi5JJ3K2t2Yr6KgfWh9HV00ZAkkpKlswjvuzW1F+tVI0smVVJeODcbV8pOKbUYezDW08GHYc0gmngv07bgT1DqAARj20OLbMYXsfXQw0mHRzQskrA8l7GB2rrHTiVx4A39XapoBfS3XdWjHrzttvs9H+s7k4P/AM9H0N+harEo9n9jMewjFNmsYbjkkMjpJGPIAaQAG3IHG59C5iqw6opKCirJsohrWufEQ65Ia7KbjhqsQkcfalG5ZV4ikzc7V7STbV467FKinjp5HRtjyRuLh0b63Pet5sryn4hszgxwmSip8SohfIyYkFgOpbxBbfWxC4pCyUc1mnGW9Pk72blbxWowjEsOkw+k5iuY6JjWEsbTsLcuVoGh4nXiVg7Hco2J7I0klC2CGuoJCXcxMSMpO+xHA8QVyFlLJSNf1GS1K+Uej0/LRilJVTOiwihZSvaGx0zCWMjte50GpN9e5c3sXs3juPYwyqwSJuehmjkfI54aIyXXB137joFzlll0OK4jhgeKCvqqQSeeIJXMzd9jqlew9ZyknkdpHqfLltGyWSi2fgkDjGfKakNO42sxp7dSbdy8gKZ7nyyOkke573G7nONyT1koWRKjObK8s3JjRSyQvzxPcx3W02Ty1dRUNtLM946idFVZSy6LJJLam6OG1N3QFEbKWWDVgURspZUWRRSyllBYFEbKWVBN6hHG2hRsEQFARo03Ky1vBCNt3dgVtgoyoqspZWZUC1QohClk+VCyoFspZNZSypBbIWT2QtqgFyjqUyprI2QFdj2KeCeylkAlgpYJ7IWHUgFQN+oJ8qBbqlkoVWw7j3quyuhGhUfQXYyaN2V4PDcULaJmDpgncNVg1Z3fJIR9kGBo/i8vsC4/EhbF6sf7xKf65XY8kgtygQE+cYJfYFyGI/fitP8AvEg/rlD0S+zH8sx+K63ZqspK6dkVUA2vjYI2SXsZY2m4aesi5t2LkhvUIINwbEdq55Ib1+pdPqHglfa8o9lp442XLKQOcOLnAZuvrK4blYx6OgwuLCpqKmnlrmOcwPuREALF4tbUXIF9x14JME22qqVnNVzDUsBsJAemO/gVqNt8Mj2zxqKvosVooLU7YBHVF0ZbYkk7iNb+pcvUcFUkfaxZMWVpxl+3R5WTJJGyJr+bjj0B3uKvjlMWWCmccx6ckrjv8V1MnJ1VsYf37wa3xhxPqasjDNkcJwqfnq2ukxSS1uYp2mKLxe7pHwA71Fki18vJ6Z5YQ5nJf9yvZ7Dn4teaRz4aSH7vUuvlb+a3rceA7Vu8RrvLalps5kUTBFCxzr5WDQC/E9aFRVSTsjjayOGCLSOCMZWMHYOvtOpWI95DrWueorePHzukfF1mt9f5IfT/AMjadZXVspsNqNiMHGIYhJRgVVTkLKfnQdW3vqLWXKlmugWRNXzyYbT0Di0wU73yMAbrd9s1z4Bd0eCElG7OvloaU7V0mDy0xqKfBqGR8YlsfKiAZAdPekkWHUFp469+0WBYz5fDTZ6GBtRBPFA2MxnOG5OiBdpB3HqWudjmIZ6CUTZZ8PZkhmYLPDQbgE8QLkC/DRJiW0WIYjSOpZPJoIHuEkjKaBsQkdwLsu9VHV5I/wA/ng6yKuOF8oVBs/TUVMcPhqIYwwwtL3mzTzue2bNc3ve2ixqGGko6DFcUdWUtHVvxN9O2eopjUBjRd1mtAIBN95G4LS022GMUrafJJTulpg1sc74GulDQdGZ9+Xhbq0WJR4/X0M1U+MwyMq3ZpoZomyRPN73LTpoSbJZr1Y/zwdTQnCqrbXCp6Y01W99JOavm6Z0UUjxG+zg1wFrjfbiFqcHxKoxOHHpagQtyYPIxjYomxta3nGEABo7eOqwDtLiZxaPETJHz0MZhjaIgI42FpaWtaNALOKwaOvnoI6pkBaG1UBp5Mzb9AkE26joNUsy8iv8Ansdkw0GB4dhMLMSw2lbUUsdTUR1OHuqHVBfvu6xs33oAtay1dXDhzcA2odhzc1I2vpvJ3OYQ5rCX6a6jq8FrqLabEqCkip4/JpmQEugNRTsldCSb9AuGmuvesR+LV0lJW08kolbXStmnc8Xc97SSDfxKth5YtV/OjZbENidjNY2aQxxHDaoPeG5i0ZNTbj3LIFLhuEbE4jXYXVz4l7oWoJHPhEIpxcPu5tySTbQ7t65+hxCowySWWmLQ6WF8Dszb9F4s7xslosTqaGjrKSJzDBWsEcrHtzA2NwR1EHcVUc1kSVfk32MwsG02zjGxsAko6EloaOkTa+nFZ+JyNwOHHcVoqenNZJjUtI2SSJrxBGLus1pBALjpe24LQ021uLUlJTQMfTuNILQSyU7XyxNvfK15FwEkG0+JU9ZXTg08or5DLUQzQtkie6975DoLEmypr1Im/wAUxnyaHY7FpKSFobHLJLC2MBjwZSHEN3AOFzbt0VNbhcWzFHtBPZsgnkFFQOcAbxvAkc8X6oy0X7VpK/GazaCaiixKpiZHBeNsnNWEbXOudG8BwAGgFlk7T4vHXx4bh9LUvqaXDKcQtmcwt51/vnWOoG4C+tghXkTt/wA6o59BNZGyHlEsomspYoBVE2VSyAVCybKjZAIijZSyoAojZSyACiNlLIAKI2UsgAojZSxQWQBHcoAmAuoB4xZnemRDbC3UpZZNg3qJrIWUIBCyaygCoFshlT2UO9AV2UsnshbVWwIjZPZAtSwIonylDKUAqiayllSCoEJ7JSNVAKQepWRXDiOxKnZ54RkTLLJ42ZnG+4BKro9Iyes2WDR23JL+MCDTXyeX2BcniLbYrWH/AHiT5ZXV8ls0VPt3DJNIyJgglBc9waNw4lcpiDgcSrCDcGeQgj9IqHol9mP5ZjbjuQcEdb70bWA1VPOKwWZfrKY2ciNGN6lDvOgHcgKy03BB1G5HnH8WByIy7y7wTZ2dV0BXzhP5NG9yDzZTg33aJr24oCkvymxY66GcfnBWOc0E6XKrOaQ6aoLAX3va6V4OdHLaTLvsUX+cT1oLEsUEyhQC2UITKFAJY9SlkyiArkHRVVjbcrpOCrI6K2jLEspZPZSypBLKap7KWQCWUsnspZALY9SmU9RTKKAWx6ipZMoqBbKWTWUsgEspZPZBALY9Slj1JlEAtkLFOpZAJY9SlinsolgWxUsepMogABorI2636kvBXtFgAoyoBBUTILJqwKWTIIQWylkylkAtkLJyggFspZMoqBbFSyZRALZBMpZUgqiZRBYqBCeyBCASyaMdO/UoniHnIyD8Vc0dFnpVRGquYOgFk0EgEWNvFK0aEJ7bkAN6hBCEx0AUIUO5AQaDrCYgE9igCNusIAZG9iNgoNeCiAlhdI5wCL3W0G9V6uNt9ygAGlx7FY77XGQ3eU4AA3Kt5u6wVAgZYhB/BOBvSO1KhQIJkLKgiBTIWQWKdyiNkbILKpN6Sysf5xS2WkZYtlLI2UsqQFlLIqIAWUsjZRACylkVEALKWRUQAQsmQsgBZSyaylkAtlLJrIWQAspZGylkAFLI2UsgBZSyKlkBGi7gOsq+2qqYPtgV1lGaQLKWTWQssgFlEbKWVACFLI2UQClBMQhZUAQATKIAKWRspZAKoipZUgLKWRspZABAp7JSEAtgnj0eoooyFquj80dyiiwUIGpUUUQEISncoogGG9EjVRRAHc0pCoohSsi8lirmgC1hwUUQgHcVS3VxUUQDAdE96U7/ABUUQACAUUQDWQKiiABUUUVBU/zigootEIECooqCBQKKICKKKICKKKICKBRRABRRRAQqKKICI2UUQAUUUQEUUUQEUKiiAaP7oFdxUUWWUJUUUUBCECoogIooogAUCoogIQgoogCd6CiioIEbKKKgCIUUQEslKiiA/9k=',
  'walter_2': 'data:image/jpeg;base64,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',
};


const SEED_POSTS = {
  walter: [
    {
      img: 'walter_1',
      title: '"Mais que um negócio, uma família."',
      caption: `Negócios podem te trazer dinheiro, mas é família que te traz propósito.

Quando você constrói uma estrutura onde as pessoas se importam de verdade umas com as outras, o resultado vem como consequência.

Não troco isso por nada.

- Walter Galassini Naswaty

#empreendedorismo #lideranca #uoppartners #familia #negocios`,
      status: 'postado',
    },
    {
      img: 'walter_2',
      title: '"Confiança é a base de tudo."',
      caption: `Tudo o que construímos só se sustenta se houver confiança na base.

Confiança entre sócios. Confiança com o cliente. Confiança na sua própria capacidade de entregar.

Sem isso, qualquer estrutura cai com o primeiro vento.

- Walter Galassini Naswaty

#empreendedorismo #confianca #lideranca #uoppartners #mindset`,
      status: 'para-postar',
    },
  ],
  rogerio: [
    {
      img: 'rogerio_1',
      title: '"Organização é a garantia do sucesso."',
      caption: `Talento sem organização vira fogo de palha.

Quem consegue executar de forma consistente é quem entende que processo bate vontade todos os dias.

A diferença está em sustentar.

- Rogério Jones

#produtividade #disciplina #lideranca #uoppartners #organizacao`,
      status: 'postado',
    },
    {
      img: 'rogerio_2',
      title: '"Quem planeja, enxerga o futuro."',
      caption: `O futuro não é adivinhação, é construção.

Quem para pra planejar enxerga o caminho antes de andar nele — e por isso chega na frente.

Planejamento é o que separa o reativo do estratégico.

- Rogério Jones

#planejamento #estrategia #lideranca #uoppartners #mindset`,
      status: 'para-postar',
    },
  ],
  rudi: [
    {
      img: 'rudi_1',
      title: '"O meu resultado é o nosso resultado."',
      caption: `Líder de verdade não comemora sozinho.

Cada conquista individual é só uma parte de uma engrenagem maior — e quando você entende isso, joga pra time inteiro ganhar.

É assim que se constrói algo grande.

- Roderlei Rudy

#lideranca #equipe #resultado #uoppartners #cultura`,
      status: 'postado',
    },
    {
      img: 'rudi_2',
      title: '"Grandes resultados nascem em equipe."',
      caption: `Ninguém faz nada grande sozinho.

Quando você cerca-se de pessoas melhores que você em cada área, o teto sobe naturalmente — e o resultado deixa de ser seu, passa a ser de todos.

Aprenda a confiar e a delegar.

- Roderlei Rudy

#equipe #lideranca #resultados #uoppartners #mindset`,
      status: 'para-postar',
    },
  ],
  reinaldo: [
    {
      img: 'reinaldo_1',
      title: '"O certo é sempre o melhor."',
      caption: `O atalho cobra caro depois.

Fazer certo dá mais trabalho hoje, mas constrói uma base que ninguém derruba amanhã.

É essa a régua que eu uso pra tomar decisão.

- Reinaldo Costa

#integridade #lideranca #valores #uoppartners #disciplina`,
      status: 'postado',
    },
    {
      img: 'reinaldo_2',
      title: '"Excelência é um hábito, não um acaso."',
      caption: `Resultado de alto nível não acontece por sorte.

É a soma de pequenas decisões diárias — cada e-mail bem escrito, cada reunião preparada, cada detalhe que você não deixa passar.

Excelência é uma escolha que você faz todo dia.

- Reinaldo Costa

#excelencia #disciplina #lideranca #uoppartners #mindset`,
      status: 'para-postar',
    },
  ],
};


function GlobalStyles() {
  return (
    <style>{`
      :root {
        --ink-deep: ${COLORS.inkDeep};
        --ink-base: ${COLORS.inkBase};
        --ink-raised: ${COLORS.inkRaised};
        --ink-soft: ${COLORS.inkSoft};
        --ink-border: ${COLORS.inkBorder};
        --ink-border-soft: ${COLORS.inkBorderSoft};
        --ink-hover: ${COLORS.inkHover};
        --mist: ${COLORS.mist};
        --mist-dim: ${COLORS.mistDim};
        --mist-muted: ${COLORS.mistMuted};
        --brand-blue: ${COLORS.brandBlue};
        --brand-cyan: ${COLORS.brandCyan};
        --brand-mid: ${COLORS.brandMid};
        --brand-soft: ${COLORS.brandSoft};
        --brand-glow: ${COLORS.brandGlow};
        --cyan-soft: ${COLORS.cyanSoft};
        --danger: ${COLORS.danger};
        --warn: ${COLORS.warn};
        --success: ${COLORS.success};
        --brand-gradient: ${BRAND_GRADIENT};
        --brand-gradient-h: ${BRAND_GRADIENT_HORIZONTAL};
        --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
        --shadow-md: 0 4px 14px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.02) inset;
        --shadow-lg: 0 24px 60px -10px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03) inset;
        --shadow-glow: 0 0 0 1px rgba(1,102,252,0.25), 0 8px 30px rgba(1,102,252,0.15);
      }
      .app-root, .app-root * { box-sizing: border-box; }
      .app-root {
        font-family: 'Geist', system-ui, -apple-system, Segoe UI, sans-serif;
        font-size: 14px;
        color: var(--mist);
        background: var(--ink-deep);
        min-height: 100vh;
        line-height: 1.5;
        font-feature-settings: 'ss01' on, 'cv11' on;
        -webkit-font-smoothing: antialiased;
        letter-spacing: -0.005em;
      }
      .app-root::before {
        /* Subtle ambient gradient at the top for atmosphere */
        content: '';
        position: fixed;
        top: -300px; left: 50%;
        width: 1200px; height: 600px;
        margin-left: -600px;
        background: radial-gradient(closest-side, rgba(1,102,252,0.10), transparent);
        pointer-events: none;
        z-index: 0;
      }
      .mono { font-family: 'Geist Mono', ui-monospace, monospace; font-feature-settings: 'tnum' on; }
      .serif { font-family: 'Instrument Serif', Georgia, serif; }
      .app-root button { font-family: inherit; cursor: pointer; }
      .app-root input, .app-root textarea, .app-root select {
        font-family: inherit;
        background: var(--ink-base);
        color: var(--mist);
        border: 1px solid var(--ink-border);
        border-radius: 8px;
        padding: 10px 12px;
        outline: none;
        transition: border-color .15s, box-shadow .15s, background .15s;
        width: 100%;
        font-size: 13.5px;
      }
      .app-root input:hover, .app-root textarea:hover, .app-root select:hover {
        border-color: var(--ink-hover);
      }
      .app-root input:focus, .app-root textarea:focus, .app-root select:focus {
        border-color: var(--brand-blue);
        box-shadow: 0 0 0 3px var(--brand-glow);
        background: var(--ink-deep);
      }
      .app-root textarea { resize: vertical; min-height: 80px; line-height: 1.55; }
      .app-root ::placeholder { color: var(--mist-muted); }
      .app-root ::-webkit-scrollbar { width: 10px; height: 10px; }
      .app-root ::-webkit-scrollbar-track { background: transparent; }
      .app-root ::-webkit-scrollbar-thumb { background: var(--ink-border); border-radius: 5px; }
      .app-root ::-webkit-scrollbar-thumb:hover { background: var(--ink-hover); }

      .btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 9px 14px; border-radius: 8px;
        border: 1px solid var(--ink-border);
        font-weight: 500; font-size: 13px;
        transition: all .15s ease;
        background: var(--ink-soft); color: var(--mist);
        letter-spacing: -0.005em;
      }
      .btn:hover {
        background: var(--ink-hover);
        border-color: var(--ink-hover);
      }
      .btn-primary {
        background: var(--brand-gradient);
        color: #001020;
        border-color: transparent;
        font-weight: 600;
        box-shadow: 0 1px 0 rgba(255,255,255,0.2) inset, var(--shadow-sm);
      }
      .btn-primary:hover {
        background: var(--brand-gradient);
        box-shadow: 0 1px 0 rgba(255,255,255,0.2) inset, 0 4px 16px rgba(1,102,252,0.4);
        transform: translateY(-1px);
      }
      .btn-ghost { background: transparent; border-color: transparent; color: var(--mist-dim); }
      .btn-ghost:hover { color: var(--mist); background: var(--ink-soft); border-color: transparent; }
      .btn-danger { color: var(--danger); }
      .btn-danger:hover { background: rgba(239,100,100,0.08); border-color: rgba(239,100,100,0.2); }
      .btn-icon {
        padding: 7px; border-radius: 7px;
        background: transparent; border: 1px solid transparent;
        color: var(--mist-dim);
        transition: all .12s ease;
      }
      .btn-icon:hover { background: var(--ink-soft); color: var(--mist); }

      .card {
        background: var(--ink-raised);
        border: 1px solid var(--ink-border-soft);
        border-radius: 14px;
        box-shadow: var(--shadow-md);
      }
      .badge {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 3px 9px; border-radius: 999px;
        font-size: 11px; font-weight: 500;
        letter-spacing: 0.01em;
      }
      .badge-dot { width: 6px; height: 6px; border-radius: 50%; }

      .modal-backdrop {
        position: fixed; inset: 0; z-index: 1000;
        background: rgba(3, 5, 8, 0.72);
        backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        animation: fadeIn .15s ease;
      }
      .modal {
        background: var(--ink-base);
        border: 1px solid var(--ink-border);
        border-radius: 16px;
        width: 100%; max-width: 540px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: var(--shadow-lg);
        animation: slideUp .25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes spin { to { transform: rotate(360deg); } }
      .fade-in { animation: fadeIn .25s ease; }

      .tab-strip {
        display: flex; gap: 2px;
        border-bottom: 1px solid var(--ink-border-soft);
      }
      .tab {
        position: relative;
        padding: 14px 18px;
        font-size: 13.5px; font-weight: 500;
        color: var(--mist-dim);
        border: none; background: transparent;
        transition: color .15s;
        letter-spacing: -0.005em;
      }
      .tab:hover { color: var(--mist); }
      .tab.active { color: var(--mist); }
      .tab.active::after {
        content: ''; position: absolute; bottom: -1px; left: 14px; right: 14px;
        height: 2px;
        background: var(--brand-gradient-h);
        border-radius: 2px 2px 0 0;
      }

      .sidebar-item {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 12px; border-radius: 9px;
        font-size: 13.5px; color: var(--mist-dim);
        cursor: pointer; transition: all .15s;
        border: 1px solid transparent;
        font-weight: 500;
      }
      .sidebar-item:hover { background: var(--ink-soft); color: var(--mist); }
      .sidebar-item.active {
        background: var(--brand-soft);
        color: var(--mist);
        border-color: rgba(1,102,252,0.18);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
      }
      .sidebar-item.active .sidebar-avatar {
        background: var(--brand-gradient);
        color: #001020;
        font-weight: 700;
      }
      .sidebar-avatar {
        width: 28px; height: 28px; border-radius: 8px;
        background: var(--ink-soft); color: var(--mist-dim);
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 600;
        flex-shrink: 0;
        transition: all .15s;
        letter-spacing: -0.01em;
      }

      .section-pill-group {
        display: inline-flex; padding: 3px;
        background: var(--ink-base); border: 1px solid var(--ink-border-soft);
        border-radius: 10px;
      }
      .section-pill {
        padding: 7px 16px; border-radius: 7px;
        font-size: 13px; font-weight: 500;
        color: var(--mist-dim); background: transparent; border: none;
        display: inline-flex; align-items: center; gap: 8px;
        transition: all .15s;
        letter-spacing: -0.005em;
      }
      .section-pill:hover { color: var(--mist); }
      .section-pill.active {
        background: var(--ink-raised);
        color: var(--mist);
        box-shadow: 0 1px 0 var(--ink-border), 0 1px 4px rgba(0,0,0,0.3);
      }

      .empty {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 80px 24px;
        color: var(--mist-muted);
        text-align: center;
      }
      .empty-icon {
        width: 52px; height: 52px; border-radius: 14px;
        background: var(--ink-soft); border: 1px solid var(--ink-border-soft);
        display: flex; align-items: center; justify-content: center;
        color: var(--mist-dim);
        margin-bottom: 18px;
      }

      .item-card {
        padding: 14px 16px;
        background: var(--ink-raised);
        border: 1px solid var(--ink-border-soft);
        border-radius: 11px;
        transition: all .15s ease;
      }
      .item-card:hover {
        border-color: var(--ink-border);
        background: var(--ink-soft);
        transform: translateY(-1px);
      }

      .cal-grid {
        display: grid; grid-template-columns: repeat(7, 1fr);
        gap: 6px;
      }
      .cal-cell {
        min-height: 92px;
        background: var(--ink-raised);
        border: 1px solid var(--ink-border-soft);
        border-radius: 9px;
        padding: 8px;
        display: flex; flex-direction: column; gap: 4px;
        transition: all .15s;
        cursor: pointer;
      }
      .cal-cell:hover { border-color: var(--ink-border); background: var(--ink-soft); }
      .cal-cell.muted { opacity: 0.32; }
      .cal-cell.today {
        border-color: rgba(1,102,252,0.35);
        box-shadow: 0 0 0 1px rgba(1,102,252,0.15);
      }
      .cal-cell.today .cal-day-num {
        color: var(--brand-cyan);
        font-weight: 700;
      }
      .cal-cell.no-slot { cursor: default; opacity: 0.55; }
      .cal-day-num { font-size: 12.5px; color: var(--mist-dim); margin-bottom: 2px; font-weight: 500; }
      .cal-slot {
        font-size: 10.5px; padding: 2px 7px; border-radius: 5px;
        display: flex; align-items: center; gap: 4px;
        font-weight: 500;
        letter-spacing: 0.01em;
      }
      .cal-slot.estatico { background: rgba(1,102,252,0.10); color: var(--brand-blue); }
      .cal-slot.reels { background: rgba(245,179,66,0.10); color: var(--warn); }
      .cal-slot.done.estatico { background: rgba(1,102,252,0.22); }
      .cal-slot.done.reels { background: rgba(245,179,66,0.20); }

      /* Thumbnail clicável nos estáticos */
      .img-thumb { cursor: zoom-in; position: relative; }
      .img-thumb-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0);
        display: flex; align-items: center; justify-content: center;
        transition: background 0.18s ease;
        border-radius: inherit;
      }
      .img-thumb-overlay svg { opacity: 0; transition: opacity 0.18s ease; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6)); }
      .img-thumb:hover .img-thumb-overlay { background: rgba(0,0,0,0.38); }
      .img-thumb:hover .img-thumb-overlay svg { opacity: 1; }

      /* Preview lightbox */
      .img-preview-backdrop {
        position: fixed; inset: 0; z-index: 400;
        background: rgba(2,4,8,0.94);
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
        animation: fadeIn .18s ease;
      }
      .img-preview-inner {
        position: relative; display: flex; flex-direction: column;
        align-items: center; gap: 14px;
        max-width: min(92vw, 900px); max-height: 94vh;
      }
      .img-preview-img {
        max-width: 100%; max-height: 74vh;
        object-fit: contain;
        border-radius: 10px;
        box-shadow: 0 32px 96px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06);
      }
      .img-preview-bar {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; width: 100%;
        background: rgba(255,255,255,0.06);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 12px; padding: 10px 16px;
      }
      .img-preview-close {
        position: absolute; top: -14px; right: -14px;
        width: 32px; height: 32px; border-radius: 50%;
        background: rgba(255,255,255,0.13); border: 1px solid rgba(255,255,255,0.18);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; color: #fff; backdrop-filter: blur(8px);
        transition: background 0.15s;
      }
      .img-preview-close:hover { background: rgba(255,255,255,0.22); }
      @media (max-width: 768px) {
        .img-preview-img { max-height: 60vh; }
        .img-preview-bar { flex-wrap: wrap; gap: 8px; }
        .img-preview-bar .btn-primary { width: 100%; justify-content: center; }
      }

      .role-chip {
        padding: 3px 10px; border-radius: 999px;
        font-size: 11px; font-weight: 500;
        background: var(--ink-soft); color: var(--mist-dim);
        border: 1px solid var(--ink-border-soft);
      }

      .h-title {
        font-size: 24px;
        font-weight: 600;
        color: var(--mist);
        letter-spacing: -0.025em;
        line-height: 1.15;
      }
      .h-sub { font-size: 13px; color: var(--mist-dim); }
      .label {
        font-size: 11px;
        font-weight: 600;
        color: var(--mist-dim);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 7px;
        display: block;
      }

      .toast {
        position: fixed; bottom: 24px; right: 24px; z-index: 2000;
        background: var(--ink-raised); border: 1px solid var(--ink-border);
        border-radius: 11px; padding: 12px 16px;
        display: flex; align-items: center; gap: 10px;
        font-size: 13px;
        box-shadow: var(--shadow-lg);
        animation: slideUp .25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .toast.error { border-color: rgba(239,100,100,0.4); }
      .toast.success { border-color: rgba(1,102,252,0.35); }

      .gradient-text {
        background: var(--brand-gradient-h);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }

      /* layout helpers */
      .entity-header-box { padding: 28px 32px 0; }
      .tab-content { padding: 28px; }
      .filter-bar {
        display: flex; justify-content: space-between;
        align-items: center; margin-bottom: 18px;
        gap: 8px;
      }

      /* ===== MOBILE ===== */
      .hamburger-btn { display: none !important; }
      @media (max-width: 768px) {
        .hamburger-btn { display: flex !important; }
        .header-section-pills { display: none !important; }

        main { overflow-x: hidden; }

        .sidebar-drawer {
          position: fixed !important;
          left: 0; top: 0; bottom: 0;
          z-index: 200 !important;
          transform: translateX(-100%);
          transition: transform 0.26s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 6px 0 40px rgba(0,0,0,0.55);
        }
        .sidebar-drawer.open { transform: translateX(0); }
        .sidebar-overlay {
          position: fixed; inset: 0; z-index: 199;
          background: rgba(0,0,0,0.55);
          animation: fadeIn 0.2s ease;
        }
        .mobile-section-pills { display: flex !important; }

        .modal {
          max-width: calc(100vw - 16px) !important;
          max-height: 88vh !important;
          border-radius: 18px !important;
        }
        .modal-backdrop { padding: 8px; align-items: flex-end; }

        .tab-strip { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .tab-strip::-webkit-scrollbar { display: none; }
        .tab { white-space: nowrap; padding: 12px 14px; }

        .cal-grid { gap: 3px; }
        .cal-cell { min-height: 52px; padding: 4px 3px; min-width: 0; overflow: hidden; }
        .cal-slot { font-size: 8.5px; padding: 1px 3px; gap: 2px; min-width: 0; overflow: hidden; }
        .cal-day-num { font-size: 10.5px; }

        .h-title { font-size: 20px !important; }
        .toast { left: 12px; right: 12px; bottom: 12px; }

        /* padding compacto no mobile */
        .entity-header-box { padding: 16px 16px 0; }
        .tab-content { padding: 16px; }

        /* filter bar: quebra linha no mobile */
        .filter-bar { flex-wrap: wrap; row-gap: 8px; }
        .filter-bar > .btn-primary { width: 100%; justify-content: center; }
      }
    `}</style>
  );
}

/* ============================================================
   TOAST
============================================================ */
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`}>
      {toast.type === 'error' ? <AlertCircle size={16} color={COLORS.danger} /> : <CheckCircle2 size={16} color={COLORS.brandCyan} />}
      <span>{toast.msg}</span>
    </div>
  );
}

/* ============================================================
   ROLES — permissões por perfil de usuário
============================================================ */
const ROLES = [
  { id: 'geral',    label: 'Geral',    canAll: true },
  { id: 'criativo', label: 'Criativo', canRoteiros: true, canVideos: true },
  { id: 'estatico', label: 'Estático', canEstaticos: true },
];

/* ============================================================
   USER DISPLAY — mostra usuário logado + logout
============================================================ */
function UserDisplay({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const initial = (user.name || user.email || '?')[0].toUpperCase();
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-ghost" onClick={() => setOpen(!open)} style={{ padding: '7px 10px' }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--brand-soft)', color: 'var(--brand-cyan)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700,
        }}>
          {initial}
        </div>
        <span style={{ fontSize: 12.5 }}>{user.name || user.email}</span>
        <span style={{ fontSize: 11, color: 'var(--mist-muted)', marginLeft: 2 }}>· {user.role.label}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          background: 'var(--ink-raised)', border: '1px solid var(--ink-border)',
          borderRadius: 10, padding: 5, minWidth: 210, zIndex: 100,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}>
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 13, color: 'var(--mist)', fontWeight: 600 }}>{user.name || user.email}</div>
            <div style={{ fontSize: 11, color: 'var(--mist-muted)', marginTop: 2 }}>{user.email}</div>
            <div style={{
              marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--brand-soft)', color: 'var(--brand-cyan)',
              padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            }}>
              {user.role.label}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--ink-border-soft)', padding: 4 }}>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 10px',
                background: 'transparent', color: COLORS.danger,
                border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer',
              }}
            >
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   LOGIN SCREEN
============================================================ */
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const sc = window.supabaseClient;
    if (!sc) {
      setError('Supabase não configurado. Verifique as instruções de deploy.');
      setLoading(false);
      return;
    }
    const { data, error: authError } = await sc.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Email ou senha inválidos.');
      setLoading(false);
      return;
    }
    const { data: profile } = await sc.from('profiles').select('name, role').eq('id', data.user.id).maybeSingle();
    const userRole = ROLES.find(r => r.id === profile?.role) || ROLES[0];
    onLogin({
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || data.user.email.split('@')[0],
      role: userRole,
    });
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.inkDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <GlobalStyles />
      <style>{`
        .login-input {
          width: 100%; background: rgba(255,255,255,0.04);
          border: 1px solid ${COLORS.inkBorder}; border-radius: 10px;
          padding: 12px 14px; color: ${COLORS.mist}; font-size: 14px;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box; font-family: inherit;
        }
        .login-input::placeholder { color: ${COLORS.mistMuted}; }
        .login-input:focus {
          border-color: ${COLORS.brandBlue};
          box-shadow: 0 0 0 3px rgba(1,102,252,0.15);
        }
        .login-btn {
          width: 100%; padding: 13px;
          background: linear-gradient(90deg, #0166fc 0%, #009bed 50%, #1de4f0 100%);
          border: none; border-radius: 12px; color: #fff; font-size: 15px;
          font-weight: 600; cursor: pointer; letter-spacing: -0.01em;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 22px rgba(1,102,252,0.38); font-family: inherit;
        }
        .login-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 6px 28px rgba(1,102,252,0.48); }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
      `}</style>

      {/* orbs de fundo */}
      <div style={{ position: 'absolute', top: '-160px', left: '-160px', width: 620, height: 620, borderRadius: '50%', background: 'radial-gradient(circle, rgba(1,102,252,0.13) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-140px', right: '-120px', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,228,240,0.09) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* card */}
      <div style={{
        width: 'min(420px, calc(100vw - 32px))', padding: 'clamp(28px, 5vw, 44px) clamp(20px, 5vw, 40px) 32px',
        background: 'rgba(11,13,17,0.90)',
        backdropFilter: 'blur(24px)',
        borderRadius: 22,
        border: '1px solid rgba(34,39,50,0.9)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)',
        position: 'relative', zIndex: 1,
      }}>
        {/* branding */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <BBothLogo height={32} />
          <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(1,102,252,0.1)', border: '1px solid rgba(1,102,252,0.22)', borderRadius: 20, padding: '4px 12px' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.brandCyan, boxShadow: `0 0 7px ${COLORS.brandCyan}` }} />
            <span style={{ fontSize: 10.5, color: COLORS.brandCyan, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>B.SISTEM</span>
          </div>
          <div style={{ marginTop: 20, fontSize: 23, fontWeight: 700, color: COLORS.mist, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            Bem-vindo de volta
          </div>
          <div style={{ marginTop: 7, fontSize: 14, color: COLORS.mistDim }}>
            Entre com sua conta para acessar o sistema
          </div>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,100,100,0.08)', border: '1px solid rgba(239,100,100,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#ef9494', marginBottom: 18 }}>
              <AlertCircle size={14} color="#ef9494" />
              {error}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.mistDim, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7 }}>Email</label>
              <input className="login-input" type="email" value={email} required autoFocus onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.mistDim, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7 }}>Senha</label>
              <input className="login-input" type="password" value={password} required onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <button className="login-btn" type="submit" disabled={loading} style={{ marginTop: 24 }}>
            {loading ? 'Entrando...' : 'Entrar no B.SISTEM →'}
          </button>
        </form>

        {/* rodapé */}
        <div style={{ marginTop: 28, textAlign: 'center', fontSize: 11, color: COLORS.mistMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Be bold, be better
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HEADER
============================================================ */
function Header({ section, setSection, user, onLogout, onMenuToggle }) {
  return (
    <header style={{
      position: 'relative',
      zIndex: 5,
      borderBottom: '1px solid var(--ink-border-soft)',
      background: 'rgba(11, 13, 17, 0.85)',
      backdropFilter: 'blur(12px)',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="hamburger-btn btn btn-ghost" onClick={onMenuToggle} style={{ padding: 8 }}>
          <Menu size={18} />
        </button>
        <BBothLogo height={26} />
        <div style={{ width: 1, height: 22, background: 'var(--ink-border)' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{ fontSize: 13.5, color: 'var(--mist)', fontWeight: 600, letterSpacing: '-0.01em' }}>
            B.SISTEM
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--mist-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, marginTop: 3 }}>
            Be bold, be better
          </div>
        </div>
      </div>

      <div className="section-pill-group header-section-pills">
        <button className={`section-pill ${section === 'diretoria' ? 'active' : ''}`} onClick={() => setSection('diretoria')}>
          <Users size={14} /> Diretoria
        </button>
        <button className={`section-pill ${section === 'empresas' ? 'active' : ''}`} onClick={() => setSection('empresas')}>
          <Building2 size={14} /> Empresas
        </button>
      </div>

      <UserDisplay user={user} onLogout={onLogout} />
    </header>
  );
}

/* ============================================================
   B.BOTH LOGO (inline SVG)
============================================================ */
function BBothLogo({ height = 28, withTagline = false }) {
  return (
    <svg height={height} viewBox="0 0 340 100" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="bboth-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0166fc" />
          <stop offset="55%" stopColor="#009bed" />
          <stop offset="100%" stopColor="#1de4f0" />
        </linearGradient>
      </defs>
      <text
        x="0" y="62"
        fontFamily="Geist, sans-serif"
        fontSize="70"
        fontWeight="900"
        fill="url(#bboth-gradient)"
        letterSpacing="-2.5"
      >B.BOTH</text>
      {withTagline && (
        <>
          <circle cx="42" cy="88" r="3" fill="white" />
          <text x="54" y="92" fontFamily="Geist, sans-serif" fontSize="11" fontWeight="600" fill="white" letterSpacing="1.6">
            BE BOLD, BE BETTER
          </text>
          <circle cx="244" cy="88" r="3" fill="white" />
        </>
      )}
    </svg>
  );
}

/* ============================================================
   SIDEBAR
============================================================ */
function Sidebar({ section, setSection, entities, currentId, setCurrentId, onAddCompany, onRemoveCompany, role, mobileOpen, onClose }) {
  const directors = entities.directors || [];
  const group = entities.group || INITIAL_GROUP;
  const companies = entities.companies || [];

  function selectItem(id) {
    setCurrentId(id);
    if (onClose) onClose();
  }

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar-drawer${mobileOpen ? ' open' : ''}`} style={{
        width: 268, flexShrink: 0,
        borderRight: '1px solid var(--ink-border-soft)',
        background: 'var(--ink-base)',
        padding: '16px 16px 22px',
        overflowY: 'auto',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Pills de seção — só aparecem no mobile via CSS */}
        <div className="mobile-section-pills" style={{ display: 'none', marginBottom: 16, borderBottom: '1px solid var(--ink-border-soft)', paddingBottom: 14 }}>
          <div className="section-pill-group" style={{ width: '100%', justifyContent: 'center' }}>
            <button className={`section-pill ${section === 'diretoria' ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setSection('diretoria'); }}>
              <Users size={14} /> Diretoria
            </button>
            <button className={`section-pill ${section === 'empresas' ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setSection('empresas'); }}>
              <Building2 size={14} /> Empresas
            </button>
          </div>
        </div>
      {section === 'diretoria' && (
        <>
          <div style={{ fontSize: 10.5, color: 'var(--mist-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 10px 12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Diretores</span>
            <span style={{ color: 'var(--mist-muted)', fontWeight: 500 }}>{directors.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {directors.map(d => (
              <div
                key={d.id}
                className={`sidebar-item ${currentId === d.id ? 'active' : ''}`}
                onClick={() => selectItem(d.id)}
              >
                <div className="sidebar-avatar">{d.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}</div>
                <span>{d.name}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--mist-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '24px 10px 12px', fontWeight: 600 }}>Grupo</div>
          <div
            className={`sidebar-item ${currentId === group.id ? 'active' : ''}`}
            onClick={() => selectItem(group.id)}
          >
            <div className="sidebar-avatar">UO</div>
            <span>{group.name}</span>
          </div>
        </>
      )}

      {section === 'empresas' && (
        <>
          <div style={{ fontSize: 10.5, color: 'var(--mist-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 10px 12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Empresas <span style={{ marginLeft: 6, fontWeight: 500 }}>{companies.length}</span></span>
            {role.canAll && (
              <button className="btn-icon" onClick={onAddCompany} title="Adicionar empresa" style={{ padding: 4 }}>
                <Plus size={14} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {companies.map(c => (
              <div
                key={c.id}
                className={`sidebar-item ${currentId === c.id ? 'active' : ''}`}
                onClick={() => selectItem(c.id)}
                style={{ justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="sidebar-avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                  <span>{c.name}</span>
                </div>
                {role.canAll && (
                  <button
                    className="btn-icon"
                    onClick={(e) => { e.stopPropagation(); onRemoveCompany(c.id); }}
                    style={{ padding: 3, opacity: 0.6 }}
                    title="Remover"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            {role.canAll && (
              <button
                onClick={onAddCompany}
                style={{
                  marginTop: 8, padding: '10px 12px',
                  background: 'transparent',
                  border: '1px dashed var(--ink-border)',
                  borderRadius: 9, color: 'var(--mist-dim)',
                  fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-blue)'; e.currentTarget.style.color = 'var(--brand-cyan)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ink-border)'; e.currentTarget.style.color = 'var(--mist-dim)'; }}
              >
                <Plus size={14} /> Adicionar empresa
              </button>
            )}
          </div>
        </>
      )}
      </aside>
    </>
  );
}

/* ============================================================
   ENTITY HEADER + TABS
============================================================ */
function EntityHeader({ entity, activeTab, setActiveTab, tabs }) {
  const typeLabel = entity.type === 'director' ? 'Diretor' : entity.type === 'group' ? 'Grupo' : 'Empresa';
  return (
    <div className="entity-header-box" style={{ borderBottom: '1px solid var(--ink-border-soft)', position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--brand-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700,
            color: '#001020',
            letterSpacing: '-0.02em',
            boxShadow: '0 4px 14px rgba(1,102,252,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}>
            {entity.type === 'group' ? 'UO' :
             entity.type === 'company' ? entity.name.slice(0, 2).toUpperCase() :
             entity.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="h-title">{entity.name}</h1>
            <div className="h-sub" style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--mist-muted)'
              }}>{typeLabel}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-border)' }}></span>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--mist-muted)' }}>@{entity.id}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tab-strip">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <t.icon size={14} strokeWidth={2} />
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   STATUS BADGE
============================================================ */
function StatusBadge({ status }) {
  const map = {
    'para-gravar': { color: COLORS.warn, bg: 'rgba(245,179,66,0.10)', label: 'Para gravar' },
    'gravado': { color: COLORS.brandCyan, bg: 'rgba(29,228,240,0.14)', label: 'Gravado' },
    'para-postar': { color: COLORS.warn, bg: 'rgba(245,179,66,0.10)', label: 'Para postar' },
    'postado': { color: COLORS.brandCyan, bg: 'rgba(29,228,240,0.14)', label: 'Postado' },
  };
  const s = map[status] || map['para-gravar'];
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      <span className="badge-dot" style={{ background: s.color }}></span>
      {s.label}
    </span>
  );
}

/* ============================================================
   ROTEIROS TAB
============================================================ */
function RoteirosTab({ entityId, role, showToast }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const canEdit = role.canAll || role.canRoteiros;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await storage.getJSON(K.roteiros(entityId), []);
      setItems(data);
      setLoading(false);
    })();
  }, [entityId]);

  async function saveItems(newItems) {
    setItems(newItems);
    await storage.set(K.roteiros(entityId), newItems);
  }

  async function handleSave(data) {
    if (editing) {
      const newItems = items.map(i => i.id === editing.id ? { ...i, ...data } : i);
      await saveItems(newItems);
      showToast('success', 'Roteiro atualizado');
    } else {
      const item = { id: uid(), ...data, createdAt: Date.now() };
      await saveItems([item, ...items]);
      showToast('success', 'Roteiro adicionado');
    }
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    const item = items.find(i => i.id === id);
    if (item?.pdfKey) await storage.delete(K.pdf(item.pdfKey));
    await saveItems(items.filter(i => i.id !== id));
    showToast('success', 'Roteiro removido');
  }

  async function handleDownload(item) {
    if (!item.pdfKey) return;
    const data = await storage.get(K.pdf(item.pdfKey));
    if (data) downloadBase64(data, item.pdfFilename || `${item.title}.pdf`);
  }

  async function toggleStatus(item) {
    if (!canEdit) return;
    const newStatus = item.status === 'gravado' ? 'para-gravar' : 'gravado';
    await saveItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
  }

  const filtered = items.filter(i => filter === 'all' || i.status === filter);

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todos', count: items.length },
            { id: 'para-gravar', label: 'Para gravar', count: items.filter(i => i.status === 'para-gravar').length },
            { id: 'gravado', label: 'Gravado', count: items.filter(i => i.status === 'gravado').length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="btn"
              style={{
                background: filter === f.id ? 'var(--ink-raised)' : 'transparent',
                borderColor: filter === f.id ? 'var(--ink-border)' : 'transparent',
                color: filter === f.id ? 'var(--mist)' : 'var(--mist-dim)',
              }}
            >
              {f.label}
              <span style={{ fontSize: 11, color: 'var(--mist-muted)', marginLeft: 4 }}>{f.count}</span>
            </button>
          ))}
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={15} /> Novo roteiro
          </button>
        )}
      </div>

      {loading ? null : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><FileText size={20} /></div>
          <div style={{ fontSize: 14, color: 'var(--mist-dim)', marginBottom: 6 }}>Nenhum roteiro {filter === 'all' ? 'ainda' : `como "${filter === 'para-gravar' ? 'para gravar' : 'gravado'}"`}</div>
          {canEdit && filter === 'all' && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Adicionar o primeiro
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(item => (
            <div key={item.id} className="item-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => toggleStatus(item)}
                      style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex' }}
                      disabled={!canEdit}
                      title={canEdit ? 'Alternar status' : ''}
                    >
                      {item.status === 'gravado' ?
                        <CheckCircle2 size={18} color={COLORS.brandCyan} /> :
                        <Circle size={18} color={COLORS.mistMuted} />
                      }
                    </button>
                    <div style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--mist)' }}>{item.title}</div>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.description && (
                    <div style={{ fontSize: 13, color: 'var(--mist-dim)', marginLeft: 28, marginBottom: 8 }}>{item.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginLeft: 28, alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.pdfKey && (
                      <button onClick={() => handleDownload(item)} className="btn" style={{ padding: '5px 10px', fontSize: 12 }}>
                        <FileText size={12} /> {item.pdfFilename} <Download size={11} style={{ opacity: 0.6 }} />
                      </button>
                    )}
                    <span className="mono" style={{ fontSize: 11, color: 'var(--mist-muted)' }}>
                      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button className="btn-icon" onClick={() => { setEditing(item); setModalOpen(true); }} title="Editar"><Pencil size={14} /></button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(item.id)} title="Remover"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <RoteiroModal
          item={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function RoteiroModal({ item, onClose, onSave, showToast }) {
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [status, setStatus] = useState(item?.status || 'para-gravar');
  const [pdfFilename, setPdfFilename] = useState(item?.pdfFilename || '');
  const [pdfKey, setPdfKey] = useState(item?.pdfKey || null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast('error', 'PDF muito grande (máx 4MB)');
      return;
    }
    setUploading(true);
    try {
      const b64 = await fileToBase64(file);
      const key = uid();
      await storage.set(K.pdf(key), b64);
      if (pdfKey) await storage.delete(K.pdf(pdfKey));
      setPdfKey(key);
      setPdfFilename(file.name);
    } catch {
      showToast('error', 'Erro ao salvar PDF');
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!title.trim()) { showToast('error', 'Título é obrigatório'); return; }
    onSave({ title: title.trim(), description: description.trim(), status, pdfKey, pdfFilename });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{item ? 'Editar roteiro' : 'Novo roteiro'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Título</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Roteiro sobre prospecção" autoFocus />
          </div>
          <div>
            <label className="label">Descrição (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Observações, pauta, etc." />
          </div>
          <div>
            <label className="label">Status</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ id: 'para-gravar', label: 'Para gravar' }, { id: 'gravado', label: 'Gravado' }].map(s => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  className="btn"
                  style={{
                    flex: 1, justifyContent: 'center',
                    background: status === s.id ? 'var(--brand-soft)' : 'transparent',
                    color: status === s.id ? 'var(--brand-cyan)' : 'var(--mist-dim)',
                    borderColor: status === s.id ? 'rgba(1,102,252,0.22)' : 'var(--ink-border)',
                  }}
                >{s.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">PDF do roteiro (opcional, máx 4MB)</label>
            <input type="file" accept="application/pdf" ref={fileRef} onChange={handleFile} style={{ display: 'none' }} />
            {pdfFilename ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--ink-soft)', borderRadius: 8, border: '1px solid var(--ink-border-soft)' }}>
                <FileText size={16} color={COLORS.brandCyan} />
                <span style={{ flex: 1, fontSize: 13 }}>{pdfFilename}</span>
                <button className="btn-icon" onClick={() => fileRef.current?.click()}><Edit3 size={13} /></button>
                <button className="btn-icon btn-danger" onClick={async () => {
                  if (pdfKey) await storage.delete(K.pdf(pdfKey));
                  setPdfKey(null); setPdfFilename('');
                }}><Trash2 size={13} /></button>
              </div>
            ) : (
              <button className="btn" onClick={() => fileRef.current?.click()} style={{ width: '100%', justifyContent: 'center', padding: '14px' }} disabled={uploading}>
                {uploading ? 'Salvando...' : (<><FileUp size={15} /> Anexar PDF</>)}
              </button>
            )}
          </div>
        </div>
        <div style={{ padding: 16, borderTop: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>{item ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ESTÁTICOS TAB
============================================================ */
function EstaticosTab({ entityId, role, showToast }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgCache, setImgCache] = useState({});
  const [previewItem, setPreviewItem] = useState(null);

  const canEdit = role.canAll || role.canEstaticos;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await storage.getJSON(K.estaticos(entityId), []);
      setItems(data);
      const cache = {};
      for (const it of data) {
        if (it.imageKey) {
          const t = await storage.get(K.image(it.imageKey));
          if (t) cache[it.imageKey] = t;
        }
      }
      setImgCache(cache);
      setLoading(false);
    })();
  }, [entityId]);

  async function saveItems(newItems) {
    setItems(newItems);
    await storage.set(K.estaticos(entityId), newItems);
  }

  async function handleSave(data, imageBase64) {
    let imageKey = data.imageKey;
    if (imageBase64) {
      imageKey = uid();
      await storage.set(K.image(imageKey), imageBase64);
      setImgCache(c => ({ ...c, [imageKey]: imageBase64 }));
    }
    if (editing) {
      if (editing.imageKey && imageKey !== editing.imageKey) await storage.delete(K.image(editing.imageKey));
      const newItems = items.map(i => i.id === editing.id ? { ...i, ...data, imageKey } : i);
      await saveItems(newItems);
      showToast('success', 'Estático atualizado');
    } else {
      const item = { id: uid(), ...data, imageKey, createdAt: Date.now() };
      await saveItems([item, ...items]);
      showToast('success', 'Estático adicionado');
    }
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    const item = items.find(i => i.id === id);
    if (item?.imageKey) await storage.delete(K.image(item.imageKey));
    await saveItems(items.filter(i => i.id !== id));
    showToast('success', 'Estático removido');
  }

  async function toggleStatus(item) {
    if (!canEdit) return;
    const newStatus = item.status === 'postado' ? 'para-postar' : 'postado';
    await saveItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
  }

  async function handleDownloadImage(item) {
    if (!item.imageKey) return;
    const data = imgCache[item.imageKey] || await storage.get(K.image(item.imageKey));
    if (!data) { showToast('error', 'Imagem não encontrada'); return; }
    const ext = data.startsWith('data:image/png') ? 'png'
               : data.startsWith('data:image/webp') ? 'webp' : 'jpg';
    downloadBase64(data, `${slugify(item.title) || item.id}.${ext}`);
  }

  const filtered = items.filter(i => filter === 'all' || i.status === filter);

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todos', count: items.length },
            { id: 'para-postar', label: 'Para postar', count: items.filter(i => i.status === 'para-postar').length },
            { id: 'postado', label: 'Postado', count: items.filter(i => i.status === 'postado').length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="btn"
              style={{
                background: filter === f.id ? 'var(--ink-raised)' : 'transparent',
                borderColor: filter === f.id ? 'var(--ink-border)' : 'transparent',
                color: filter === f.id ? 'var(--mist)' : 'var(--mist-dim)',
              }}
            >
              {f.label}
              <span style={{ fontSize: 11, color: 'var(--mist-muted)', marginLeft: 4 }}>{f.count}</span>
            </button>
          ))}
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={15} /> Novo estático
          </button>
        )}
      </div>

      {loading ? null : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><ImageIcon size={20} /></div>
          <div style={{ fontSize: 14, color: 'var(--mist-dim)', marginBottom: 6 }}>Nenhum estático {filter === 'all' ? 'ainda' : 'nessa categoria'}</div>
          {canEdit && filter === 'all' && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Adicionar o primeiro
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(item => (
            <div key={item.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div
                className={item.imageKey && imgCache[item.imageKey] ? 'img-thumb' : ''}
                onClick={() => item.imageKey && imgCache[item.imageKey] && setPreviewItem(item)}
                style={{
                  aspectRatio: '1/1',
                  background: item.imageKey && imgCache[item.imageKey]
                    ? `url(${imgCache[item.imageKey]}) center/cover`
                    : 'linear-gradient(135deg, var(--ink-soft) 0%, var(--ink-base) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative'
                }}
              >
                {!item.imageKey && (
                  <div style={{ color: 'var(--mist-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <ImageIcon size={28} strokeWidth={1.5} />
                    <span style={{ fontSize: 11 }}>Sem imagem</span>
                  </div>
                )}
                {item.imageKey && imgCache[item.imageKey] && (
                  <div className="img-thumb-overlay">
                    <ZoomIn size={32} color="#fff" />
                  </div>
                )}
                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                  <span className="badge" style={{
                    background: 'rgba(1,102,252,0.92)',
                    color: '#ffffff', fontWeight: 600, backdropFilter: 'blur(4px)',
                    letterSpacing: '0.04em', fontSize: 10.5
                  }}>ESTÁTICO</span>
                </div>
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <button
                    onClick={() => toggleStatus(item)}
                    style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex', marginTop: 1 }}
                    disabled={!canEdit}
                  >
                    {item.status === 'postado' ?
                      <CheckCircle2 size={16} color={COLORS.brandCyan} /> :
                      <Circle size={16} color={COLORS.mistMuted} />
                    }
                  </button>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--mist)' }}>{item.title}</div>
                </div>
                {item.description && (
                  <div style={{ fontSize: 12.5, color: 'var(--mist-dim)', lineHeight: 1.45 }}>{item.description}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.imageKey && imgCache[item.imageKey] && (
                      <button
                        className="btn"
                        style={{ padding: '4px 9px', fontSize: 11.5 }}
                        onClick={() => handleDownloadImage(item)}
                        title="Baixar imagem original"
                      >
                        <Download size={11} /> Baixar
                      </button>
                    )}
                    {item.designLink && (
                      <a href={item.designLink} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '4px 9px', fontSize: 11.5, textDecoration: 'none' }}>
                        <LinkIcon size={11} /> Design
                      </a>
                    )}
                    {item.scheduledDate && (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--mist-muted)' }}>
                        {parseLocalDate(item.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button className="btn-icon" onClick={() => { setEditing(item); setModalOpen(true); }}><Pencil size={13} /></button>
                      <button className="btn-icon btn-danger" onClick={() => handleDelete(item.id)}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <EstaticoModal
          item={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
          existingImage={editing?.imageKey ? imgCache[editing.imageKey] : null}
          showToast={showToast}
        />
      )}

      {previewItem && imgCache[previewItem.imageKey] && (
        <ImagePreviewModal
          item={previewItem}
          imgSrc={imgCache[previewItem.imageKey]}
          onClose={() => setPreviewItem(null)}
          onDownload={() => handleDownloadImage(previewItem)}
        />
      )}
    </div>
  );
}

/* ============================================================
   IMAGE PREVIEW MODAL
============================================================ */
function ImagePreviewModal({ item, imgSrc, onClose, onDownload }) {
  useEffect(() => {
    const handle = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <div className="img-preview-backdrop" onClick={onClose}>
      <div className="img-preview-inner" onClick={e => e.stopPropagation()}>
        <button className="img-preview-close" onClick={onClose}>
          <X size={16} />
        </button>

        <img className="img-preview-img" src={imgSrc} alt={item.title} />

        <div className="img-preview-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <StatusBadge status={item.status} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.title}
            </span>
            {item.scheduledDate && (
              <span className="mono" style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
                {parseLocalDate(item.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <button className="btn btn-primary" onClick={onDownload} style={{ flexShrink: 0, gap: 7 }}>
            <Download size={14} /> Baixar original
          </button>
        </div>
      </div>
    </div>
  );
}

function EstaticoModal({ item, onClose, onSave, existingImage, showToast }) {
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [status, setStatus] = useState(item?.status || 'para-postar');
  const [designLink, setDesignLink] = useState(item?.designLink || '');
  const [scheduledDate, setScheduledDate] = useState(item?.scheduledDate?.slice(0, 10) || '');
  const [imgPreview, setImgPreview] = useState(existingImage || null);
  const [imgBase64, setImgBase64] = useState(null);
  const imgRef = useRef(null);

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3.5 * 1024 * 1024) {
      showToast('error', 'Imagem muito grande (máx 3.5MB)');
      return;
    }
    const b64 = await fileToBase64(file);
    setImgPreview(b64);
    setImgBase64(b64);
  }

  function submit() {
    if (!title.trim()) { showToast('error', 'Título é obrigatório'); return; }
    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      designLink: designLink.trim(),
      scheduledDate: scheduledDate || null,
      imageKey: item?.imageKey,
    }, imgBase64);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{item ? 'Editar estático' : 'Novo estático'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Título</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Legenda / observações (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="label">Status</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ id: 'para-postar', label: 'Para postar' }, { id: 'postado', label: 'Postado' }].map(s => (
                  <button
                    key={s.id} onClick={() => setStatus(s.id)}
                    className="btn"
                    style={{
                      flex: 1, justifyContent: 'center',
                      background: status === s.id ? 'var(--brand-soft)' : 'transparent',
                      color: status === s.id ? 'var(--brand-cyan)' : 'var(--mist-dim)',
                      borderColor: status === s.id ? 'rgba(1,102,252,0.22)' : 'var(--ink-border)',
                    }}
                  >{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Data agendada</label>
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Link do design (Canva, Figma, Drive...)</label>
            <input value={designLink} onChange={e => setDesignLink(e.target.value)} placeholder="Opcional — fonte editável" />
          </div>
          <div>
            <label className="label">Imagem do estático (máx 3.5MB)</label>
            <input type="file" accept="image/*" ref={imgRef} onChange={handleImage} style={{ display: 'none' }} />
            {imgPreview ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--ink-border-soft)' }}>
                <img src={imgPreview} alt="" style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'contain', background: 'var(--ink-deep)' }} />
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                  <button onClick={() => imgRef.current?.click()} className="btn" style={{ padding: '5px 9px', fontSize: 11 }}>
                    <Edit3 size={12} /> Trocar
                  </button>
                  <button
                    onClick={() => { setImgPreview(null); setImgBase64(null); }}
                    className="btn"
                    style={{ padding: '5px 9px' }}
                  ><Trash2 size={12} /></button>
                </div>
              </div>
            ) : (
              <button className="btn" onClick={() => imgRef.current?.click()} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                <Upload size={15} /> Anexar imagem
              </button>
            )}
          </div>
        </div>
        <div style={{ padding: 16, borderTop: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>{item ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DRIVE IMPORT MODAL
============================================================ */
function DriveImportModal({ allEntities, onClose, onDone, showToast }) {
  const [folderUrl, setFolderUrl] = useState(
    () => window.localStorage.getItem('drive:folderUrl') || ''
  );
  const [step, setStep] = useState('input'); // input | loading | preview | importing
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  function extractFolderId(url) {
    const s = url.trim();
    const m1 = s.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
    return null;
  }

  function parseFileName(name) {
    const clean = name.replace(/\.[^/.]+$/, ''); // remove extensão
    const m = clean.match(/^(.+?)\s+(\d{1,2})\/(\d{1,2})$/);
    if (!m) return null;
    const dirName = m[1].trim();
    const day = parseInt(m[2], 10);
    const month = parseInt(m[3], 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    const year = new Date().getFullYear();
    const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return { dirName, date };
  }

  function matchEntity(dirName) {
    const lower = dirName.toLowerCase().trim();
    // 1. Nome completo exato
    let e = allEntities.find(en => en.name.toLowerCase() === lower);
    if (e) return e;
    // 2. Primeiro nome da entidade == nome parseado
    e = allEntities.find(en => en.name.toLowerCase().split(' ')[0] === lower);
    if (e) return e;
    // 3. Nome parseado começa com o primeiro nome da entidade
    e = allEntities.find(en => lower.startsWith(en.name.toLowerCase().split(' ')[0]));
    if (e) return e;
    return null;
  }

  async function getAccessToken() {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services ainda não carregou. Aguarde um instante e tente de novo.'));
        return;
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (resp) => {
          if (resp.error) reject(new Error(resp.error_description || resp.error));
          else resolve(resp.access_token);
        },
      });
      client.requestAccessToken({ prompt: '' });
    });
  }

  async function handleFetch() {
    const folderId = extractFolderId(folderUrl);
    if (!folderId) { setError('URL da pasta inválida. Cole o link completo do Google Drive.'); return; }
    window.localStorage.setItem('drive:folderUrl', folderUrl);
    setError('');
    setStep('loading');
    let token;
    try {
      token = await getAccessToken();
    } catch (err) {
      setError(err.message);
      setStep('input');
      return;
    }
    try {
      const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
      const fields = encodeURIComponent('files(id,name,webViewLink,mimeType,createdTime)');
      const resp = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=200&orderBy=name`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || 'Erro ao acessar a pasta');
      const files = (data.files || []);
      const parsed = files.map(f => {
        const p = parseFileName(f.name);
        const entity = p ? matchEntity(p.dirName) : null;
        return { file: f, dirName: p?.dirName || null, date: p?.date || null, entity, selected: !!(entity && p) };
      });
      setRows(parsed);
      setStep('preview');
    } catch (err) {
      setError(err.message);
      setStep('input');
    }
  }

  async function handleImport() {
    const toImport = rows.filter(r => r.selected && r.entity);
    if (!toImport.length) { showToast('error', 'Nada selecionado'); return; }
    setStep('importing');
    const byEntity = {};
    for (const r of toImport) {
      if (!byEntity[r.entity.id]) byEntity[r.entity.id] = [];
      byEntity[r.entity.id].push(r);
    }
    let total = 0;
    for (const [eid, items] of Object.entries(byEntity)) {
      const existing = await storage.getJSON(K.videos(eid), []);
      const existingLinks = new Set(existing.map(v => v.driveLink).filter(Boolean));
      const newVideos = items
        .filter(r => !existingLinks.has(r.file.webViewLink))
        .map(r => ({
          id: uid(),
          title: r.file.name.replace(/\.[^/.]+$/, ''),
          description: '',
          status: 'para-postar',
          driveLink: r.file.webViewLink,
          scheduledDate: r.date,
          thumbKey: null,
          createdAt: Date.now(),
        }));
      if (newVideos.length) {
        await storage.set(K.videos(eid), [...newVideos, ...existing]);
        total += newVideos.length;
      }
    }
    showToast('success', `${total} vídeo${total !== 1 ? 's' : ''} importado${total !== 1 ? 's' : ''}`);
    onDone();
  }

  function toggleRow(idx) {
    setRows(r => r.map((row, i) => i === idx ? { ...row, selected: !row.selected } : row));
  }

  const selectedCount = rows.filter(r => r.selected).length;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Importar do Google Drive</div>
            <div style={{ fontSize: 12, color: 'var(--mist-dim)', marginTop: 2 }}>Detecta automaticamente diretor e data pelo nome do arquivo</div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Step: input */}
        {step === 'input' && (
          <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'rgba(1,102,252,0.07)', border: '1px solid rgba(1,102,252,0.18)', borderRadius: 10, padding: '12px 14px', fontSize: 12.5, color: 'var(--mist-dim)', lineHeight: 1.55 }}>
              Nomeie os arquivos como{' '}
              <span style={{ color: COLORS.brandCyan, fontFamily: 'var(--mono)', fontWeight: 600 }}>Nome DD/MM</span>
              {' '}para que o sistema identifique o diretor e a data automaticamente.{' '}
              <span style={{ color: 'var(--mist-muted)' }}>Ex: <code style={{ fontFamily: 'var(--mono)' }}>Walter 25/05.mp4</code>, <code style={{ fontFamily: 'var(--mono)' }}>Rogério 12/06</code></span>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mist-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>Link da pasta do Drive</div>
              <input
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--ink-border)', borderRadius: 10, padding: '11px 13px', color: 'var(--mist)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                placeholder="https://drive.google.com/drive/folders/..."
                value={folderUrl}
                onChange={e => setFolderUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetch()}
                autoFocus
              />
            </div>
            {error && <div style={{ fontSize: 12.5, color: '#f56565', background: 'rgba(245,101,101,0.08)', padding: '8px 12px', borderRadius: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleFetch} disabled={!folderUrl.trim()}>
                <LinkIcon size={14} /> Conectar ao Drive
              </button>
            </div>
          </div>
        )}

        {/* Step: loading */}
        {(step === 'loading' || step === 'importing') && (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--mist-dim)', fontSize: 13 }}>
            <div style={{ width: 28, height: 28, border: '3px solid var(--ink-border)', borderTopColor: COLORS.brandBlue, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
            {step === 'loading' ? 'Listando arquivos do Drive…' : 'Importando vídeos…'}
          </div>
        )}

        {/* Step: preview */}
        {step === 'preview' && (
          <>
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--ink-border-soft)', fontSize: 12.5, color: 'var(--mist-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{rows.length} arquivo{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''}</span>
              <span style={{ color: selectedCount ? COLORS.brandCyan : 'var(--mist-muted)' }}>{selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {rows.length === 0 ? (
                <div style={{ padding: 36, textAlign: 'center', color: 'var(--mist-muted)', fontSize: 13 }}>
                  Pasta vazia ou nenhum arquivo no formato <code style={{ fontFamily: 'var(--mono)' }}>Nome DD/MM</code>
                </div>
              ) : rows.map((r, i) => (
                <div
                  key={r.file.id}
                  onClick={() => r.entity && toggleRow(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
                    background: r.selected ? 'rgba(1,102,252,0.06)' : 'transparent',
                    borderBottom: '1px solid var(--ink-border-soft)',
                    cursor: r.entity ? 'pointer' : 'not-allowed',
                    opacity: r.entity ? 1 : 0.4,
                    transition: 'background 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={r.selected}
                    disabled={!r.entity}
                    onChange={() => toggleRow(i)}
                    onClick={e => e.stopPropagation()}
                    style={{ accentColor: '#0166fc', flexShrink: 0, width: 15, height: 15 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--mist)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.file.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--mist-dim)', marginTop: 2 }}>
                      {r.entity
                        ? <><span style={{ color: COLORS.brandCyan }}>{r.entity.name}</span> · {r.date ? parseLocalDate(r.date).toLocaleDateString('pt-BR') : '—'}</>
                        : 'Nome não reconhecido — não corresponde a nenhum diretor/empresa'
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--ink-border-soft)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => { setStep('input'); setError(''); }}>Voltar</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={selectedCount === 0}>
                <Download size={14} /> Importar {selectedCount > 0 ? `${selectedCount} vídeo${selectedCount !== 1 ? 's' : ''}` : ''}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

/* ============================================================
   VIDEOS TAB
============================================================ */
function VideosTab({ entityId, role, showToast, allEntities }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [thumbCache, setThumbCache] = useState({});
  const [driveOpen, setDriveOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const canEdit = role.canAll || role.canVideos;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await storage.getJSON(K.videos(entityId), []);
      setItems(data);
      // Preload thumbnails
      const cache = {};
      for (const it of data) {
        if (it.thumbKey) {
          const t = await storage.get(K.thumb(it.thumbKey));
          if (t) cache[it.thumbKey] = t;
        }
      }
      setThumbCache(cache);
      setLoading(false);
    })();
  }, [entityId, reloadKey]);

  async function saveItems(newItems) {
    setItems(newItems);
    await storage.set(K.videos(entityId), newItems);
  }

  async function handleSave(data, thumbBase64) {
    let thumbKey = data.thumbKey;
    if (thumbBase64) {
      thumbKey = uid();
      await storage.set(K.thumb(thumbKey), thumbBase64);
      setThumbCache(c => ({ ...c, [thumbKey]: thumbBase64 }));
    }
    if (editing) {
      if (editing.thumbKey && thumbKey !== editing.thumbKey) await storage.delete(K.thumb(editing.thumbKey));
      const newItems = items.map(i => i.id === editing.id ? { ...i, ...data, thumbKey } : i);
      await saveItems(newItems);
      showToast('success', 'Vídeo atualizado');
    } else {
      const item = { id: uid(), ...data, thumbKey, createdAt: Date.now() };
      await saveItems([item, ...items]);
      showToast('success', 'Vídeo adicionado');
    }
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    const item = items.find(i => i.id === id);
    if (item?.thumbKey) await storage.delete(K.thumb(item.thumbKey));
    await saveItems(items.filter(i => i.id !== id));
    showToast('success', 'Vídeo removido');
  }

  async function toggleStatus(item) {
    if (!canEdit) return;
    const newStatus = item.status === 'postado' ? 'para-postar' : 'postado';
    await saveItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
  }

  const filtered = items.filter(i => filter === 'all' || i.status === filter);

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Todos', count: items.length },
            { id: 'para-postar', label: 'Para postar', count: items.filter(i => i.status === 'para-postar').length },
            { id: 'postado', label: 'Postado', count: items.filter(i => i.status === 'postado').length },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="btn"
              style={{
                background: filter === f.id ? 'var(--ink-raised)' : 'transparent',
                borderColor: filter === f.id ? 'var(--ink-border)' : 'transparent',
                color: filter === f.id ? 'var(--mist)' : 'var(--mist-dim)',
              }}
            >
              {f.label}
              <span style={{ fontSize: 11, color: 'var(--mist-muted)', marginLeft: 4 }}>{f.count}</span>
            </button>
          ))}
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setDriveOpen(true)} title="Importar vídeos de uma pasta do Google Drive">
              <Download size={15} /> Importar do Drive
            </button>
            <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
              <Plus size={15} /> Novo vídeo
            </button>
          </div>
        )}
      </div>

      {loading ? null : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><Video size={20} /></div>
          <div style={{ fontSize: 14, color: 'var(--mist-dim)', marginBottom: 6 }}>Nenhum vídeo {filter === 'all' ? 'ainda' : 'nessa categoria'}</div>
          {canEdit && filter === 'all' && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModalOpen(true)}>
              <Plus size={14} /> Adicionar o primeiro
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(item => (
            <div key={item.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                aspectRatio: '16/9',
                background: item.thumbKey && thumbCache[item.thumbKey]
                  ? `url(${thumbCache[item.thumbKey]}) center/cover`
                  : 'linear-gradient(135deg, var(--ink-soft) 0%, var(--ink-base) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative'
              }}>
                {!item.thumbKey && (
                  <div style={{ color: 'var(--mist-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <Video size={28} strokeWidth={1.5} />
                    <span style={{ fontSize: 11 }}>Sem thumbnail</span>
                  </div>
                )}
                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                  <span className="badge" style={{
                    background: 'rgba(245,179,66,0.92)',
                    color: '#1a0e00', fontWeight: 600, backdropFilter: 'blur(4px)',
                    letterSpacing: '0.04em', fontSize: 10.5
                  }}>REELS</span>
                </div>
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <StatusBadge status={item.status} />
                </div>
              </div>
              <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <button
                    onClick={() => toggleStatus(item)}
                    style={{ background: 'transparent', border: 'none', padding: 0, display: 'flex', marginTop: 1 }}
                    disabled={!canEdit}
                  >
                    {item.status === 'postado' ?
                      <CheckCircle2 size={16} color={COLORS.brandCyan} /> :
                      <Circle size={16} color={COLORS.mistMuted} />
                    }
                  </button>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--mist)' }}>{item.title}</div>
                </div>
                {item.description && (
                  <div style={{ fontSize: 12.5, color: 'var(--mist-dim)', lineHeight: 1.45 }}>{item.description}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.driveLink && getDriveDownloadUrl(item.driveLink) && (
                      <a
                        href={getDriveDownloadUrl(item.driveLink)}
                        target="_blank" rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ padding: '4px 9px', fontSize: 11.5, textDecoration: 'none' }}
                        title="Baixar vídeo diretamente do Google Drive"
                      >
                        <Download size={11} /> Baixar
                      </a>
                    )}
                    {item.driveLink && (
                      <a href={item.driveLink} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '4px 9px', fontSize: 11.5, textDecoration: 'none' }}>
                        <LinkIcon size={11} /> Abrir
                      </a>
                    )}
                    {item.scheduledDate && (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--mist-muted)' }}>
                        {parseLocalDate(item.scheduledDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button className="btn-icon" onClick={() => { setEditing(item); setModalOpen(true); }}><Pencil size={13} /></button>
                      <button className="btn-icon btn-danger" onClick={() => handleDelete(item.id)}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <VideoModal
          item={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
          existingThumb={editing?.thumbKey ? thumbCache[editing.thumbKey] : null}
          showToast={showToast}
        />
      )}
      {driveOpen && (
        <DriveImportModal
          allEntities={allEntities || []}
          onClose={() => setDriveOpen(false)}
          onDone={() => { setDriveOpen(false); setReloadKey(k => k + 1); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function VideoModal({ item, onClose, onSave, existingThumb, showToast }) {
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [status, setStatus] = useState(item?.status || 'para-postar');
  const [driveLink, setDriveLink] = useState(item?.driveLink || '');
  const [scheduledDate, setScheduledDate] = useState(item?.scheduledDate?.slice(0, 10) || '');
  const [thumbPreview, setThumbPreview] = useState(existingThumb || null);
  const [thumbBase64, setThumbBase64] = useState(null);
  const thumbRef = useRef(null);

  async function handleThumb(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      showToast('error', 'Thumbnail muito grande (máx 1.5MB)');
      return;
    }
    const b64 = await fileToBase64(file);
    setThumbPreview(b64);
    setThumbBase64(b64);
  }

  function submit() {
    if (!title.trim()) { showToast('error', 'Título é obrigatório'); return; }
    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      driveLink: driveLink.trim(),
      scheduledDate: scheduledDate || null,
      thumbKey: item?.thumbKey,
    }, thumbBase64);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{item ? 'Editar vídeo' : 'Novo vídeo'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Título</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Descrição (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="label">Status</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ id: 'para-postar', label: 'Para postar' }, { id: 'postado', label: 'Postado' }].map(s => (
                  <button
                    key={s.id} onClick={() => setStatus(s.id)}
                    className="btn"
                    style={{
                      flex: 1, justifyContent: 'center',
                      background: status === s.id ? 'var(--brand-soft)' : 'transparent',
                      color: status === s.id ? 'var(--brand-cyan)' : 'var(--mist-dim)',
                      borderColor: status === s.id ? 'rgba(1,102,252,0.22)' : 'var(--ink-border)',
                    }}
                  >{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Data agendada</label>
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Link do vídeo</label>
            <div style={{ background: 'rgba(1,102,252,0.06)', border: '1px solid rgba(1,102,252,0.18)', borderRadius: 9, padding: '10px 13px', marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ marginTop: 1, flexShrink: 0 }}><LinkIcon size={13} color={COLORS.brandCyan} /></div>
              <div style={{ fontSize: 12.5, color: COLORS.mistDim, lineHeight: 1.55 }}>
                Faça upload do vídeo 4K no <strong style={{ color: COLORS.mist }}>Google Drive</strong> (ou YouTube, Dropbox), clique com o botão direito → <strong style={{ color: COLORS.mist }}>Compartilhar → Copiar link</strong>, e cole abaixo.
              </div>
            </div>
            <input value={driveLink} onChange={e => setDriveLink(e.target.value)} placeholder="https://drive.google.com/file/d/..." />
          </div>
          <div>
            <label className="label">Thumbnail (opcional, máx 1.5MB)</label>
            <input type="file" accept="image/*" ref={thumbRef} onChange={handleThumb} style={{ display: 'none' }} />
            {thumbPreview ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--ink-border-soft)' }}>
                <img src={thumbPreview} alt="" style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }} />
                <button
                  onClick={() => { setThumbPreview(null); setThumbBase64(null); }}
                  className="btn"
                  style={{ position: 'absolute', top: 8, right: 8, padding: '5px 9px' }}
                ><Trash2 size={12} /></button>
              </div>
            ) : (
              <button className="btn" onClick={() => thumbRef.current?.click()} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
                <ImageIcon size={15} /> Anexar imagem
              </button>
            )}
          </div>
        </div>
        <div style={{ padding: 16, borderTop: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>{item ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CRONOGRAMA TAB (monthly calendar)
============================================================ */
function CronogramaTab({ entity, role, showToast }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [estaticos, setEstaticos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const today = new Date();
  const baseDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const rules = getScheduleRules(entity.type);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [estaticosData, videosData] = await Promise.all([
        storage.getJSON(K.estaticos(entity.id), []),
        storage.getJSON(K.videos(entity.id), []),
      ]);
      setEstaticos(estaticosData);
      setVideos(videosData);
      setLoading(false);
    })();
  }, [entity.id]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, muted: true, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, muted: false, date: new Date(year, month, d) });
    }
    while (cells.length % 7 !== 0) {
      const d = cells.length - daysInMonth - startWeekday + 1;
      cells.push({ day: d, muted: true, date: new Date(year, month + 1, d) });
    }
    return cells;
  }, [year, month]);

  function estaticosForDate(date) {
    const iso = date.toISOString().slice(0, 10);
    return estaticos.filter(v => v.scheduledDate?.slice(0, 10) === iso);
  }
  function videosForDate(date) {
    const iso = date.toISOString().slice(0, 10);
    return videos.filter(v => v.scheduledDate?.slice(0, 10) === iso);
  }

  function isToday(d) {
    return d.toDateString() === today.toDateString();
  }

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {MONTHS_PT[month]} <span style={{ color: 'var(--mist-muted)', fontWeight: 400 }}>{year}</span>
          </h2>
          <div style={{ display: 'flex', gap: 2 }}>
            <button className="btn-icon" onClick={() => setMonthOffset(o => o - 1)}><ChevronLeft size={16} /></button>
            <button className="btn btn-ghost" onClick={() => setMonthOffset(0)} style={{ padding: '5px 10px', fontSize: 12 }}>Hoje</button>
            <button className="btn-icon" onClick={() => setMonthOffset(o => o + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--mist-dim)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(110,231,208,0.25)' }}></span> Estático
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(244,184,96,0.25)' }}></span> Reels
          </span>
        </div>
      </div>

      <div className="cal-grid" style={{ marginBottom: 6 }}>
        {DAYS_SHORT_PT.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--mist-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 0' }}>{d}</div>
        ))}
      </div>
      <div className="cal-grid">
        {calendarDays.map((c, i) => {
          const wd = c.date.getDay();
          const hasEstatico = rules.estatico.includes(wd);
          const hasReels = rules.reels.includes(wd);
          const hasSlots = hasEstatico || hasReels;
          const dayEstaticos = estaticosForDate(c.date);
          const dayVideos = videosForDate(c.date);
          const postedEstatico = dayEstaticos.find(v => v.status === 'postado');
          const postedReels = dayVideos.find(v => v.status === 'postado');
          const scheduledEstatico = dayEstaticos.find(v => v.status !== 'postado');
          const scheduledReels = dayVideos.find(v => v.status !== 'postado');

          return (
            <div
              key={i}
              className={`cal-cell ${c.muted ? 'muted' : ''} ${isToday(c.date) ? 'today' : ''} ${!hasSlots && !c.muted ? 'no-slot' : ''}`}
              onClick={() => hasSlots && setSelectedDay(c.date)}
            >
              <div className="cal-day-num">{c.day}</div>
              {hasEstatico && (
                <div className={`cal-slot estatico ${postedEstatico ? 'done' : ''}`}>
                  {postedEstatico ? <CheckCircle2 size={9} /> : scheduledEstatico ? <Clock size={9} /> : <Circle size={9} />}
                  Estático
                </div>
              )}
              {hasReels && (
                <div className={`cal-slot reels ${postedReels ? 'done' : ''}`}>
                  {postedReels ? <CheckCircle2 size={9} /> : scheduledReels ? <Clock size={9} /> : <Circle size={9} />}
                  Reels
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: 14, background: 'var(--ink-base)', borderRadius: 10, border: '1px solid var(--ink-border-soft)', fontSize: 12.5, color: 'var(--mist-dim)' }}>
        <strong style={{ color: 'var(--mist)' }}>Regras de postagem · {entity.type === 'company' ? 'Empresas' : 'Diretoria'}:</strong>
        {' '}Estáticos {entity.type === 'company' ? 'seg, ter, qui, sex' : 'seg a sáb'} · Reels {entity.type === 'company' ? 'qua, sáb' : 'seg, qua, sáb'}.
        Os itens das abas "Estáticos" e "Vídeos Editados" aparecem aqui automaticamente quando você define uma data agendada.
      </div>

      {selectedDay && (
        <DayDetailModal
          date={selectedDay}
          estaticos={estaticosForDate(selectedDay)}
          videos={videosForDate(selectedDay)}
          entity={entity}
          rules={rules}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}

function DayDetailModal({ date, estaticos, videos, entity, rules, onClose }) {
  const wd = date.getDay();
  const slots = [];
  if (rules.estatico.includes(wd)) slots.push('estatico');
  if (rules.reels.includes(wd)) slots.push('reels');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div style={{ fontSize: 12, color: 'var(--mist-dim)', marginTop: 2 }}>{entity.name}</div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {slots.map(slot => {
            const slotItems = slot === 'estatico' ? estaticos : videos;
            const slotLabel = slot === 'reels' ? 'REELS' : 'ESTÁTICO';
            const slotColor = slot === 'reels' ? COLORS.warn : COLORS.brandCyan;
            const slotBg = slot === 'reels' ? 'rgba(245,179,66,0.15)' : 'rgba(110,231,208,0.15)';
            const linkField = slot === 'estatico' ? 'designLink' : 'driveLink';
            return (
              <div key={slot}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="badge" style={{ background: slotBg, color: slotColor }}>{slotLabel}</span>
                </div>
                {slotItems.length === 0 ? (
                  <div style={{ padding: 14, background: 'var(--ink-soft)', borderRadius: 8, border: '1px dashed var(--ink-border)', fontSize: 13, color: 'var(--mist-muted)' }}>
                    Nada agendado neste slot. Adicione na aba "{slot === 'estatico' ? 'Estáticos' : 'Vídeos Editados'}" com a data deste dia.
                  </div>
                ) : slotItems.map(v => (
                  <div key={v.id} className="item-card" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{v.title}</div>
                        <div style={{ marginTop: 4 }}><StatusBadge status={v.status} /></div>
                      </div>
                      {v[linkField] && (
                        <a href={v[linkField]} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '4px 9px', fontSize: 12, textDecoration: 'none' }}>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {slots.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--mist-muted)' }}>Sem slot de postagem neste dia para {entity.name}.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   EVENTOS TAB (UOP only)
============================================================ */
function EventosTab({ entityId, role, showToast }) {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const canEdit = role.canAll;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await storage.getJSON(K.events(entityId), []);
      setItems(data);
      setLoading(false);
    })();
  }, [entityId]);

  async function saveItems(newItems) {
    setItems(newItems);
    await storage.set(K.events(entityId), newItems);
  }

  async function handleSave(data) {
    if (editing) {
      await saveItems(items.map(i => i.id === editing.id ? { ...i, ...data } : i));
      showToast('success', 'Evento atualizado');
    } else {
      await saveItems([{ id: uid(), ...data, createdAt: Date.now() }, ...items]);
      showToast('success', 'Evento adicionado');
    }
    setModalOpen(false);
    setEditing(null);
  }

  async function handleDelete(id) {
    await saveItems(items.filter(i => i.id !== id));
    showToast('success', 'Evento removido');
  }

  const sorted = [...items].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcoming = sorted.filter(e => !e.date || parseLocalDate(e.date) >= todayLocal);
  const past = sorted.filter(e => e.date && parseLocalDate(e.date) < todayLocal).reverse();

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Eventos futuros</h2>
          <div style={{ fontSize: 12.5, color: 'var(--mist-dim)', marginTop: 2 }}>Captação de vídeo, encontros, gravações</div>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={15} /> Novo evento
          </button>
        )}
      </div>

      {loading ? null : items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><CalendarDays size={20} /></div>
          <div style={{ fontSize: 14, color: 'var(--mist-dim)' }}>Nenhum evento cadastrado</div>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--mist-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, fontWeight: 600 }}>Próximos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(item => <EventCard key={item.id} item={item} canEdit={canEdit} onEdit={() => { setEditing(item); setModalOpen(true); }} onDelete={() => handleDelete(item.id)} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--mist-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, fontWeight: 600 }}>Passados</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.7 }}>
                {past.map(item => <EventCard key={item.id} item={item} canEdit={canEdit} onEdit={() => { setEditing(item); setModalOpen(true); }} onDelete={() => handleDelete(item.id)} />)}
              </div>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <EventModal item={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} showToast={showToast} />
      )}
    </div>
  );
}

function EventCard({ item, canEdit, onEdit, onDelete }) {
  return (
    <div className="item-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ display: 'flex', gap: 14, flex: 1 }}>
          {item.date && (
            <div style={{ textAlign: 'center', minWidth: 50 }}>
              <div style={{ fontSize: 11, color: 'var(--mist-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                {parseLocalDate(item.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--brand-cyan)', lineHeight: 1 }}>
                {parseLocalDate(item.date).getDate()}
              </div>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
            {item.description && <div style={{ fontSize: 13, color: 'var(--mist-dim)', marginTop: 4 }}>{item.description}</div>}
            {item.location && <div style={{ fontSize: 12, color: 'var(--mist-muted)', marginTop: 6 }}>📍 {item.location}</div>}
          </div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 2 }}>
            <button className="btn-icon" onClick={onEdit}><Pencil size={13} /></button>
            <button className="btn-icon btn-danger" onClick={onDelete}><Trash2 size={13} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function EventModal({ item, onClose, onSave, showToast }) {
  const [title, setTitle] = useState(item?.title || '');
  const [date, setDate] = useState(item?.date?.slice(0, 10) || '');
  const [description, setDescription] = useState(item?.description || '');
  const [location, setLocation] = useState(item?.location || '');

  function submit() {
    if (!title.trim()) { showToast('error', 'Título é obrigatório'); return; }
    onSave({
      title: title.trim(),
      date: date || null,
      description: description.trim(),
      location: location.trim(),
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{item ? 'Editar evento' : 'Novo evento'}</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Título</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Gravação de podcast com X" autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="label">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Local</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Pauta, participantes, observações..." />
          </div>
        </div>
        <div style={{ padding: 16, borderTop: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>{item ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADD COMPANY MODAL
============================================================ */
function AddCompanyModal({ onClose, onSave, showToast, existingIds }) {
  const [name, setName] = useState('');

  function submit() {
    if (!name.trim()) { showToast('error', 'Nome é obrigatório'); return; }
    const id = slugify(name);
    if (existingIds.includes(id)) { showToast('error', 'Já existe uma empresa com esse nome'); return; }
    onSave({ id, name: name.trim(), type: 'company' });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Adicionar empresa</h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <label className="label">Nome da empresa</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Vortex" autoFocus onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <div style={{ padding: 16, borderTop: '1px solid var(--ink-border-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>Adicionar</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN APP
============================================================ */
export default function App() {
  useFontInjection();

  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [section, setSection] = useState('diretoria');
  const [entities, setEntities] = useState({
    directors: INITIAL_DIRECTORS,
    group: INITIAL_GROUP,
    companies: INITIAL_COMPANIES,
  });
  const [currentId, setCurrentId] = useState('walter');
  const [activeTab, setActiveTab] = useState('roteiros');
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2400);
  }

  // Check existing Supabase session on mount
  useEffect(() => {
    (async () => {
      const sc = window.supabaseClient;
      if (!sc) { setAuthChecked(true); return; }
      const { data: { session } } = await sc.auth.getSession();
      if (session) {
        const { data: profile } = await sc.from('profiles').select('name, role').eq('id', session.user.id).maybeSingle();
        const userRole = ROLES.find(r => r.id === profile?.role) || ROLES[0];
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: profile?.name || session.user.email.split('@')[0],
          role: userRole,
        });
      }
      setAuthChecked(true);
    })();
  }, []);

  async function handleLogout() {
    const sc = window.supabaseClient;
    if (sc) await sc.auth.signOut();
    setUser(null);
    setHydrated(false);
  }

  // Load entities on mount
  useEffect(() => {
    (async () => {
      const saved = await storage.getJSON(K.entities, null);
      if (saved) setEntities(saved);
      else await storage.set(K.entities, { directors: INITIAL_DIRECTORS, group: INITIAL_GROUP, companies: INITIAL_COMPANIES });

      // Seed sample estáticos for the 4 directors with content (Walter, Rogério, Rudi, Reinaldo)
      // Only runs once — guarded by a flag in storage.
      const seedDone = await storage.get('app:seed:estaticos:v1');
      if (!seedDone) {
        for (const dirId of Object.keys(SEED_POSTS)) {
          const posts = SEED_POSTS[dirId];
          const items = [];
          for (const p of posts) {
            const imageKey = uid();
            await storage.set(K.image(imageKey), SEED_IMAGES[p.img]);
            items.push({
              id: uid(),
              title: p.title,
              description: p.caption,
              status: p.status,
              designLink: '',
              scheduledDate: null,
              imageKey,
              createdAt: Date.now() - Math.random() * 86400000 * 7,
            });
          }
          await storage.set(K.estaticos(dirId), items);
        }
        await storage.set('app:seed:estaticos:v1', 'true');
      }

      setHydrated(true);
    })();
  }, []);

  // When switching section, set sensible default entity
  useEffect(() => {
    if (!hydrated) return;
    if (section === 'diretoria') {
      const exists = [...entities.directors.map(d => d.id), entities.group.id].includes(currentId);
      if (!exists) setCurrentId(entities.directors[0]?.id || entities.group.id);
    } else {
      const exists = entities.companies.map(c => c.id).includes(currentId);
      if (!exists) setCurrentId(entities.companies[0]?.id);
    }
  }, [section, hydrated]);

  // Find current entity
  const currentEntity = useMemo(() => {
    if (section === 'diretoria') {
      if (currentId === entities.group.id) return entities.group;
      return entities.directors.find(d => d.id === currentId);
    }
    return entities.companies.find(c => c.id === currentId);
  }, [section, currentId, entities]);

  // Tabs depend on entity type
  const tabs = useMemo(() => {
    if (!currentEntity) return [];
    if (currentEntity.type === 'group') {
      return [
        { id: 'cronograma', label: 'Cronograma', icon: Calendar },
        { id: 'estaticos', label: 'Estáticos', icon: ImageIcon },
        { id: 'videos', label: 'Vídeos Editados', icon: Video },
        { id: 'eventos', label: 'Eventos futuros', icon: CalendarDays },
      ];
    }
    return [
      { id: 'roteiros', label: 'Roteiros', icon: FileText },
      { id: 'estaticos', label: 'Estáticos', icon: ImageIcon },
      { id: 'videos', label: 'Vídeos Editados', icon: Video },
      { id: 'cronograma', label: 'Cronograma', icon: Calendar },
    ];
  }, [currentEntity]);

  // Reset activeTab if not present in new tabs list
  useEffect(() => {
    if (tabs.length && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  async function handleAddCompany(company) {
    const next = { ...entities, companies: [...entities.companies, company] };
    setEntities(next);
    await storage.set(K.entities, next);
    setAddCompanyOpen(false);
    setCurrentId(company.id);
    showToast('success', `${company.name} adicionada`);
  }

  async function handleRemoveCompany(id) {
    if (!confirm('Remover esta empresa? Os roteiros e vídeos dela também serão removidos.')) return;
    const next = { ...entities, companies: entities.companies.filter(c => c.id !== id) };
    setEntities(next);
    await storage.set(K.entities, next);
    await storage.delete(K.roteiros(id));
    await storage.delete(K.estaticos(id));
    await storage.delete(K.videos(id));
    if (currentId === id) setCurrentId(next.companies[0]?.id || null);
    showToast('success', 'Empresa removida');
  }

  if (!authChecked) {
    return <div style={{ minHeight: '100vh', background: COLORS.inkDeep }} />;
  }

  if (!user) {
    return <LoginScreen onLogin={u => setUser(u)} />;
  }

  if (!hydrated) {
    return (
      <div className="app-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <GlobalStyles />
        <div style={{ color: COLORS.mistDim, fontSize: 13 }}>Carregando...</div>
      </div>
    );
  }

  const role = user.role;

  return (
    <div className="app-root">
      <GlobalStyles />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header section={section} setSection={setSection} user={user} onLogout={handleLogout} onMenuToggle={() => setSidebarOpen(o => !o)} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <Sidebar
            section={section}
            setSection={setSection}
            entities={entities}
            currentId={currentId}
            setCurrentId={setCurrentId}
            onAddCompany={() => setAddCompanyOpen(true)}
            onRemoveCompany={handleRemoveCompany}
            role={role}
            mobileOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <main style={{ flex: 1, overflowY: 'auto', background: 'var(--ink-deep)' }}>
            {currentEntity ? (
              <div key={currentEntity.id} className="fade-in">
                <EntityHeader entity={currentEntity} activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
                {activeTab === 'roteiros' && <RoteirosTab entityId={currentEntity.id} role={role} showToast={showToast} />}
                {activeTab === 'estaticos' && <EstaticosTab entityId={currentEntity.id} role={role} showToast={showToast} />}
                {activeTab === 'videos' && <VideosTab entityId={currentEntity.id} role={role} showToast={showToast} allEntities={[...entities.directors, entities.group, ...entities.companies]} />}
                {activeTab === 'cronograma' && <CronogramaTab entity={currentEntity} role={role} showToast={showToast} />}
                {activeTab === 'eventos' && <EventosTab entityId={currentEntity.id} role={role} showToast={showToast} />}
              </div>
            ) : (
              <div className="empty" style={{ paddingTop: 100 }}>
                <div className="empty-icon"><Building2 size={20} /></div>
                <div>Selecione uma {section === 'empresas' ? 'empresa' : 'pessoa'} na lateral</div>
              </div>
            )}
          </main>
        </div>
      </div>
      {addCompanyOpen && (
        <AddCompanyModal
          onClose={() => setAddCompanyOpen(false)}
          onSave={handleAddCompany}
          showToast={showToast}
          existingIds={entities.companies.map(c => c.id)}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}
