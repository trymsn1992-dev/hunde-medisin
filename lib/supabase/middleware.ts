import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Create an anonymous supabase client with cookie handling
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // This updates the request/response cycle with new cookies if refreshed
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data: { user } } = await supabase.auth.getUser()

    // Protect Dashboard Routes if needed (Optional, but good practice here)
    if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/dog')) {
        if (!user) {
            const loginUrl = request.nextUrl.clone()
            loginUrl.pathname = '/login'
            loginUrl.searchParams.set('next', request.nextUrl.pathname)
            return NextResponse.redirect(loginUrl)
        }
    }

    // Auth pages (login/signup) - redirect if already logged in
    if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') {
        if (user) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    return response
}
