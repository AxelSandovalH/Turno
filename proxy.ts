import { NextResponse, type NextRequest } from 'next/server'

// Auth is handled by individual dashboard layouts.
// Proxy only passes requests through.
export function proxy(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
