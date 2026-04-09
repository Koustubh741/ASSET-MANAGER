import { NextResponse } from 'next/server';

export function middleware(request) {
    // CRITICAL FIX: Intercept malformed 'Referer;' headers
    // -----------------------------------------------------------------
    // Node.js HTTP parsers and older Next.js middlewares will pass through
    // malformed headers like `Referer;` (missing colon mapping). We shield 
    // the internal process from 'TypeError: Invalid URL' crash vectors by 
    // wrapping extraction logic and dropping or sanitizing invalid input.

    try {
        const rawReferer = request.headers.get('referer');
        
        // If blank, undefined, or explicitly invalid string via curl -H "Referer;"
        if (rawReferer) {
            // Attempt strict parsing. If it's malformed (e.g. empty semi-colon payload),
            // this throws synchronously and we catch it below.
            new URL(rawReferer);
            
            // Further sanitization or tracking can occur here safely
        }
    } catch (err) {
        // [SHIELD ACTIVATED] 
        // We caught the malformed header before Next.js routing internals crash the process.
        // We log it and strip the toxic header entirely, returning a clean request
        // or rejecting it safely.
        console.warn(`[MIDDLEWARE SHIELD] Blocked malformed Referer trace on path: ${request.nextUrl.pathname}`);
        return new NextResponse(
            JSON.stringify({ error: 'Malformed Origin/Referer Policy Rejected' }),
            { status: 400, headers: { 'content-type': 'application/json' } }
        );
    }

    // Proceed if nominal
    return NextResponse.next();
}

export const config = {
    // Execute shield universally on all routes except static assets
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes) -> actually we want API routes shielded too!
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
