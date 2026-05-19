import { NextRequest, NextResponse } from "next/server"
import { log } from "./logger"
import { handleApiError } from "./api-response"
import { UnauthorizedError } from "./exceptions"
import { auth } from "./auth"

type RouteContext = {
  params?: Promise<Record<string, string>>
}

type RouteHandler = (
  req: NextRequest,
  ctx: RouteContext
) => Promise<NextResponse> | NextResponse

interface WithHandlerOptions {
  requireAuth?: boolean
}

export function withHandler(
  handler: RouteHandler,
  options: WithHandlerOptions = { requireAuth: true }
) {
  return async (req: NextRequest, ctx: RouteContext): Promise<NextResponse> => {
    const start = Date.now()

    try {
      if (options.requireAuth !== false) {
        const session = await auth.api.getSession({ headers: req.headers })
        if (!session) {
          throw new UnauthorizedError()
        }
      }

      const res = await handler(req, ctx)

      log.info("[API]", `${req.method} ${req.nextUrl.pathname}`, {
        status: res.status,
        duration: Date.now() - start,
      })

      return res
    } catch (error) {
      log.error(
        "[API]",
        `Route error: ${req.method} ${req.nextUrl.pathname}`,
        error,
        { duration: Date.now() - start }
      )
      return handleApiError(error)
    }
  }
}
