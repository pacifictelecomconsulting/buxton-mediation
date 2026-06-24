interface Env {
	ASSETS: { fetch: (request: Request) => Promise<Response> };
	GOOGLE_CALENDAR_API_KEY: string;
}

interface GCalEvent {
	summary?: string;
	start?: { date?: string; dateTime?: string };
	end?: { date?: string; dateTime?: string };
}

interface GCalResponse {
	items?: GCalEvent[];
}

const CAL_ID = 'c_72f50fd5e92e08a4126617d184bde2b1b05f0dabfe4c40ec4127610ab69ca008%40group.calendar.google.com';

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

function dateKey(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (pathname === '/api/calendar') {
			try {
				const now = new Date();
				// Fetch 1 month back through 6 months forward
				const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
				const timeMax = new Date(now.getFullYear(), now.getMonth() + 7, 1).toISOString();

				const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${CAL_ID}/events`);
				url.searchParams.set('key', env.GOOGLE_CALENDAR_API_KEY);
				url.searchParams.set('singleEvents', 'true');
				url.searchParams.set('orderBy', 'startTime');
				url.searchParams.set('timeMin', timeMin);
				url.searchParams.set('timeMax', timeMax);

				const apiRes = await fetch(url.toString());
				const data = await apiRes.json() as GCalResponse;

				const events: { date: string; type: 'booked' | 'on-hold' }[] = [];

				for (const item of (data.items ?? [])) {
					const summary = (item.summary ?? '').trim().toLowerCase();
					const type = summary.includes('hold') ? 'on-hold' : 'booked';

					// Use date for all-day events, or slice dateTime to get the date portion
					const startStr = (item.start?.date ?? item.start?.dateTime ?? '').slice(0, 10);
					const endStr   = (item.end?.date   ?? item.end?.dateTime   ?? '').slice(0, 10);
					if (!startStr) continue;

					// Parse as local noon to avoid any timezone-edge date shifts
					const start = new Date(startStr + 'T12:00:00');
					let end = endStr ? new Date(endStr + 'T12:00:00') : new Date(start.getTime() + 86400000);
					if (end <= start) end = new Date(start.getTime() + 86400000);

					for (let cur = new Date(start); cur < end; cur = new Date(cur.getTime() + 86400000)) {
						const dow = cur.getDay();
						if (dow >= 1 && dow <= 5) {
							events.push({ date: dateKey(cur), type });
						}
					}
				}

				return new Response(JSON.stringify({ events }), {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Cache-Control': 'public, max-age=300',
					},
				});
			} catch (err) {
				return new Response(JSON.stringify({ events: [] }), {
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				});
			}
		}

		return env.ASSETS.fetch(request);
	},
};
