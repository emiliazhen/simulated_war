let DOMAIN_BASE: string;

const environment = import.meta.env.MODE || 'production';

if (environment === 'production' || environment === 'staging') {
  DOMAIN_BASE = (window as any).DOMAIN_BASE;
} else {
  DOMAIN_BASE = import.meta.env.VITE_API_URL;
}

export { DOMAIN_BASE };
