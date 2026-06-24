interface Env {
	ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const CAL_ID = 'c_72f50fd5e92e08a4126617d184bde2b1b05f0dabfe4c40ec4127610ab69ca008%40group.calendar.google.com';
const ICS_URL = `https://calendar.google.com/calendar/ical/${CAL_ID}/public/basic.ics`;

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (pathname === '/api/calendar') {
			try {
				const icsRes = await fetch(ICS_URL);
				const text = await icsRes.text();
				return new Response(text, {
					headers: {
						'Content-Type': 'text/calendar; charset=utf-8',
						'Access-Control-Allow-Origin': '*',
						'Cache-Control': 'public, max-age=300',
					},
				});
			} catch {
				return new Response('', { status: 502 });
			}
		}

		return env.ASSETS.fetch(request);
	},
};
