import { type NextRequest } from "next/server"
import { withHandler } from "@/lib/api-handler"
import { successResponse } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const partyType = sp.get("partyType") ?? undefined
  const partyId = sp.get("partyId") ?? undefined
  const activeOnly = sp.get("activeOnly") !== "false"

  const deposits = await prisma.deposit.findMany({
    where: {
      ...(partyType && { partyType: partyType as any }),
      ...(partyId && { partyId }),
      ...(activeOnly && { balance: { gt: 0 } }),
    },
    include: { usages: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { createdAt: "desc" },
  })
  return successResponse(deposits)
})
