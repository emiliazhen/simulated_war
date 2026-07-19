let DOMAIN_BASE: string;
let DOMAIN_GPT: string;
let DOMAIN_WS: string;
let DOMAIN_WS_OTHER: string;
let DOMAIN_THREE: string;

const environment = import.meta.env.MODE || 'production';

if (environment === 'production' || environment === 'staging') {
	DOMAIN_BASE = (window as any).DOMAIN_BASE;
	DOMAIN_GPT = (window as any).DOMAIN_GPT;
	DOMAIN_WS = (window as any).DOMAIN_WS;
	DOMAIN_WS_OTHER = (window as any).DOMAIN_WS_OTHER;
	DOMAIN_THREE = (window as any).DOMAIN_THREE;
} else {
	DOMAIN_BASE = import.meta.env.VITE_API_URL;
	DOMAIN_GPT = import.meta.env.VITE_GPT_URL;
	DOMAIN_WS = import.meta.env.VITE_WS_URL;
	DOMAIN_WS_OTHER = import.meta.env.VITE_WS_URL_TODO;
	DOMAIN_THREE = import.meta.env.VITE_THREE_URL;
}

export { DOMAIN_BASE, DOMAIN_GPT, DOMAIN_WS, DOMAIN_WS_OTHER, DOMAIN_THREE };
