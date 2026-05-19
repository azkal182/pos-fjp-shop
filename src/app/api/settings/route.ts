import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { ValidationError } from "@/lib/exceptions"
import { getAllSettings, updateSettings } from "@/features/settings/services/settings.service"

export const GET = withHandler(async () => {
  const settings = await getAllSettings()
  return successResponse(settings)
})

export const PUT = withHandler(async (req: NextRequest) => {
  const body = await req.json()
  if (!Array.isArray(body)) throw new ValidationError("Body harus berupa array { key, value }[]")
  const updates: { key: string; value: string }[] = body
  const result = await updateSettings(updates)
  return successResponse(result)
})
